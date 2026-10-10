/**
 * The diary on a phone. Ported from the web page's tests, because the rules are the same and the
 * mobile screen had none: a face is a PATCH that cannot touch the note, Save is the PUT that
 * replaces it, and the journal box always shows the day that is selected.
 * Boundary mocked = the mood api module + expo-router + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('@beyou/api/mood/moodApi', () => ({
  getMoodEntries: jest.fn(),
  setMoodLevel: jest.fn(),
  saveMoodEntry: jest.fn(),
  deleteMoodEntry: jest.fn(),
}));

import { Provider } from 'react-redux';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { setLogger } from '@beyou/api';
import { deleteMoodEntry, getMoodEntries, saveMoodEntry, setMoodLevel } from '@beyou/api/mood/moodApi';
import { addDays, todayInZone } from '@beyou/state';
import type { MoodEntry, MoodLevel } from '@beyou/types/mood/mood';
import '../src/i18n';
import { notify } from '../src/notify';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import MoodScreen from '../app/(app)/mood';

// The store's profile starts in UTC, which is the zone the screen reads "today" in.
const TODAY = todayInZone('UTC');

const entry = (date: string, mood: MoodLevel, note: string | null = null): MoodEntry => ({
  id: `id-${date}`,
  date,
  mood,
  note,
  updatedAt: `${date}T12:00:00Z`,
});

const mockedGet = getMoodEntries as jest.Mock;
const mockedPatch = setMoodLevel as jest.Mock;
const mockedPut = saveMoodEntry as jest.Mock;
const mockedDelete = deleteMoodEntry as jest.Mock;

const noteValue = () => screen.getByTestId('mood-note').props.value;
const isChosen = (level: MoodLevel) =>
  screen.getByTestId(`mood-scale-${level}`).props.accessibilityState?.selected === true;

async function renderScreen() {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <MoodScreen />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
}

async function press(testID: string) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setLogger({ error: () => {} });
  mockedGet.mockResolvedValue({ success: [] });
});

describe('MoodScreen', () => {
  /** A tap on a face must never send the request that could replace the note. */
  it('picking a face sends the level-only call', async () => {
    mockedPatch.mockResolvedValue({ success: entry(TODAY, 2) });
    await renderScreen();

    await press('mood-scale-2');

    await waitFor(() => expect(mockedPatch).toHaveBeenCalledWith(TODAY, 2, expect.anything()));
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it('Save replaces the note through the call that carries it, keeping the mood', async () => {
    mockedGet.mockResolvedValue({ success: [entry(TODAY, 4)] });
    mockedPut.mockResolvedValue({ success: entry(TODAY, 4, 'A long walk.') });
    await renderScreen();
    await waitFor(() => expect(isChosen(4)).toBe(true));

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('mood-note'), '  A long walk.  ');
    });
    await press('mood-save-note');

    await waitFor(() =>
      expect(mockedPut).toHaveBeenCalledWith(TODAY, { mood: 4, note: 'A long walk.' }, expect.anything()),
    );
    expect(mockedPatch).not.toHaveBeenCalled();
  });

  it('Save on a day with no mood asks for one first and sends nothing', async () => {
    await renderScreen();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('mood-note'), 'No face yet.');
    });
    await press('mood-save-note');

    expect(notify.info).toHaveBeenCalled();
    expect(mockedPut).not.toHaveBeenCalled();
  });

  /**
   * Write on one day, move to another, and the first day's text used to stay in the box. Saving
   * there would have copied it onto the wrong day.
   */
  it('moving to another day clears the journal box, and coming back brings it back', async () => {
    mockedGet.mockResolvedValue({ success: [entry(TODAY, 4, 'Finally finished it.')] });
    await renderScreen();
    await waitFor(() => expect(noteValue()).toBe('Finally finished it.'));

    await press('mood-previous-day');
    await waitFor(() => expect(noteValue()).toBe(''));

    await press('mood-next-day');
    await waitFor(() => expect(noteValue()).toBe('Finally finished it.'));
  });

  /** Typing into a day whose entry has not landed yet must survive the entry landing empty. */
  it('text already typed is not wiped by an entry that arrives carrying no note', async () => {
    let resolve: (value: unknown) => void = () => {};
    mockedGet.mockReturnValue(new Promise((r) => { resolve = r; }));
    await renderScreen();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('mood-note'), 'half a sentence');
    });
    await act(async () => {
      resolve({ success: [entry(TODAY, 3, null)] });
    });

    await waitFor(() => expect(isChosen(3)).toBe(true));
    expect(noteValue()).toBe('half a sentence');
  });

  it('tapping the chosen face leaves a day with no writing unrecorded', async () => {
    mockedGet.mockResolvedValue({ success: [entry(TODAY, 3)] });
    mockedDelete.mockResolvedValue({ success: undefined });
    await renderScreen();
    await waitFor(() => expect(isChosen(3)).toBe(true));

    // The refetch after the delete answers with the day gone.
    mockedGet.mockResolvedValue({ success: [] });
    await press('mood-scale-3');

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(TODAY, expect.anything()));
    await waitFor(() => expect(isChosen(3)).toBe(false));
  });

  /** Removing the entry removes the note with it, so a day with writing asks before it goes. */
  it('un-recording a day that carries writing asks first, then clears the box', async () => {
    mockedGet.mockResolvedValue({ success: [entry(TODAY, 3, 'something I would rather keep')] });
    mockedDelete.mockResolvedValue({ success: undefined });
    await renderScreen();
    await waitFor(() => expect(noteValue()).toBe('something I would rather keep'));
    expect(screen.queryByTestId('mood-delete-modal')).toBeNull();

    await press('mood-scale-3');

    expect(screen.getByTestId('mood-delete-modal')).toBeTruthy();
    expect(mockedDelete).not.toHaveBeenCalled();

    mockedGet.mockResolvedValue({ success: [] });
    await press('mood-delete-modal-confirm');

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(TODAY, expect.anything()));
    await waitFor(() => expect(noteValue()).toBe(''));
  });

  it('cancelling that confirmation keeps the day and its writing', async () => {
    mockedGet.mockResolvedValue({ success: [entry(TODAY, 3, 'kept after all')] });
    await renderScreen();
    await waitFor(() => expect(noteValue()).toBe('kept after all'));

    await press('mood-scale-3');
    await press('mood-delete-modal-cancel');

    expect(screen.queryByTestId('mood-delete-modal')).toBeNull();
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(noteValue()).toBe('kept after all');
  });

  it('tapping a different face changes the day rather than removing it', async () => {
    mockedGet.mockResolvedValue({ success: [entry(TODAY, 3)] });
    mockedPatch.mockResolvedValue({ success: entry(TODAY, 5) });
    await renderScreen();
    await waitFor(() => expect(isChosen(3)).toBe(true));

    await press('mood-scale-5');

    await waitFor(() => expect(mockedPatch).toHaveBeenCalledWith(TODAY, 5, expect.anything()));
    expect(mockedDelete).not.toHaveBeenCalled();
    await waitFor(() => expect(isChosen(5)).toBe(true));
  });

  it('a future day cannot be picked', async () => {
    await renderScreen();

    await press('mood-next-day');

    // Still on today: the scale writes to today's date.
    mockedPatch.mockResolvedValue({ success: entry(TODAY, 1) });
    await press('mood-scale-1');
    await waitFor(() => expect(mockedPatch).toHaveBeenCalledWith(TODAY, 1, expect.anything()));
    expect(mockedPatch).not.toHaveBeenCalledWith(addDays(TODAY, 1), expect.anything(), expect.anything());
  });
});
