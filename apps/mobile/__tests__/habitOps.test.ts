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
jest.mock('@beyou/api/habits/createHabit', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: [{ id: 'server' }] })),
}));
jest.mock('@beyou/api/habits/editHabit', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: [] })),
}));
jest.mock('@beyou/api/habits/deleteHabit', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: [] })),
}));

import { setLogger } from '@beyou/api';
import '../src/i18n';
import i18n from '../src/i18n';
import { makeStore } from '../src/store';
import { setOnline } from '../src/offline/connectivitySlice';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { setOfflineStore, setSyncEngine } from '../src/offline/mutations';
import { createHabitOffline, deleteHabitOffline } from '../src/offline/ops/habitOps';
import { upsertRow, deleteRow } from '@beyou/offline';
import createHabit from '@beyou/api/habits/createHabit';
import type { habit } from '@beyou/types/habit/habitType';

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

beforeEach(() => {
  setLogger({ error: () => {} });
  jest.clearAllMocks();
});

test('online: delegates straight to the api (no queue, no mirror write)', async () => {
  const store = makeStore();
  store.dispatch(setOnline(true));
  setOfflineStore(store);
  const enqueued = makeEngine();
  await createHabitOffline('Run', '', '', 3, 3, 'lucide:zap', 0, [], t);
  expect(createHabit).toHaveBeenCalled();
  expect(enqueued).toHaveLength(0);
});

test('offline create: optimistic redux row + mirror upsert + queued op with client id', async () => {
  const store = makeStore();
  store.dispatch(setOnline(false));
  setOfflineStore(store);
  const enqueued = makeEngine();

  const res = await createHabitOffline('Run', 'desc', 'go!', 3, 4, 'lucide:zap', 0, [], t);

  expect(createHabit).not.toHaveBeenCalled();
  expect(res.queued).toBe(true);
  const habits = store.getState().habits.habits as habit[];
  expect(habits).toHaveLength(1);
  expect(habits[0].name).toBe('Run');
  expect(habits[0].id).toMatch(/^[0-9a-f]{8}-/);
  expect(upsertRow).toHaveBeenCalledWith(expect.anything(), 'habits', expect.objectContaining({ name: 'Run' }));
  expect(enqueued[0].opType).toBe('habit.create');
  expect((enqueued[0].payload as { id: string }).id).toBe(habits[0].id);
});

test('offline delete: removes from redux + mirror + queues the op', async () => {
  const store = makeStore();
  store.dispatch(setOnline(false));
  store.dispatch(enterHabits([{ id: 'h1', name: 'Old' } as unknown as habit]));
  setOfflineStore(store);
  const enqueued = makeEngine();

  const res = await deleteHabitOffline('h1', t);

  expect(res.queued).toBe(true);
  expect(store.getState().habits.habits).toHaveLength(0);
  expect(deleteRow).toHaveBeenCalledWith(expect.anything(), 'habits', 'h1');
  expect(enqueued[0]).toEqual({ opType: 'habit.delete', payload: { id: 'h1' } });
});
