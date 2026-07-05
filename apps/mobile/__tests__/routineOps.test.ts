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
jest.mock('@beyou/api/routine/createRoutine', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: { id: 'server' } })),
}));
jest.mock('@beyou/api/routine/editRoutine', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: {} })),
}));
jest.mock('@beyou/api/routine/deleteRoutine', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: true })),
}));
jest.mock('@beyou/api/schedule/createSchedule', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: {} })),
}));
jest.mock('@beyou/api/schedule/editSchedule', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: {} })),
}));

import { setLogger } from '@beyou/api';
import '../src/i18n';
import i18n from '../src/i18n';
import { makeStore } from '../src/store';
import { setOnline } from '../src/offline/connectivitySlice';
import { enterRoutines } from '@beyou/state/routine/routinesSlice';
import { setOfflineStore, setSyncEngine } from '../src/offline/mutations';
import { createRoutineOffline, deleteRoutineOffline, createScheduleOffline } from '../src/offline/ops/routineOps';
import { upsertRow, deleteRow } from '@beyou/offline';
import createRoutine from '@beyou/api/routine/createRoutine';
import type { Routine } from '@beyou/types/routine/routine';

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

test('online: createRoutineOffline delegates straight to the api (no queue, no mirror write)', async () => {
  const store = makeStore();
  store.dispatch(setOnline(true));
  setOfflineStore(store);
  const enqueued = makeEngine();

  await createRoutineOffline({ name: 'Morning', iconId: '', routineSections: [] }, t);

  expect(createRoutine).toHaveBeenCalled();
  expect(enqueued).toHaveLength(0);
});

test('offline create: optimistic redux row + mirror upsert + queued op with client id', async () => {
  const store = makeStore();
  store.dispatch(setOnline(false));
  setOfflineStore(store);
  const enqueued = makeEngine();

  const res = await createRoutineOffline({ name: 'Morning', iconId: '', routineSections: [] }, t);

  expect(createRoutine).not.toHaveBeenCalled();
  expect(res.queued).toBe(true);
  const routines = store.getState().routines.routines as Routine[];
  expect(routines).toHaveLength(1);
  expect(routines[0].name).toBe('Morning');
  expect(routines[0].id).toMatch(/^[0-9a-f]{8}-/);
  expect(upsertRow).toHaveBeenCalledWith(expect.anything(), 'routines', expect.objectContaining({ name: 'Morning' }));
  expect(enqueued[0].opType).toBe('routine.create');
  expect((enqueued[0].payload as { routine: Routine }).routine.id).toBe(routines[0].id);
});

test('offline delete: removes from redux + mirror + queues the op', async () => {
  const store = makeStore();
  store.dispatch(setOnline(false));
  store.dispatch(enterRoutines([{ id: 'r1', name: 'Old', iconId: '', routineSections: [] } as Routine]));
  setOfflineStore(store);
  const enqueued = makeEngine();

  const res = await deleteRoutineOffline('r1', t);

  expect(res.queued).toBe(true);
  expect(store.getState().routines.routines).toHaveLength(0);
  expect(deleteRow).toHaveBeenCalledWith(expect.anything(), 'routines', 'r1');
  expect(enqueued[0]).toEqual({ opType: 'routine.delete', payload: { id: 'r1' } });
});

test('offline schedule create: queues schedule.create only — no redux change (the sheet refetches)', async () => {
  const store = makeStore();
  store.dispatch(setOnline(false));
  setOfflineStore(store);
  const enqueued = makeEngine();
  const routinesBefore = store.getState().routines.routines;

  const res = await createScheduleOffline(['MONDAY'], 'r1', t);

  expect(res).toEqual({ queued: true });
  expect(store.getState().routines.routines).toBe(routinesBefore);
  expect(enqueued[0]).toEqual({ opType: 'schedule.create', payload: { days: ['MONDAY'], routineId: 'r1' } });
});
