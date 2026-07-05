jest.mock('../src/offline/db', () => ({
  getDb: jest.fn(async () => ({})),
  getCacheGeneration: jest.fn(() => 0),
  clearOfflineCache: jest.fn(async () => {}),
}));
jest.mock('@beyou/offline', () => {
  const actual = jest.requireActual('@beyou/offline');
  return {
    __esModule: true,
    ...actual,
    upsertRow: jest.fn(async () => {}),
    deleteRow: jest.fn(async () => {}),
  };
});
jest.mock('@beyou/api/goals/createGoal', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: { id: 'server' } })),
}));
jest.mock('@beyou/api/goals/editGoal', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: {} })),
}));
jest.mock('@beyou/api/goals/deleteGoal', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: true })),
}));
jest.mock('@beyou/api/goals/increaseCurrentValue', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ id: 'server', currentValue: 99 })),
}));
jest.mock('@beyou/api/goals/decreaseCurrentValue', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ id: 'server', currentValue: 1 })),
}));
jest.mock('@beyou/api/goals/markGoalAsComplete', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: {} })),
}));

import { setLogger } from '@beyou/api';
import '../src/i18n';
import i18n from '../src/i18n';
import { makeStore } from '../src/store';
import { setOnline } from '../src/offline/connectivitySlice';
import { enterGoals } from '@beyou/state/goal/goalsSlice';
import { setOfflineStore, setSyncEngine } from '../src/offline/mutations';
import {
  createGoalOffline,
  completeGoalOffline,
  decreaseGoalOffline,
  increaseGoalOffline,
} from '../src/offline/ops/goalOps';
import { upsertRow } from '@beyou/offline';
import increaseCurrentValue from '@beyou/api/goals/increaseCurrentValue';
import type { goal } from '@beyou/types/goals/goalType';

const t = i18n.t.bind(i18n);

const makeEngine = () => {
  const enqueued: Array<{ opType: string; payload: unknown }> = [];
  setSyncEngine({
    enqueue: async (opType: string, payload: unknown) => {
      enqueued.push({ opType, payload });
    },
    flush: async () => ({ flushed: 0, dropped: 0, remaining: 0 }),
    pendingCount: async () => enqueued.length,
  });
  return enqueued;
};

const seedGoal = (overrides: Partial<goal> = {}): goal =>
  ({
    id: 'g1',
    name: 'Read books',
    iconId: 'lucide:book',
    description: '',
    targetValue: 10,
    unit: 'books',
    currentValue: 2,
    complete: false,
    categories: {},
    motivation: '',
    startDate: '2026-01-01' as unknown as Date,
    endDate: '2026-12-31' as unknown as Date,
    xpReward: 0,
    status: 'IN_PROGRESS',
    term: 'SHORT_TERM',
    ...overrides,
  }) as goal;

beforeEach(() => {
  setLogger({ error: () => {} });
  jest.clearAllMocks();
});

test('offline increase: bumps currentValue by 1, dispatches updateGoal, mirrors + queues goal.increase', async () => {
  const store = makeStore();
  store.dispatch(setOnline(false));
  store.dispatch(enterGoals([seedGoal({ currentValue: 2, targetValue: 10 })]));
  setOfflineStore(store);
  const enqueued = makeEngine();

  const result = await increaseGoalOffline('g1', t);

  expect(result.currentValue).toBe(3);
  const goals = store.getState().goals.goals as goal[];
  expect(goals[0].currentValue).toBe(3);
  expect(upsertRow).toHaveBeenCalledWith(expect.anything(), 'goals', expect.objectContaining({ id: 'g1', currentValue: 3 }));
  expect(enqueued[0]).toEqual({ opType: 'goal.increase', payload: { id: 'g1' } });
});

test('offline decrease: floors currentValue at 0 (matches backend Math.max(0, ...))', async () => {
  const store = makeStore();
  store.dispatch(setOnline(false));
  store.dispatch(enterGoals([seedGoal({ currentValue: 0 })]));
  setOfflineStore(store);
  makeEngine();

  const result = await decreaseGoalOffline('g1', t);

  expect(result.currentValue).toBe(0);
  const goals = store.getState().goals.goals as goal[];
  expect(goals[0].currentValue).toBe(0);
});

test('offline complete: marks complete locally, queues goal.complete, returns {queued:true}, no perfil XP change', async () => {
  const store = makeStore();
  store.dispatch(setOnline(false));
  store.dispatch(enterGoals([seedGoal({ complete: false })]));
  setOfflineStore(store);
  const enqueued = makeEngine();
  const perfilBefore = store.getState().perfil;

  const res = await completeGoalOffline('g1', t);

  expect(res).toEqual({ queued: true });
  const goals = store.getState().goals.goals as goal[];
  expect(goals[0].complete).toBe(true);
  expect(enqueued[0]).toEqual({ opType: 'goal.complete', payload: { id: 'g1' } });
  expect(store.getState().perfil).toBe(perfilBefore);
});

test('offline create: optimistic row + registry payload with client id', async () => {
  const store = makeStore();
  store.dispatch(setOnline(false));
  setOfflineStore(store);
  const enqueued = makeEngine();

  const res = await createGoalOffline(
    'Read books', 'lucide:book', 'desc', 10, 'books', 0, [], 'motivate me', '2026-01-01', '2026-12-31', 'NOT_STARTED', 'SHORT_TERM', t
  );

  expect(res.queued).toBe(true);
  const goals = store.getState().goals.goals as goal[];
  expect(goals).toHaveLength(1);
  expect(goals[0].name).toBe('Read books');
  expect(goals[0].id).toMatch(/^[0-9a-f]{8}-/);
  expect(upsertRow).toHaveBeenCalledWith(expect.anything(), 'goals', expect.objectContaining({ name: 'Read books' }));
  expect(enqueued[0].opType).toBe('goal.create');
  expect(enqueued[0].payload).toEqual({
    id: goals[0].id,
    title: 'Read books',
    iconId: 'lucide:book',
    description: 'desc',
    targetValue: 10,
    unit: 'books',
    currentValue: 0,
    categoriesId: [],
    motivation: 'motivate me',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'NOT_STARTED',
    term: 'SHORT_TERM',
  });
});

test('online: increaseGoalOffline delegates to the api mock', async () => {
  const store = makeStore();
  store.dispatch(setOnline(true));
  setOfflineStore(store);
  const enqueued = makeEngine();

  const result = await increaseGoalOffline('g1', t);

  expect(increaseCurrentValue).toHaveBeenCalledWith('g1', t);
  expect(result.currentValue).toBe(99);
  expect(enqueued).toHaveLength(0);
});
