/**
 * "Log a session" on a phone: before sending, it says which block the minutes will land on (the
 * topic's first open block, else its last, the server's own rule), and after sending it names the
 * block the server credited and reads the cycles again.
 * Boundary mocked = @beyou/api HttpClient + expo-router + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

import { Provider } from 'react-redux';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { setLogger } from '@beyou/api';
import { addDaysIso, todayInZone } from '@beyou/state';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { notify } from '../src/notify';
import LogSessionSheet from '../src/notebook/cycles/LogSessionSheet';
import { fakeServer, notebookHome, summaryOf, today, topicTree, trt, type Call } from './fixtures/studyCycle';

let calls: Call[] = [];
const onClose = jest.fn();
const onLogged = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  setLogger({ error: () => {} });
  calls = fakeServer({
    'GET /notebook/home': notebookHome,
    'GET /notebook/cycles': [summaryOf(trt())],
    'GET /notebook/cycles/trt': trt(),
    'GET /notebook/cycles/today': today(),
    'GET /notebook/topics/adm/tree': topicTree('adm'),
    'GET /notebook/topics/const/tree': topicTree('const'),
    'GET /notebook/topics/calc/tree': topicTree('calc'),
    'POST /notebook/sessions': (call: Call) => ({
      id: 's1',
      credited: call.body.topicId === 'calc'
        ? null
        : { cycleId: 'trt', cycleName: 'Concurso TRT', blockId: 'b5', position: 5, minutesBefore: 0, minutesAfter: call.body.minutes, plannedMinutes: 75, state: 'OPEN' },
    }),
  });
});

async function renderSheet(topicId: string | null = 'adm') {
  const store = makeStore();
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <LogSessionSheet visible onClose={onClose} topicId={topicId} onLogged={onLogged} />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  await waitFor(() => expect(screen.getByTestId('log-session-preview')).toBeTruthy());
  return store;
}

const press = async (testID: string) => {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
};

describe('LogSessionSheet', () => {
  it('says where the minutes go before they are sent', async () => {
    await renderSheet('adm');

    expect(screen.getByTestId('log-session-preview')).toHaveTextContent(/Goes to block 5 · Concurso TRT/);
    expect(screen.getByTestId('log-session-preview-minutes')).toHaveTextContent('0 → 45 of 75 min');

    await press('log-session-minutes-90');
    expect(screen.getByTestId('log-session-preview-minutes')).toHaveTextContent('0 → 90 of 75 min');

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('log-session-minutes'), '20');
    });
    expect(screen.getByTestId('log-session-preview-minutes')).toHaveTextContent('0 → 20 of 75 min');
    expect(screen.getByTestId('log-session-save')).toHaveTextContent('Log 20 min');
  });

  it("follows the topic: a concept block that already holds minutes, then a topic outside every cycle", async () => {
    await renderSheet('adm');

    await press('log-session-topic');
    await press('log-session-topic-option-const');
    // Dir. Constitucional's first open block is block 3, at 30 of 70.
    expect(screen.getByTestId('log-session-preview')).toHaveTextContent(/Goes to block 3 · Concurso TRT/);
    expect(screen.getByTestId('log-session-preview')).toHaveTextContent(/Understand Controle de constitucionalidade/);
    expect(screen.getByTestId('log-session-preview-minutes')).toHaveTextContent('30 → 75 of 70 min');

    await press('log-session-topic');
    await press('log-session-topic-option-calc');
    expect(screen.getByTestId('log-session-preview')).toHaveTextContent("This topic isn't in a cycle. The session is saved, but no block moves.");
  });

  it('sends the session, names the block it went to and reads the cycles again', async () => {
    const store = await renderSheet('adm');
    const day = todayInZone(store.getState().perfil.timezone);

    await press('log-session-yesterday');
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('log-session-note'), ' Aula gravada, módulo 4 ');
    });
    await press('log-session-page');
    await waitFor(() => expect(screen.getByTestId('log-session-page-option-adm-a')).toBeTruthy());
    await press('log-session-page-option-adm-a');
    const todayReads = calls.filter((call) => call.url === '/notebook/cycles/today').length;

    await press('log-session-save');

    const post = calls.find((call) => call.method === 'POST' && call.url === '/notebook/sessions');
    expect(post?.body).toEqual({ topicId: 'adm', pageId: 'adm-a', minutes: 45, studiedOn: addDaysIso(day, -1), note: 'Aula gravada, módulo 4' });
    expect(notify.success).toHaveBeenCalledWith('45 min session logged in block 5 · Concurso TRT', { subtitle: '0 → 45 of 75 min' });
    expect(calls.filter((call) => call.url === '/notebook/cycles/today').length).toBe(todayReads + 1);
    expect(store.getState().studyCycles.today).not.toBeNull();
    expect(onLogged).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('a session on a topic outside every cycle is kept, and says no block moved', async () => {
    await renderSheet('calc');

    await press('log-session-save');

    expect(notify.success).toHaveBeenCalledWith("45 min session logged. That topic isn't in a cycle, so no block moved.", undefined);
  });

  it('will not send minutes the server refuses', async () => {
    await renderSheet('adm');

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('log-session-minutes'), '0');
    });
    expect(screen.getByTestId('log-session-save')).toBeDisabled();
    await press('log-session-save');

    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });

  it('a refused session stays open and says why', async () => {
    fakeServer({
      'GET /notebook/home': notebookHome,
      'GET /notebook/cycles': [summaryOf(trt())],
      'GET /notebook/cycles/trt': trt(),
      'GET /notebook/topics/adm/tree': topicTree('adm'),
    });
    await renderSheet('adm');

    await press('log-session-save');

    expect(notify.error).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
