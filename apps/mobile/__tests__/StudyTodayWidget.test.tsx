/**
 * The dashboard's study card on a phone, mirror of the web's `studyToday`: it reads today on its
 * own, shows the blocks closed against the day's total, the block to start with "Start focus" on
 * its concept, the next two, and the quiet states (no cycle, a rest day).
 * Boundary mocked = @beyou/api HttpClient + expo-router + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

import { Provider } from 'react-redux';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { setLogger } from '@beyou/api';
import type { StudyToday } from '@beyou/types/notebook/studyCycle';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import StudyTodayWidget from '../src/ui/widgets/StudyTodayWidget';
import { fakeServer, today } from './fixtures/studyCycle';

function serve(day: StudyToday | null) {
  fakeServer(day ? { 'GET /notebook/cycles/today': day } : {});
}

async function renderWidget() {
  const store = makeStore();
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <StudyTodayWidget />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  return store;
}

const press = async (testID: string) => {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  setLogger({ error: () => {} });
  serve(today());
});

describe('StudyTodayWidget', () => {
  it("reads today and shows the day's blocks, the one to start and the next two", async () => {
    await renderWidget();

    await waitFor(() => expect(screen.getByTestId('study-widget-title')).toHaveTextContent('1 of 4 blocks'));
    expect(screen.getByText('1h studied today')).toBeTruthy();
    const current = screen.getByTestId('study-widget-current');
    expect(within(current).getByText('19:00 · Understand Controle de constitucionalidade')).toBeTruthy();
    expect(within(current).getByText('2 of 5')).toBeTruthy();
    const ahead = screen.getAllByTestId('study-widget-ahead');
    expect(ahead).toHaveLength(2);
    expect(ahead[0]).toHaveTextContent(/19:40.*Understand Crase/);
    expect(ahead[1]).toHaveTextContent(/20:50.*Dir. Administrativo.*1h10/);
  });

  it('"Start focus" runs the pomodoro on the concept\'s page', async () => {
    const store = await renderWidget();
    await waitFor(() => expect(screen.getByTestId('study-widget-focus')).toBeTruthy());

    await press('study-widget-focus');

    expect(store.getState().focus.timer).toMatchObject({ kind: 'pomodoro', notebookPageId: 'p-cc' });
  });

  it('with every block done, says the day is done', async () => {
    const day = today();
    serve({ ...day, cycles: day.cycles.map((cycle) => ({ ...cycle, entries: cycle.entries.filter((entry) => entry.doneToday) })) });
    await renderWidget();

    await waitFor(() => expect(screen.getByTestId('study-widget-done')).toBeTruthy());
    expect(screen.queryByTestId('study-widget-focus')).toBeNull();
  });

  it('with no cycle yet, invites building one', async () => {
    serve(today({ cycles: [], restingCycles: [] }));
    await renderWidget();

    await waitFor(() => expect(screen.getByTestId('study-widget-empty')).toBeTruthy());
    await press('study-widget-create');
    expect(mockPush).toHaveBeenCalledWith('/notebook-cycle-edit');
  });

  it('on a rest day, says which cycles rest', async () => {
    serve(today({ cycles: [], restingCycles: [{ cycleId: 'trt', name: 'Concurso TRT' }] }));
    await renderWidget();

    await waitFor(() => expect(screen.getByTestId('study-widget-resting')).toHaveTextContent('Concurso TRT rests today.'));
  });

  it('a failed read says so instead of an empty card, and the link still opens the notebook', async () => {
    serve(null);
    await renderWidget();

    await waitFor(() => expect(screen.getByTestId('study-widget-loading')).toHaveTextContent("Couldn't load today's study."));
    await press('study-widget-open');
    expect(mockPush).toHaveBeenCalledWith('/notebook');
  });
});
