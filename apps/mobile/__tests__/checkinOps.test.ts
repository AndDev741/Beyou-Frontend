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
    writeKV: jest.fn(async () => {}),
  };
});

import { setLogger } from '@beyou/api';
import { makeStore } from '../src/store';
import { setOnline } from '../src/offline/connectivitySlice';
import { enterTodayRoutine } from '@beyou/state/routine/todayRoutineSlice';
import { hydratePerfil } from '@beyou/state/user/perfilSlice';
import { setOfflineStore, setSyncEngine } from '../src/offline/mutations';
import { checkItemOffline, skipItemOffline } from '../src/offline/ops/checkinOps';
import { writeKV, localDateKey } from '@beyou/offline';
import type { Routine } from '@beyou/types/routine/routine';

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

// Shaped like the RoutineDay.test.tsx fixture: one section, one habitGroup, no checks yet.
function seedRoutine() {
  const store = makeStore();
  store.dispatch(setOnline(false));
  store.dispatch(hydratePerfil({ name: 'A', xp: 0, level: 1, constance: 0, actualLevelXp: 0, nextLevelXp: 100 }));
  store.dispatch(
    enterTodayRoutine({
      id: 'r1',
      name: 'My Routine',
      iconId: '',
      routineSections: [
        {
          id: 's1',
          name: 'Morning',
          iconId: '',
          startTime: '06:00',
          endTime: '07:00',
          order: 0,
          taskGroup: [],
          habitGroup: [{ id: 'hg1', habitId: 'h1', startTime: '06:00', endTime: '06:30', habitGroupChecks: [] }],
        },
      ],
    } as never),
  );
  setOfflineStore(store);
  return store;
}

const groupCheck = (store: ReturnType<typeof makeStore>) => {
  const routine = store.getState().todayRoutine.routine as Routine;
  const habitGroup = routine.routineSections[0].habitGroup?.[0];
  return habitGroup?.habitGroupChecks?.find((c) => c.checkDate === localDateKey());
};

beforeEach(() => {
  setLogger({ error: () => {} });
  jest.clearAllMocks();
});

test('checkItemOffline: marks the group checked locally (xpGenerated 0), mirrors the updated routine, queues routine.check', async () => {
  const store = seedRoutine();
  const enqueued = makeEngine();
  const dto = { routineId: 'r1', habitGroupDTO: { habitGroupId: 'hg1', startTime: '08:00' } };

  const res = await checkItemOffline(dto, 'hg1', true);

  expect(res).toEqual({ queued: true });
  const check = groupCheck(store);
  expect(check?.checked).toBe(true);
  expect(check?.xpGenerated).toBe(0);
  expect(writeKV).toHaveBeenCalledWith(
    expect.anything(),
    'todayRoutine',
    { date: localDateKey(), routine: store.getState().todayRoutine.routine },
  );
  expect(enqueued).toHaveLength(1);
  expect(enqueued[0].opType).toBe('routine.check');
  expect(enqueued[0].payload).toEqual({ dto, date: localDateKey() });
});

test('skipItemOffline: marks the group skipped locally (xpGenerated 0), mirrors the updated routine, queues routine.skip', async () => {
  const store = seedRoutine();
  const enqueued = makeEngine();
  const dto = { routineId: 'r1', skip: true, habitGroupDTO: { habitGroupId: 'hg1', startTime: '08:00' } };

  const res = await skipItemOffline(dto, 'hg1', true);

  expect(res).toEqual({ queued: true });
  const check = groupCheck(store);
  expect(check?.skipped).toBe(true);
  expect(check?.xpGenerated).toBe(0);
  expect(writeKV).toHaveBeenCalledWith(
    expect.anything(),
    'todayRoutine',
    { date: localDateKey(), routine: store.getState().todayRoutine.routine },
  );
  expect(enqueued).toHaveLength(1);
  expect(enqueued[0].opType).toBe('routine.skip');
  expect(enqueued[0].payload).toEqual({ dto, date: localDateKey() });
});

test('perfil is never touched locally — XP/level/constance stay exactly as seeded after check and skip', async () => {
  const store = seedRoutine();
  makeEngine();
  const perfilBefore = store.getState().perfil;

  await checkItemOffline({ routineId: 'r1', habitGroupDTO: { habitGroupId: 'hg1', startTime: '08:00' } }, 'hg1', true);
  await skipItemOffline({ routineId: 'r1', skip: true, habitGroupDTO: { habitGroupId: 'hg1', startTime: '08:00' } }, 'hg1', true);

  expect(store.getState().perfil).toEqual(perfilBefore);
});
