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
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import React from 'react';
import { Provider } from 'react-redux';
import { renderHook, act } from '@testing-library/react-native';
import { setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { setOnline } from '../src/offline/connectivitySlice';
import { enterTodayRoutine } from '@beyou/state/routine/todayRoutineSlice';
import { hydratePerfil } from '@beyou/state/user/perfilSlice';
import { setOfflineStore, setSyncEngine } from '../src/offline/mutations';
import { useRoutineCheckin } from '../src/dashboard/useRoutineCheckin';
import { localDateKey } from '@beyou/offline';
import { notify } from '../src/notify';
import type { Routine } from '@beyou/types/routine/routine';

// Shaped like checkinOps.test.ts's fixture: one section, one habitGroup, no checks yet.
function seedStore() {
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
  return store;
}

const groupCheck = (store: ReturnType<typeof makeStore>) => {
  const routine = store.getState().todayRoutine.routine as Routine;
  const habitGroup = routine.routineSections[0].habitGroup?.[0];
  return habitGroup?.habitGroupChecks?.find((c) => c.checkDate === localDateKey());
};

const wrapper =
  (store: ReturnType<typeof makeStore>) =>
  ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;

const dto = { routineId: 'r1', habitGroupDTO: { habitGroupId: 'hg1', startTime: '08:00' } };

beforeEach(() => {
  setLogger({ error: () => {} });
  jest.clearAllMocks();
});

test('offline check: returns null, the refreshItemGroup state lands in the store, perfil is untouched', async () => {
  const store = seedStore();
  setOfflineStore(store);
  setSyncEngine({
    enqueue: async () => {},
    flush: async () => ({ flushed: 0, dropped: 0, remaining: 0 }),
    pendingCount: async () => 0,
  });
  const perfilBefore = store.getState().perfil;

  const { result } = await renderHook(() => useRoutineCheckin(), { wrapper: wrapper(store) });
  let ret: unknown = 'not-set';
  await act(async () => {
    ret = await result.current.check(dto, { wasChecked: false });
  });

  expect(ret).toBeNull();
  const check = groupCheck(store);
  expect(check?.checked).toBe(true);
  expect(check?.xpGenerated).toBe(0);
  expect(store.getState().perfil).toBe(perfilBefore);
  expect(notify.error).not.toHaveBeenCalled();
});

test('offline check: when the engine throws mid-queue, the error is logged and surfaced via notify.error, still returns null', async () => {
  const store = seedStore();
  setOfflineStore(store);
  setSyncEngine({
    enqueue: async () => {
      throw new Error('outbox insert failed');
    },
    flush: async () => ({ flushed: 0, dropped: 0, remaining: 0 }),
    pendingCount: async () => 0,
  });

  const { result } = await renderHook(() => useRoutineCheckin(), { wrapper: wrapper(store) });
  let ret: unknown = 'not-set';
  await act(async () => {
    ret = await result.current.check(dto, { wasChecked: false });
  });

  expect(ret).toBeNull();
  expect(notify.error).toHaveBeenCalledTimes(1);
});

test('offline skip: when the engine throws mid-queue, the error is logged and surfaced via notify.error, still returns null', async () => {
  const store = seedStore();
  setOfflineStore(store);
  setSyncEngine({
    enqueue: async () => {
      throw new Error('outbox insert failed');
    },
    flush: async () => ({ flushed: 0, dropped: 0, remaining: 0 }),
    pendingCount: async () => 0,
  });

  const { result } = await renderHook(() => useRoutineCheckin(), { wrapper: wrapper(store) });
  let ret: unknown = 'not-set';
  await act(async () => {
    ret = await result.current.skip({ ...dto, skip: true });
  });

  expect(ret).toBeNull();
  expect(notify.error).toHaveBeenCalledTimes(1);
});
