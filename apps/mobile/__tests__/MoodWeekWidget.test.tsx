/**
 * The dashboard's mood card on a phone. Ported from the web widget's tests: it never loads the
 * journal it sits next to, so it may only write through the level-only call, and it shows the
 * faces until today is recorded and the week strip after.
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
import { getMoodEntries, saveMoodEntry, setMoodLevel } from '@beyou/api/mood/moodApi';
import { addDays, todayInZone } from '@beyou/state';
import type { MoodEntry, MoodLevel } from '@beyou/types/mood/mood';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import MoodWeekWidget from '../src/ui/widgets/MoodWeekWidget';

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

async function renderWidget() {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <MoodWeekWidget />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setLogger({ error: () => {} });
  mockedGet.mockResolvedValue({ success: [] });
});

describe('MoodWeekWidget', () => {
  it("asks for the week ending today, in the user's zone", async () => {
    await renderWidget();

    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith({ from: addDays(TODAY, -6), to: TODAY }, expect.anything()),
    );
  });

  it('offers the five faces when today has no entry', async () => {
    await renderWidget();

    await waitFor(() => expect(screen.getByTestId('mood-week-faces')).toBeTruthy());
    for (const level of [1, 2, 3, 4, 5]) expect(screen.getByTestId(`mood-face-${level}`)).toBeTruthy();
  });

  it('shows the week strip once today is recorded', async () => {
    mockedGet.mockResolvedValue({ success: [entry(TODAY, 4)] });
    await renderWidget();

    await waitFor(() => expect(screen.getByTestId('mood-week-today')).toBeTruthy());
    expect(screen.queryByTestId('mood-week-faces')).toBeNull();
  });

  /**
   * The rule the two-verb split exists for. This card never loads the journal, so it must not be
   * able to write one, and a PUT with no note clears it.
   */
  it('records a mood through the level-only call, never the one that replaces the note', async () => {
    mockedPatch.mockResolvedValue({ success: entry(TODAY, 5, 'kept') });
    await renderWidget();
    await waitFor(() => expect(screen.getByTestId('mood-face-5')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('mood-face-5'));
    });

    await waitFor(() => expect(mockedPatch).toHaveBeenCalledWith(TODAY, 5, expect.anything()));
    expect(saveMoodEntry).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('mood-week-strip')).toBeTruthy());
  });

  it("tapping today's dot brings the faces back so a mood can be corrected", async () => {
    mockedGet.mockResolvedValue({ success: [entry(TODAY, 2)] });
    await renderWidget();
    await waitFor(() => expect(screen.getByTestId('mood-week-today')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('mood-week-today'));
    });

    expect(screen.getByTestId('mood-week-faces')).toBeTruthy();
  });
});
