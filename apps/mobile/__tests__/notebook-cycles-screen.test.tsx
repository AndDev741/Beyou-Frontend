/**
 * The cycle screen on a phone: the lap and its blocks as the shared wording reads them, a block's
 * own settings sent as a PATCH from its sheet, the order changed one step at a time (a PUT of the
 * whole list), and archiving behind the native confirm.
 * Boundary mocked = @beyou/api HttpClient + expo-router + notify + Alert.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => require('react').useEffect(() => callback(), [callback]),
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { setLogger } from '@beyou/api';
import type { StudyCycle } from '@beyou/types/notebook/studyCycle';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { notify } from '../src/notify';
import NotebookCyclesScreen from '../app/notebook-cycles';
import { faculdade, fakeServer, summaryOf, today, topicTree, trt, TOPICS, type Call } from './fixtures/studyCycle';

let calls: Call[] = [];
let archived = false;

const withBlocks = (cycle: StudyCycle, blocks: StudyCycle['blocks']): StudyCycle => ({ ...cycle, blocks });

beforeEach(() => {
  jest.clearAllMocks();
  archived = false;
  setLogger({ error: () => {} });
  calls = fakeServer({
    'GET /notebook/cycles': () => (archived ? [summaryOf(faculdade())] : [summaryOf(trt()), summaryOf(faculdade())]),
    'GET /notebook/cycles/trt': trt(),
    'GET /notebook/cycles/fac': faculdade(),
    'GET /notebook/cycles/today': today(),
    'GET /notebook/topics/adm/tree': topicTree('adm'),
    'GET /notebook/topics/port/tree': topicTree('port'),
    'PATCH /notebook/cycles/trt/blocks/b4': (call: Call) =>
      withBlocks(trt(), trt().blocks.map((b) => (b.id === 'b4' ? { ...b, ...call.body, page: b.page } : b))),
    'PATCH /notebook/cycles/trt/blocks/b5': (call: Call) =>
      withBlocks(trt(), trt().blocks.map((b) => (b.id === 'b5' ? { ...b, mode: call.body.mode } : b))),
    'PUT /notebook/cycles/trt/blocks': (call: Call) =>
      withBlocks(
        trt(),
        call.body.map((request: { id: string }, index: number) => ({ ...trt().blocks.find((b) => b.id === request.id)!, position: index + 1 })),
      ),
    'POST /notebook/cycles/trt/archive': () => {
      archived = true;
      return undefined;
    },
  });
});

async function renderScreen(store = makeStore()) {
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <NotebookCyclesScreen />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  await waitFor(() => expect(screen.getAllByTestId('block-row')).toHaveLength(5));
  return store;
}

const press = async (element: Parameters<typeof fireEvent.press>[0]) => {
  await act(async () => {
    fireEvent.press(element);
  });
};

describe('NotebookCyclesScreen', () => {
  it('shows the lap and every block the way the shared wording reads it', async () => {
    await renderScreen();

    expect(screen.getByTestId('cycle-lap-title')).toHaveTextContent('2 of 5 blocks closed');
    expect(screen.getByText('1 concept understood')).toBeTruthy();
    expect(screen.getByText('Studied so far: 2h35 of about 5h55')).toBeTruthy();

    const rows = screen.getAllByTestId('block-row');
    expect(within(rows[0]).getByText('Understand Direitos fundamentais')).toBeTruthy();
    expect(within(rows[0]).getByTestId('block-row-figure')).toHaveTextContent('Understood in 55 min');
    expect(within(rows[1]).getByTestId('block-row-figure')).toHaveTextContent('70 of 70 min · done');
    expect(within(rows[2]).getByTestId('block-row-figure')).toHaveTextContent('2 of 5 subpages done');
    expect(within(rows[3]).getByTestId('block-row-figure')).toHaveTextContent('Page and quiz to go');
    expect(within(rows[4]).getByTestId('block-row-figure')).toHaveTextContent('75 min');

    // Today's slice marks the block to study now and the ones after it.
    expect(within(rows[2]).getByTestId('block-row-badge')).toHaveTextContent('Today · up next');
    expect(within(rows[3]).getByTestId('block-row-badge')).toHaveTextContent('Today');
    expect(within(rows[0]).queryByTestId('block-row-badge')).toBeNull();

    expect(screen.getByTestId('cycle-week')).toBeTruthy();
    expect(screen.getByTestId('cycle-week-WEDNESDAY')).toHaveTextContent(/3h · 19:00/);
    expect(screen.getByTestId('cycle-week-SUNDAY')).toHaveTextContent(/rest/);
    expect(screen.getByTestId('cycle-previous-laps')).toHaveTextContent(/Lap 3/);
  });

  it('a tab opens the other cycle', async () => {
    await renderScreen();

    await press(screen.getByTestId('cycles-tab-fac'));

    await waitFor(() => expect(screen.getAllByTestId('block-row')).toHaveLength(1));
    expect(calls.some((call) => call.method === 'GET' && call.url === '/notebook/cycles/fac')).toBe(true);
    expect(screen.getByText('Cálculo II')).toBeTruthy();
  });

  it("a block's sheet sends its settings as a PATCH and the screen shows the answer", async () => {
    const store = await renderScreen();

    await press(screen.getAllByTestId('block-row')[3]);
    expect(screen.getByTestId('block-sheet')).toBeTruthy();
    await press(screen.getByTestId('block-minutes-more'));
    await act(async () => {
      fireEvent(screen.getByTestId('block-quiz'), 'valueChange', false);
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('block-note'), '  Read the chapter first ');
    });
    await press(screen.getByTestId('block-save'));

    const patch = calls.find((call) => call.method === 'PATCH');
    expect(patch?.url).toBe('/notebook/cycles/trt/blocks/b4');
    expect(patch?.body).toEqual({
      mode: 'GOAL', plannedMinutes: 75, goalSource: 'PAGE', pageId: 'p-crase', requireQuiz: false, note: 'Read the chapter first',
    });
    expect(store.getState().studyCycles.byId.trt.blocks[3].plannedMinutes).toBe(75);
    expect(notify.success).toHaveBeenCalledWith('Block saved');
    expect(screen.queryByTestId('block-sheet')).toBeNull();
  });

  it('a concept from a chosen page cannot be saved until the page is picked, then sends it', async () => {
    await renderScreen();

    await press(screen.getAllByTestId('block-row')[4]);
    await press(screen.getByTestId('block-mode-GOAL'));
    await press(screen.getByTestId('block-source-PAGE'));
    expect(screen.getByTestId('block-save')).toBeDisabled();

    // The topic and its own pages; a page linked in from another topic is not offered.
    await press(screen.getByTestId('block-page'));
    await waitFor(() => expect(screen.getByTestId('block-page-option-adm-a1')).toBeTruthy());
    expect(screen.queryByTestId('block-page-option-elsewhere')).toBeNull();
    await press(screen.getByTestId('block-page-option-adm-a1'));
    await press(screen.getByTestId('block-save'));

    const patch = calls.find((call) => call.method === 'PATCH');
    expect(patch?.url).toBe('/notebook/cycles/trt/blocks/b5');
    expect(patch?.body).toMatchObject({ mode: 'GOAL', goalSource: 'PAGE', pageId: 'adm-a1' });
  });

  it('a refused PATCH keeps the sheet open and says why', async () => {
    fakeServer({
      'GET /notebook/cycles': [summaryOf(trt())],
      'GET /notebook/cycles/trt': trt(),
      'GET /notebook/cycles/today': today(),
      'GET /notebook/topics/port/tree': topicTree('port'),
    });
    await renderScreen();

    await press(screen.getAllByTestId('block-row')[3]);
    await press(screen.getByTestId('block-save'));

    expect(notify.error).toHaveBeenCalled();
    expect(screen.getByTestId('block-sheet')).toBeTruthy();
  });

  it('moving a block down sends the whole new order', async () => {
    const store = await renderScreen();

    await press(screen.getByTestId('cycles-reorder'));
    // While reordering a row moves, it does not open.
    expect(screen.queryAllByTestId('block-row-figure')).toHaveLength(0);
    await press(screen.getAllByTestId('block-row-down')[0]);

    const put = calls.find((call) => call.method === 'PUT');
    expect(put?.url).toBe('/notebook/cycles/trt/blocks');
    expect(put?.body.map((request: { id: string }) => request.id)).toEqual(['b2', 'b1', 'b3', 'b4', 'b5']);
    // Each block goes back with everything it already says.
    expect(put?.body[3]).toEqual({
      id: 'b4', topicId: 'port', mode: 'GOAL', plannedMinutes: 70, goalSource: 'PAGE', pageId: 'p-crase', requireQuiz: true, note: null,
    });
    expect(store.getState().studyCycles.byId.trt.blocks.map((b) => b.id)).toEqual(['b2', 'b1', 'b3', 'b4', 'b5']);
    expect(screen.getAllByTestId('block-row-up')[0]).toBeDisabled();
  });

  it('archives only after the native confirm, and the cycle leaves the screen', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const store = await renderScreen();

    await press(screen.getByTestId('cycles-archive'));
    expect(calls.some((call) => call.url === '/notebook/cycles/trt/archive')).toBe(false);

    const buttons = alert.mock.calls[0][2]!;
    expect(alert.mock.calls[0][0]).toBe('Archive Concurso TRT?');
    await act(async () => {
      buttons.find((button) => button.style === 'destructive')!.onPress!();
    });

    await waitFor(() => expect(calls.some((call) => call.method === 'POST' && call.url === '/notebook/cycles/trt/archive')).toBe(true));
    await waitFor(() => expect(store.getState().studyCycles.byId.trt).toBeUndefined());
    expect(notify.success).toHaveBeenCalledWith('Concurso TRT archived');
    await waitFor(() => expect(screen.getAllByTestId('block-row')).toHaveLength(1));
    alert.mockRestore();
  });

  it('with no cycle, invites building one', async () => {
    fakeServer({ 'GET /notebook/cycles': [], 'GET /notebook/cycles/today': today({ cycles: [] }) });
    await act(async () => {
      render(
        <Provider store={makeStore()}>
          <BeyouThemeProvider>
            <NotebookCyclesScreen />
          </BeyouThemeProvider>
        </Provider>,
      );
    });

    await waitFor(() => expect(screen.getByTestId('cycles-empty')).toBeTruthy());
  });

  it('"Log a session" opens the sheet on the lap\'s first open block', async () => {
    await renderScreen();

    await press(screen.getByTestId('cycles-log'));

    await waitFor(() =>
      expect(screen.getByTestId('log-session-topic')).toHaveProp('accessibilityValue', { text: `${TOPICS.const.title} · Concurso TRT` }),
    );
  });
});
