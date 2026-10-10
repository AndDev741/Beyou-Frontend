/**
 * "New topic with AI" on the phone: the form, the draft the model writes in the background (read
 * back until it is ready), the ticks saved as the person makes them, a change asked for in words,
 * and the topic created from what was kept. The home lists the drafts waiting for a decision.
 * Each call goes to the endpoint the web's dialog uses.
 * Boundary mocked = @beyou/api HttpClient + expo-router + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void | (() => void)) => require('react').useEffect(() => callback(), [callback]),
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import { DRAFT_CHOICES_SAVE_MS, DRAFT_POLL_MS } from '@beyou/state';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import NotebookDraftScreen from '../app/notebook-draft';
import NotebookHomeScreen from '../app/(app)/notebook/index';
import NewTopicSheet from '../src/notebook/NewTopicSheet';

const node = (title: string, extra: Record<string, unknown> = {}) => ({
  title, why: `Why ${title}`, subtopics: [`${title} basics`], estimatedHours: 4, optional: false,
  existingPageId: null, existingTopicTitle: null, existingProgress: null, ...extra,
});

const request = { title: 'Algorithms', why: 'Interviews', level: 'NEW', hoursPerWeek: 3, goalId: null, references: undefined };
const record = (status: 'DRAFTING' | 'READY' | 'FAILED', nodes: unknown[] | null, extra: Record<string, unknown> = {}) => ({
  id: 'd1', title: 'Algorithms', status, request, result: nodes ? { nodes, totalHours: 12 } : null, choices: null,
  errorKey: null, startedAt: new Date().toISOString(), createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z',
  ...extra,
});

const readyNodes = [node('Sorting'), node('Graphs', { optional: true }), node('Heaps', { existingPageId: 'p9', existingTopicTitle: 'Data Structures', existingProgress: { done: 1, total: 3 } })];

let stored: ReturnType<typeof record>;
let drafts: unknown[] = [];
let calls: { method: string; url: string; body?: any }[] = [];

beforeEach(() => {
  jest.useFakeTimers();
  mockParams = {};
  calls = [];
  drafts = [];
  stored = record('DRAFTING', null);
  jest.clearAllMocks();
  setLogger({ error: () => {} });
  setHttpClient({
    get: async (url: string) => {
      if (url === '/notebook/drafts') return { data: drafts, headers: {} };
      if (url.startsWith('/notebook/drafts/')) return { data: stored, headers: {} };
      if (url === '/notebook/home') return { data: { continueStudying: null, review: { due: 0, streak: 0, byTopic: [] }, topics: [] }, headers: {} };
      return { data: [], headers: {} };
    },
    post: async (url: string, body: any) => {
      calls.push({ method: 'POST', url, body });
      if (url === '/notebook/topics/from-draft') return { data: { id: 'new-topic', title: body.title }, headers: {} };
      return { data: stored, headers: {} };
    },
    put: async (url: string, body: any) => {
      calls.push({ method: 'PUT', url, body });
      return { data: stored, headers: {} };
    },
    patch: async () => ({ data: {}, headers: {} }),
    delete: async (url: string) => {
      calls.push({ method: 'DELETE', url });
      return { data: undefined, headers: {} };
    },
  } as never);
});

afterEach(() => {
  jest.useRealTimers();
});

const wrap = (ui: React.ReactElement) => (
  <Provider store={makeStore()}>
    <BeyouThemeProvider>{ui}</BeyouThemeProvider>
  </Provider>
);

const press = async (testID: string, index = 0) => {
  await act(async () => {
    fireEvent.press(screen.getAllByTestId(testID)[index]);
  });
};

const type = async (testID: string, text: string) => {
  await act(async () => {
    fireEvent.changeText(screen.getByTestId(testID), text);
  });
};

const wait = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

describe('NotebookDraftScreen', () => {
  it('drafts a roadmap, reads it back until it is ready, saves the ticks and creates the topic', async () => {
    mockParams = { title: 'Algorithms' };
    await act(async () => {
      render(wrap(<NotebookDraftScreen />));
    });

    expect(screen.getByTestId('draft-empty')).toBeTruthy();
    await type('draft-why', 'Interviews');
    await press('draft-level-NEW');
    await press('draft-hours-3');
    await press('draft-run');

    expect(calls[0]).toEqual({
      method: 'POST',
      url: '/notebook/ai/drafts',
      body: { title: 'Algorithms', why: 'Interviews', level: 'NEW', hoursPerWeek: 3, goalId: null, references: undefined, changeRequest: undefined, previous: undefined },
    });
    expect(screen.getByTestId('draft-waiting')).toBeTruthy();
    expect(screen.getByTestId('draft-saved')).toBeTruthy();

    stored = record('READY', readyNodes);
    await wait(DRAFT_POLL_MS);
    expect(screen.getAllByTestId('draft-node')).toHaveLength(3);
    // The optional node starts left out, the one the person already has starts linked.
    expect(screen.getByText('Create topic with 2 nodes')).toBeTruthy();
    expect(screen.getByText('linked')).toBeTruthy();

    await press('draft-node-keep', 1);
    expect(screen.getByText('Create topic with 3 nodes')).toBeTruthy();
    await press('draft-node-link-copy');
    await wait(DRAFT_CHOICES_SAVE_MS);
    expect(calls[1]).toEqual({
      method: 'PUT',
      url: '/notebook/drafts/d1/choices',
      body: { choices: [{ keep: true, link: false }, { keep: true, link: false }, { keep: true, link: false }] },
    });

    await press('draft-create');
    expect(calls[2].url).toBe('/notebook/topics/from-draft');
    expect(calls[2].body.draftId).toBe('d1');
    expect(calls[2].body.nodes.map((n: any) => [n.title, n.linkPageId, n.subtopics.length])).toEqual([
      ['Sorting', null, 1], ['Graphs', null, 1], ['Heaps', null, 1],
    ]);
    expect(mockRouter.replace).toHaveBeenCalledWith('/notebook/new-topic');
  });

  it('reopens a stored draft where it was left and applies a change asked for in words', async () => {
    stored = record('READY', readyNodes, { choices: [{ keep: true, link: false }, { keep: false, link: false }, { keep: true, link: true }] });
    mockParams = { id: 'd1' };
    await act(async () => {
      render(wrap(<NotebookDraftScreen />));
    });

    expect(screen.queryByTestId('draft-form')).toBeNull();
    expect(screen.getByTestId('draft-request')).toBeTruthy();
    expect(screen.getByText('Create topic with 2 nodes')).toBeTruthy();

    await type('draft-change', 'split Sorting in two');
    await press('draft-apply');
    expect(calls[0]).toEqual({
      method: 'POST',
      url: '/notebook/ai/drafts/d1/redraft',
      body: expect.objectContaining({
        title: 'Algorithms',
        changeRequest: 'split Sorting in two',
        previous: [{ title: 'Sorting', subtopics: ['Sorting basics'] }, { title: 'Heaps', subtopics: ['Heaps basics'] }],
      }),
    });

    await press('draft-edit');
    expect(screen.getByTestId('draft-form')).toBeTruthy();
    expect(screen.getByDisplayValue('Algorithms')).toBeTruthy();
  });

  it('says why a draft did not finish', async () => {
    stored = record('FAILED', null, { errorKey: 'AI_UNAVAILABLE' });
    mockParams = { id: 'd1' };
    await act(async () => {
      render(wrap(<NotebookDraftScreen />));
    });

    expect(screen.getByTestId('draft-error')).toBeTruthy();
    expect(screen.getByTestId('draft-create').props.accessibilityState?.disabled).toBe(true);
  });
});

describe('the drafts on the home', () => {
  it('lists the drafts, opens one and deletes another', async () => {
    drafts = [
      { id: 'd1', title: 'Algorithms', status: 'READY', nodeCount: 6, errorKey: null, startedAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' },
      { id: 'd2', title: 'Kubernetes', status: 'DRAFTING', nodeCount: 0, errorKey: null, startedAt: new Date().toISOString(), updatedAt: '2026-10-10T00:00:00Z' },
    ];
    await act(async () => {
      render(wrap(<NotebookHomeScreen />));
    });

    expect(screen.getAllByTestId('draft-card')).toHaveLength(2);
    expect(screen.getByText('Ready to review · 6 nodes')).toBeTruthy();
    expect(screen.getByTestId('ai-waiting-elapsed')).toBeTruthy();

    await press('draft-open', 0);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/notebook-draft', params: { id: 'd1' } });

    await press('draft-delete', 1);
    await press('draft-delete-modal-confirm');
    expect(calls).toContainEqual({ method: 'DELETE', url: '/notebook/drafts/d2' });
  });

  it('starts a draft from the New topic sheet with the title typed there', async () => {
    const onClose = jest.fn();
    await act(async () => {
      render(wrap(<NewTopicSheet visible onClose={onClose} />));
    });

    await type('new-topic-title', ' Kubernetes ');
    await press('new-topic-ai');
    expect(onClose).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/notebook-draft', params: { title: 'Kubernetes' } });
  });
});
