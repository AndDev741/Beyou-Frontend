/**
 * A cycle's history on a phone: a week of bars stacked by topic with the day's target, the
 * entries of the day picked, a session logged by hand deleted behind the native confirm, and
 * the week moved back and forth (never past the current one).
 * Boundary mocked = @beyou/api HttpClient + expo-router + notify + Alert.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: 'trt' }),
}));

import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { setLogger } from '@beyou/api';
import { addDaysIso, todayInZone } from '@beyou/state';
import type { StudyHistory } from '@beyou/types/notebook/studyCycle';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { notify } from '../src/notify';
import NotebookCycleHistoryScreen from '../app/notebook-cycle-history';
import { mondayOf } from '../src/notebook/cycles/cycleText';
import { fakeServer, summaryOf, today as todayFixture, trt, TOPICS, type Call } from './fixtures/studyCycle';

let calls: Call[] = [];
let deleted = false;
const TODAY = todayInZone(null);
const MONDAY = mondayOf(TODAY);

/** Seven days from `from`; today has every kind of entry, until the manual one is deleted. */
function history(from: string): StudyHistory {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysIso(from, i);
    const isToday = date === TODAY;
    const manual = isToday && !deleted ? 45 : 0;
    return {
      date,
      plannedMinutes: 180,
      minutes: isToday ? 75 + manual : 0,
      byTopic: isToday ? [{ topicId: 'const', minutes: 75 }, ...(manual ? [{ topicId: 'port', minutes: manual }] : [])] : [],
      entries: isToday
        ? [
            { kind: 'FOCUS' as const, at: `${date}T12:02:00Z`, topic: TOPICS.const, page: { id: 'p-df', title: 'Direitos fundamentais', icon: null }, minutes: 50 },
            { kind: 'FOCUS' as const, at: `${date}T12:57:00Z`, topic: TOPICS.const, page: { id: 'p-df', title: 'Direitos fundamentais', icon: null }, minutes: 25 },
            { kind: 'UNDERSTOOD' as const, at: `${date}T13:22:00Z`, topic: TOPICS.const, page: { id: 'p-df', title: 'Direitos fundamentais', icon: null }, minutes: 75 },
            ...(manual
              ? [{ kind: 'MANUAL' as const, at: `${date}T13:30:00Z`, sessionId: 's1', topic: TOPICS.port, page: null, minutes: 45, note: 'Aula gravada, módulo 3' }]
              : []),
            { kind: 'LAP_CLOSED' as const, at: `${date}T14:00:00Z`, lapNumber: 3 },
          ]
        : [],
    };
  });
  return { cycleId: 'trt', from, to: addDaysIso(from, 6), topics: [TOPICS.const, TOPICS.port], days };
}

beforeEach(() => {
  jest.clearAllMocks();
  deleted = false;
  setLogger({ error: () => {} });
  calls = fakeServer({
    'GET /notebook/cycles': [summaryOf(trt())],
    'GET /notebook/cycles/today': todayFixture(),
    'GET /notebook/cycles/trt/history': (call: Call) => history(call.params.from),
    'DELETE /notebook/sessions/s1': () => {
      deleted = true;
      return undefined;
    },
  });
});

async function renderHistory() {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <NotebookCycleHistoryScreen />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  await waitFor(() => expect(screen.getByTestId('history-bars')).toBeTruthy());
}

const historyCalls = () => calls.filter((call) => call.url === '/notebook/cycles/trt/history');

const press = async (testID: string) => {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
};

describe('NotebookCycleHistoryScreen', () => {
  it('asks for the current week and draws a bar per day with its target', async () => {
    await renderHistory();

    expect(historyCalls()[0].params).toEqual({ from: MONDAY, to: addDaysIso(MONDAY, 6) });
    for (let i = 0; i < 7; i++) {
      const date = addDaysIso(MONDAY, i);
      expect(screen.getByTestId(`history-bar-${date}`)).toBeTruthy();
      expect(screen.getByTestId(`history-target-${date}`)).toBeTruthy();
    }
    expect(screen.getByTestId(`history-bar-${TODAY}`)).toHaveTextContent(/2h \/ 3h/);
    expect(within(screen.getByTestId('history-legend')).getByText('Dir. Constitucional')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('History · Concurso TRT')).toBeTruthy());
    expect(screen.getByTestId('history-title')).toHaveTextContent('1 concept understood · 2h of 21h');
  });

  it("lists today's entries: pomodoros, a session logged by hand, a concept understood, a lap closed", async () => {
    await renderHistory();

    const day = screen.getByTestId('history-day');
    expect(within(day).getAllByTestId('history-entry-focus')).toHaveLength(2);
    expect(within(day).getByTestId('history-entry-manual')).toHaveTextContent(/Português.*Aula gravada, módulo 3.*Manual.*45 min/);
    expect(within(day).getByTestId('history-entry-understood')).toHaveTextContent('Understood: Direitos fundamentais · 1h15 put in');
    expect(within(day).getByTestId('history-entry-lap')).toHaveTextContent(/Lap 3 closed at .* · lap 4 starts/);
  });

  it('a day with nothing in it says so', async () => {
    await renderHistory();
    const other = TODAY === MONDAY ? addDaysIso(MONDAY, 1) : MONDAY;

    await press(`history-bar-${other}`);

    expect(screen.getByTestId('history-day-empty')).toBeTruthy();
  });

  it('deletes a hand-logged session only after the native confirm, then reads the week again', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderHistory();

    await press('history-entry-delete');
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false);
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => {
      buttons.find((button) => button.style === 'destructive')!.onPress!();
    });

    await waitFor(() => expect(calls.some((call) => call.method === 'DELETE' && call.url === '/notebook/sessions/s1')).toBe(true));
    await waitFor(() => expect(screen.queryByTestId('history-entry-manual')).toBeNull());
    expect(historyCalls().length).toBe(2);
    expect(notify.success).toHaveBeenCalledWith('Session deleted');
    await waitFor(() => expect(calls.some((call) => call.url === '/notebook/cycles/today')).toBe(true));
    alert.mockRestore();
  });

  it('moves a week back and forward, never past this one', async () => {
    await renderHistory();
    expect(screen.getByTestId('history-next')).toBeDisabled();

    await press('history-previous');
    await waitFor(() => expect(historyCalls()[historyCalls().length - 1].params.from).toBe(addDaysIso(MONDAY, -7)));
    await waitFor(() => expect(screen.getByTestId('history-bars')).toBeTruthy());
    expect(screen.getByTestId('history-next')).not.toBeDisabled();

    await press('history-next');
    await waitFor(() => expect(historyCalls()[historyCalls().length - 1].params.from).toBe(MONDAY));
  });
});
