/**
 * "Today" on the notebook home: the day's slice of each cycle with its clock times, the block to
 * start now with "Focus 25" on its concept, and the two quiet states (no cycle yet, a rest day).
 * Boundary mocked = @beyou/api HttpClient + expo-router + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => require('react').useEffect(() => callback(), [callback]),
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

import { Provider } from 'react-redux';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { setLogger } from '@beyou/api';
import type { StudyToday } from '@beyou/types/notebook/studyCycle';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { notify } from '../src/notify';
import NotebookHomeScreen from '../app/(app)/notebook/index';
import { fakeServer, notebookHome, today, trt, summaryOf, type Call } from './fixtures/studyCycle';

let calls: Call[] = [];

function serve(day: StudyToday) {
  calls = fakeServer({
    'GET /notebook/home': notebookHome,
    'GET /notebook/drafts': [],
    'GET /notebook/cycles/today': day,
    'GET /notebook/cycles': [summaryOf(trt())],
    'GET /notebook/cycles/trt': trt(),
  });
}

async function renderHome(store = makeStore()) {
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <NotebookHomeScreen />
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

describe('the Today card on the notebook home', () => {
  it('reads today and shows each cycle with its blocks, times and the day so far', async () => {
    await renderHome();

    await waitFor(() => expect(screen.getByTestId('study-today-card')).toBeTruthy());
    expect(calls.some((call) => call.url === '/notebook/cycles/today')).toBe(true);
    expect(screen.getByTestId('study-today-title')).toHaveTextContent('1 of 4 blocks · 1h studied');
    expect(screen.getByText('Concurso TRT · 19:00 · block 3 of 5')).toBeTruthy();

    // Faculdade's block was closed earlier today.
    const done = screen.getByTestId('study-today-done');
    expect(within(done).getByText('Cálculo II')).toBeTruthy();
    expect(within(done).getByText('60/60')).toBeTruthy();

    // The block to study now, with its concept and figure.
    const current = screen.getByTestId('study-today-current');
    expect(within(current).getByText('Understand Controle de constitucionalidade')).toBeTruthy();
    expect(within(current).getByText('Dir. Constitucional · next in the roadmap · 12 cards due')).toBeTruthy();
    expect(within(current).getByText('19:00')).toBeTruthy();
    expect(screen.getByTestId('study-today-current-figure')).toHaveTextContent('2 of 5 subpages done');
    expect(within(current).getByText('30 min put in · estimate 1h10')).toBeTruthy();

    // The rest of the day, one line each.
    const rows = screen.getAllByTestId('study-today-entry');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Understand Crase')).toBeTruthy();
    expect(within(rows[0]).getByText('Português · chosen page · quiz required')).toBeTruthy();
    expect(within(rows[0]).getByText('~1h10')).toBeTruthy();
    expect(within(rows[1]).getByText('Dir. Administrativo')).toBeTruthy();
    expect(within(rows[1]).getByText('Lista de questões FCC')).toBeTruthy();
  });

  it('"Focus 25" starts the one pomodoro on the block\'s concept', async () => {
    const store = await renderHome();
    await waitFor(() => expect(screen.getByTestId('study-today-focus')).toBeTruthy());

    await press('study-today-focus');

    expect(store.getState().focus.timer).toMatchObject({ kind: 'pomodoro', notebookPageId: 'p-cc' });
    expect(notify.info).toHaveBeenCalledWith('Focus started on this page');
  });

  it('"Focus 25" never replaces a cycle that is already running', async () => {
    const store = await renderHome();
    await waitFor(() => expect(screen.getByTestId('study-today-focus')).toBeTruthy());
    await press('study-today-focus');
    const first = store.getState().focus.timer;

    await press('study-today-focus');

    expect(store.getState().focus.timer).toBe(first);
    expect(notify.info).toHaveBeenLastCalledWith('A focus cycle is already running. Finish or stop it first.');
  });

  it('"Open" goes to the concept\'s page, "See cycles" to the cycle screen', async () => {
    await renderHome();
    await waitFor(() => expect(screen.getByTestId('study-today-open')).toBeTruthy());

    await press('study-today-open');
    expect(mockPush).toHaveBeenCalledWith('/notebook/p-cc');

    await press('study-today-cycles');
    expect(mockPush).toHaveBeenCalledWith('/notebook-cycles');

    await press('notebook-cycles');
    expect(mockPush).toHaveBeenLastCalledWith('/notebook-cycles');
  });

  it('with no cycle yet, invites building one instead of the card', async () => {
    serve(today({ cycles: [], restingCycles: [], blocksDone: 0, blocksTotal: 0, studiedMinutes: 0, plannedMinutes: 0 }));
    await renderHome();

    await waitFor(() => expect(screen.getByTestId('study-today-empty')).toBeTruthy());
    expect(screen.queryByTestId('study-today-card')).toBeNull();

    await press('study-today-create');
    expect(mockPush).toHaveBeenCalledWith('/notebook-cycle-edit');
  });

  it('on a day every cycle rests, says so in one line', async () => {
    serve(today({ cycles: [], restingCycles: [{ cycleId: 'trt', name: 'Concurso TRT' }], blocksDone: 0, blocksTotal: 0 }));
    await renderHome();

    await waitFor(() => expect(screen.getByTestId('study-today-resting')).toHaveTextContent('Concurso TRT rests today.'));
    expect(screen.queryByTestId('study-today-current')).toBeNull();
    expect(screen.queryByTestId('study-today-title')).toBeNull();
  });

  it('names the cycles resting today under the ones that study', async () => {
    serve(today({ restingCycles: [{ cycleId: 'a', name: 'Inglês' }, { cycleId: 'b', name: 'Música' }] }));
    await renderHome();

    await waitFor(() => expect(screen.getByTestId('study-today-resting')).toHaveTextContent('Inglês, Música rest today.'));
    expect(screen.getByTestId('study-today-current')).toBeTruthy();
  });

  it('"Log a session" opens the sheet on the current block\'s topic', async () => {
    await renderHome();
    await waitFor(() => expect(screen.getByTestId('study-today-log')).toBeTruthy());

    await press('study-today-log');

    await waitFor(() => expect(screen.getByTestId('log-session-preview')).toBeTruthy());
    expect(screen.getByTestId('log-session-topic')).toHaveProp('accessibilityValue', { text: 'Dir. Constitucional · Concurso TRT' });
  });
});
