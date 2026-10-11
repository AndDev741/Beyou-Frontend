/**
 * The cycle editor on a phone: it asks the server's planner for the plan as the person builds the
 * cycle (once they stop changing things, dropping an answer that arrives after a newer one),
 * shows the topics' weights and the block order, keeps topics another cycle holds out, and saves
 * with POST for a new cycle and PUT for an existing one.
 * Boundary mocked = @beyou/api HttpClient + expo-router + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => require('react').useEffect(() => callback(), [callback]),
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

import { Provider } from 'react-redux';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { setLogger } from '@beyou/api';
import type { PlanRequest, PlanResponse } from '@beyou/types/notebook/studyCycle';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { notify } from '../src/notify';
import NotebookCycleEditScreen from '../app/notebook-cycle-edit';
import { faculdade, fakeServer, notebookHome, summaryOf, today, trt, type Call } from './fixtures/studyCycle';

let calls: Call[] = [];

/** A plan worked out the planner's way, enough for the screen: weights, shares and one block per topic. */
function planFor(request: PlanRequest): PlanResponse {
  const week = request.days.reduce((sum, day) => sum + day.minutes, 0);
  const weights = request.topics.map((topic) => topic.importance * (6 - topic.mastery));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const topics = request.topics.map((topic, i) => {
    const suggested = Math.max(5, Math.round((week * weights[i]) / total / 5) * 5);
    const minutes = topic.minutesOverride ?? suggested;
    return { topicId: topic.topicId, weight: weights[i], share: weights[i] / total, suggestedMinutes: suggested, minutes, blocks: 1 };
  });
  const planned = topics.reduce((sum, topic) => sum + topic.minutes, 0);
  return {
    weekMinutes: week,
    plannedMinutes: planned,
    lapDays: week > 0 ? Math.round(planned / (week / 7)) : null,
    topics,
    blocks: [...topics].sort((a, b) => b.weight - a.weight).map((topic, i) => ({ position: i + 1, topicId: topic.topicId, plannedMinutes: topic.minutes })),
  };
}

const plans = () => calls.filter((call) => call.method === 'POST' && call.url === '/notebook/cycles/plan');

/** The server, with `cycles` as the person's other active cycles (Faculdade holds Cálculo II). */
function serve(cycles = [faculdade()]) {
  calls = fakeServer({
    'GET /notebook/home': notebookHome,
    'GET /notebook/cycles': cycles.map(summaryOf),
    'GET /notebook/cycles/trt': trt(),
    'GET /notebook/cycles/fac': faculdade(),
    'GET /notebook/cycles/today': today(),
    'POST /notebook/cycles/plan': (call: Call) => planFor(call.body),
    'POST /notebook/cycles': (call: Call) => ({ ...trt(), id: 'new', name: call.body.name }),
    'PUT /notebook/cycles/trt': (call: Call) => ({ ...trt(), name: call.body.name }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  setLogger({ error: () => {} });
  serve();
});

async function renderEditor() {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <NotebookCycleEditScreen />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
}

const press = async (testID: string, index = 0) => {
  await act(async () => {
    fireEvent.press(screen.getAllByTestId(testID)[index]);
  });
};

const type = async (testID: string, text: string, index = 0) => {
  await act(async () => {
    fireEvent.changeText(screen.getAllByTestId(testID)[index], text);
  });
};

async function pickTopics(...ids: string[]) {
  await press('cycle-edit-add-topic');
  await waitFor(() => expect(screen.getByTestId(`cycle-edit-pick-${ids[0]}`)).toBeTruthy());
  for (const id of ids) await press(`cycle-edit-pick-${id}`);
  await press('cycle-edit-pick-done');
}

describe('NotebookCycleEditScreen', () => {
  it('asks the planner once the topics are in, and shows weights, the order and the lap', async () => {
    await renderEditor();
    await pickTopics('const', 'port');

    await waitFor(() => expect(screen.getByTestId('cycle-edit-order')).toBeTruthy());
    const last = plans()[plans().length - 1];
    expect(last.body.maxBlockMinutes).toBe(90);
    expect(last.body.days).toHaveLength(7);
    expect(last.body.topics).toEqual([
      { topicId: 'const', importance: 3, mastery: 3, minutesOverride: null },
      { topicId: 'port', importance: 3, mastery: 3, minutesOverride: null },
    ]);

    // Five weekday hours split evenly between two topics of the same weight.
    expect(screen.getByTestId('cycle-edit-week-total')).toHaveTextContent('5h');
    expect(screen.getAllByTestId('cycle-edit-weight')[0]).toHaveTextContent('Weight 9 · 50%');
    expect(screen.getAllByTestId('cycle-edit-order-block')).toHaveLength(2);
    expect(screen.getByTestId('cycle-edit-lap')).toHaveTextContent('One lap: 5h');
    expect(screen.getByText("About 7 days at your week's pace")).toBeTruthy();
  });

  it('every change asks again: the week, the steppers and a typed number of minutes', async () => {
    await renderEditor();
    await pickTopics('const');
    await waitFor(() => expect(plans().length).toBeGreaterThan(0));

    await press('cycle-edit-day-MONDAY-more');
    await waitFor(() => expect(plans()[plans().length - 1].body.days[0]).toEqual({ weekday: 'MONDAY', minutes: 90, startTime: null }));

    await press('cycle-edit-importance-more');
    await waitFor(() => expect(plans()[plans().length - 1].body.topics[0].importance).toBe(4));

    await type('cycle-edit-topic-minutes', '120');
    await waitFor(() => expect(plans()[plans().length - 1].body.topics[0].minutesOverride).toBe(120));
    await waitFor(() => expect(screen.getByTestId('cycle-edit-reset')).toBeTruthy());

    await press('cycle-edit-reset');
    await waitFor(() => expect(plans()[plans().length - 1].body.topics[0].minutesOverride).toBeNull());
  });

  it('drops a plan that arrives after a newer one', async () => {
    const held: { release: () => void }[] = [];
    calls = fakeServer({
      'GET /notebook/home': notebookHome,
      'GET /notebook/cycles': [],
      'POST /notebook/cycles/plan': (call: Call) => {
        const plan = planFor(call.body);
        // The first answer waits until the test lets it go.
        if (held.length === 0) {
          return new Promise((resolve) => held.push({ release: () => resolve(plan) }));
        }
        held.push({ release: () => {} });
        return plan;
      },
    });
    await renderEditor();
    await pickTopics('const');
    await waitFor(() => expect(held).toHaveLength(1));

    await press('cycle-edit-mastery-less');
    await waitFor(() => expect(held).toHaveLength(2));
    await waitFor(() => expect(screen.getAllByTestId('cycle-edit-weight')[0]).toHaveTextContent('Weight 12 · 100%'));

    // The older answer (weight 9) lands last and must not overwrite the newer one.
    await act(async () => held[0].release());
    expect(screen.getAllByTestId('cycle-edit-weight')[0]).toHaveTextContent('Weight 12 · 100%');
  });

  it('keeps out a topic another cycle already holds', async () => {
    serve([trt(), faculdade()]);
    await renderEditor();

    await press('cycle-edit-add-topic');
    await waitFor(() => expect(screen.getByTestId('cycle-edit-pick-calc')).toHaveTextContent(/In Faculdade/));
    expect(screen.getByTestId('cycle-edit-pick-calc')).toBeDisabled();
    expect(screen.getByTestId('cycle-edit-pick-const')).toHaveTextContent(/In Concurso TRT/);
  });

  it('creates the cycle with POST and opens it on the cycle screen', async () => {
    await renderEditor();
    await type('cycle-edit-name', '  Inglês  ');
    await pickTopics('const');
    await press('cycle-edit-day-SATURDAY-more');

    await press('cycle-edit-save');

    const post = calls.find((call) => call.method === 'POST' && call.url === '/notebook/cycles');
    expect(post?.body).toMatchObject({ name: 'Inglês', defaultMode: 'GOAL', maxBlockMinutes: 90 });
    expect(post?.body.days.find((day: { weekday: string }) => day.weekday === 'SATURDAY').minutes).toBe(30);
    expect(post?.body.topics).toEqual([{ topicId: 'const', importance: 3, mastery: 3, minutesOverride: null }]);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/notebook-cycles', params: { id: 'new' } }));
    expect(notify.success).toHaveBeenCalledWith('Inglês is ready');
  });

  it('refuses to save without a name or a topic', async () => {
    await renderEditor();

    await press('cycle-edit-save');
    expect(notify.error).toHaveBeenLastCalledWith('Give the cycle a name.');

    await type('cycle-edit-name', 'Inglês');
    await press('cycle-edit-save');
    expect(notify.error).toHaveBeenLastCalledWith('Add at least one topic.');

    expect(calls.some((call) => call.method === 'POST' && call.url === '/notebook/cycles')).toBe(false);
  });

  it('edits an existing cycle: reads it into the form and saves with PUT', async () => {
    mockParams = { id: 'trt' };
    serve([trt(), faculdade()]);
    await renderEditor();

    await waitFor(() => expect(screen.getByTestId('cycle-edit-name')).toHaveProp('value', 'Concurso TRT'));
    expect(screen.getAllByTestId('cycle-edit-topic')).toHaveLength(3);
    expect(screen.getByTestId('cycle-edit-day-WEDNESDAY-minutes')).toHaveTextContent('3h');
    expect(screen.getByTestId('cycle-edit-day-SUNDAY-minutes')).toHaveTextContent('rest');
    // Its own topics are not "taken" while editing it.
    await press('cycle-edit-add-topic');
    expect(within(screen.getByTestId('cycle-edit-pick-const')).queryByText(/In Concurso TRT/)).toBeNull();
    await press('cycle-edit-pick-done');

    await type('cycle-edit-name', 'Concurso TRT 2027');
    await press('cycle-edit-save');

    const put = calls.find((call) => call.method === 'PUT');
    expect(put?.url).toBe('/notebook/cycles/trt');
    expect(put?.body).toMatchObject({ name: 'Concurso TRT 2027', defaultMode: 'GOAL', maxBlockMinutes: 90 });
    expect(put?.body.topics[2]).toEqual({ topicId: 'adm', importance: 4, mastery: 2, minutesOverride: 75 });
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
