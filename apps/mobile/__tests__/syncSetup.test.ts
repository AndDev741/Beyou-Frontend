jest.mock('@beyou/api/habits/createHabit', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: [{ id: 'server' }] })),
}));
jest.mock('@beyou/api/routine/checkItem', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: undefined })),
}));
jest.mock('@beyou/api/goals/increaseCurrentValue', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ id: 'g1', currentValue: 1 })),
}));

import '../src/i18n';
import { setLogger } from '@beyou/api';
import { makeStore } from '../src/store';
import { hydratePerfil } from '@beyou/state/user/perfilSlice';
import { buildHandlers, flushOutbox } from '../src/offline/syncSetup';
import { setSyncEngine } from '../src/offline/mutations';
import createHabit from '@beyou/api/habits/createHabit';
import checkRoutine from '@beyou/api/routine/checkItem';
import increaseCurrentValue from '@beyou/api/goals/increaseCurrentValue';
import type { OutboxOp } from '@beyou/offline';
import type { RefreshUI } from '@beyou/types/refreshUi/refreshUi.type';

const op = { id: 1, opType: 'test', payload: null, entityId: null, createdAt: '', attempts: 0, lastError: null } as OutboxOp;

beforeEach(() => {
  setLogger({ error: () => {} });
  jest.clearAllMocks();
});

test('habit.create invokes createHabit with the registry payload in positional order + client id, ok:true on success', async () => {
  const store = makeStore();
  const handlers = buildHandlers(store);

  const result = await handlers['habit.create'](
    { id: 'client-id', name: 'Run', description: 'd', motivationalPhrase: 'm', importance: 3, dificulty: 4, iconId: 'lucide:zap', experience: 0, categoriesId: [] },
    op,
  );

  expect(createHabit).toHaveBeenCalledWith('Run', 'd', 'm', 3, 4, 'lucide:zap', 0, [], expect.anything(), 'client-id');
  expect(result).toEqual({ ok: true });
});

test('habit.create returns ok:false when the api resolves {error}', async () => {
  (createHabit as jest.Mock).mockResolvedValueOnce({ error: { message: 'x' } });
  const store = makeStore();
  const handlers = buildHandlers(store);

  const result = await handlers['habit.create'](
    { id: 'client-id', name: 'Run', description: 'd', motivationalPhrase: 'm', importance: 3, dificulty: 4, iconId: 'lucide:zap', experience: 0, categoriesId: [] },
    op,
  );

  expect(result.ok).toBe(false);
});

test('habit.create returns ok:false (not ok:true) when the api resolves {validation} — a server-side validation rejection must not be treated as a synced success', async () => {
  (createHabit as jest.Mock).mockResolvedValueOnce({ validation: 'Name already in use' });
  const store = makeStore();
  const handlers = buildHandlers(store);

  const result = await handlers['habit.create'](
    { id: 'client-id', name: 'Run', description: 'd', motivationalPhrase: 'm', importance: 3, dificulty: 4, iconId: 'lucide:zap', experience: 0, categoriesId: [] },
    op,
  );

  expect(result).toEqual({ ok: false, error: 'Name already in use' });
});

test('routine.check calls checkRoutine(dto, t, date) and applies the returned RefreshUI to the store', async () => {
  const refreshUiFixture: RefreshUI = {
    refreshUser: {
      xp: 50,
      level: 2,
      currentConstance: 1,
      alreadyIncreaseConstanceToday: true,
      maxConstance: 1,
      actualLevelXp: 10,
      nextLevelXp: 100,
    },
  };
  (checkRoutine as jest.Mock).mockResolvedValueOnce({ success: refreshUiFixture });
  const store = makeStore();
  store.dispatch(hydratePerfil({ name: 'A', xp: 0, level: 1, constance: 0, actualLevelXp: 0, nextLevelXp: 100 }));
  const handlers = buildHandlers(store);
  const dto = { routineId: 'r1', habitGroupDTO: { habitGroupId: 'hg1', startTime: '08:00' } };

  const result = await handlers['routine.check']({ dto, date: '2026-07-04' }, op);

  expect(checkRoutine).toHaveBeenCalledWith(dto, expect.anything(), '2026-07-04');
  expect(result).toEqual({ ok: true });
  expect(store.getState().perfil.xp).toBe(50);
});

test('goal.increase returns {ok:false, error} when increaseCurrentValue throws', async () => {
  (increaseCurrentValue as jest.Mock).mockRejectedValueOnce(new Error('boom'));
  const store = makeStore();
  const handlers = buildHandlers(store);

  const result = await handlers['goal.increase']({ id: 'g1' }, op);

  expect(result).toEqual({ ok: false, error: 'boom' });
});

test('flushOutbox contains a driver-level flush failure instead of rejecting — a trigger site must never crash', async () => {
  setSyncEngine({
    enqueue: async () => {},
    flush: async () => {
      throw new Error('driver exploded');
    },
    pendingCount: async () => 0,
  });

  await expect(flushOutbox()).resolves.toBeUndefined();
});
