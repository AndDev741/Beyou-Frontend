// Each jest.mock() factory is fully self-contained (no reference to an
// out-of-scope variable): babel-plugin-jest-hoist moves jest.mock() calls to
// the very top of the file (above every import, including this file's own
// `import { makeStore } from '../src/store'`, which transitively requires all
// six of these @beyou/api modules through packages/api/src/index.ts). A shared
// `const mockFailing = () => (...)` referenced from these factories is NOT
// safe here — hoisting reorders the jest.mock() calls but leaves the const
// declaration in place, so the factory would run against an uninitialized
// binding the first time one of these modules is required.
jest.mock('@beyou/api/user/getProfile', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ error: 'offline' })),
}));
jest.mock('@beyou/api/routine/getTodayRoutine', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ error: 'offline' })),
}));
jest.mock('@beyou/api/habits/getHabits', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ error: 'offline' })),
}));
jest.mock('@beyou/api/tasks/getTasks', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ error: 'offline' })),
}));
jest.mock('@beyou/api/goals/getGoals', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ error: 'offline' })),
}));
jest.mock('@beyou/api/categories/getCategories', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ error: 'offline' })),
}));

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
    readKV: jest.fn(async () => null),
    readCollection: jest.fn(async () => []),
    writeKV: jest.fn(async () => {}),
    writeCollection: jest.fn(async () => {}),
  };
});

import { render, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { useDashboardData } from '../src/dashboard/useDashboardData';
import type { DashboardData } from '../src/dashboard/useDashboardData';
import { localDateKey, readCollection, readKV, writeCollection, writeKV } from '@beyou/offline';
import getHabits from '@beyou/api/habits/getHabits';
import getTodayRoutine from '@beyou/api/routine/getTodayRoutine';
import { getDb } from '../src/offline/db';

let hookResult: DashboardData;
function Harness() {
  hookResult = useDashboardData();
  return null;
}

const renderHook = async () => {
  const store = makeStore();
  await act(async () => {
    render(
      <Provider store={store}>
        <Harness />
      </Provider>
    );
  });
  return store;
};

beforeEach(() => {
  setLogger({ error: () => {} });
  (getDb as jest.Mock).mockReset().mockResolvedValue({});
  (readCollection as jest.Mock).mockReset().mockResolvedValue([]);
  (readKV as jest.Mock).mockReset().mockResolvedValue(null);
  (writeCollection as jest.Mock).mockReset().mockResolvedValue(undefined);
  (writeKV as jest.Mock).mockReset().mockResolvedValue(undefined);
  (getHabits as jest.Mock).mockReset().mockResolvedValue({ error: 'offline' });
  (getTodayRoutine as jest.Mock).mockReset().mockResolvedValue({ error: 'offline' });
});

test('hydrates habits from the SQLite cache when every fetch fails (offline boot)', async () => {
  (readCollection as jest.Mock).mockImplementation(async (_db: unknown, table: string) =>
    table === 'habits' ? [{ id: 'h1', name: 'Cached habit' }] : []
  );
  const store = await renderHook();
  await waitFor(() => expect(store.getState().habits.habits).toHaveLength(1));
  expect(store.getState().habits.habits[0].name).toBe('Cached habit');

  await waitFor(() => expect(hookResult.loading).toBe(false));
  expect(hookResult.error).toBeNull();
});

test('persists fresh habits to the cache after a successful fetch', async () => {
  (getHabits as jest.Mock).mockResolvedValue({ success: [{ id: 'h2', name: 'Fresh habit' }] });
  const store = await renderHook();
  await waitFor(() =>
    expect(writeCollection).toHaveBeenCalledWith(expect.anything(), 'habits', [
      { id: 'h2', name: 'Fresh habit' },
    ])
  );
  expect(store.getState().habits.habits[0].name).toBe('Fresh habit');
});

test('falls back to network-only (no write-throughs) when getDb() rejects', async () => {
  (getDb as jest.Mock).mockRejectedValueOnce(new Error('sqlite init failed'));
  (getHabits as jest.Mock).mockResolvedValue({ success: [{ id: 'h3', name: 'Network habit' }] });
  const store = await renderHook();

  await waitFor(() => expect(store.getState().habits.habits).toHaveLength(1));
  expect(store.getState().habits.habits[0].name).toBe('Network habit');
  await waitFor(() => expect(hookResult.loading).toBe(false));
  expect(hookResult.error).toBeNull();
  expect(writeCollection).not.toHaveBeenCalled();
});

test('a stage-1 cache read failure degrades to a cold cache — the network fetch still loads', async () => {
  (readCollection as jest.Mock).mockRejectedValue(new Error('disk I/O error'));
  (getHabits as jest.Mock).mockResolvedValue({ success: [{ id: 'h9', name: 'Net habit' }] });
  const store = await renderHook();

  await waitFor(() => expect(store.getState().habits.habits).toHaveLength(1));
  expect(store.getState().habits.habits[0].name).toBe('Net habit');
  await waitFor(() => expect(hookResult.loading).toBe(false));
  expect(hookResult.error).toBeNull();
});

test('stage-1 date guard: a cached todayRoutine from another day is not dispatched', async () => {
  (readKV as jest.Mock).mockImplementation(async (_db: unknown, key: string) =>
    key === 'todayRoutine' ? { date: '2000-01-01', routine: { id: 'r-stale', name: 'Stale' } } : null
  );
  const store = await renderHook();
  await waitFor(() => expect(hookResult.loading).toBe(false));
  expect(store.getState().todayRoutine.routine).toBeNull();
});

test('stage-1 date guard: a cached todayRoutine from today IS dispatched', async () => {
  const cachedRoutine = { id: 'r-today', name: 'Todays routine' };
  (readKV as jest.Mock).mockImplementation(async (_db: unknown, key: string) =>
    key === 'todayRoutine' ? { date: localDateKey(), routine: cachedRoutine } : null
  );
  const store = await renderHook();
  await waitFor(() => expect(store.getState().todayRoutine.routine?.id).toBe('r-today'));
});

test('server-null day clears a stale cached todayRoutine and persists routine: null', async () => {
  const cachedRoutine = { id: 'r-old', name: 'Stale morning routine' };
  (readKV as jest.Mock).mockImplementation(async (_db: unknown, key: string) =>
    key === 'todayRoutine' ? { date: localDateKey(), routine: cachedRoutine } : null
  );
  (getTodayRoutine as jest.Mock).mockResolvedValue({ success: null });
  const store = await renderHook();

  await waitFor(() => expect(hookResult.loading).toBe(false));
  expect(store.getState().todayRoutine.routine).toBeNull();
  expect(writeKV).toHaveBeenCalledWith(expect.anything(), 'todayRoutine', {
    date: localDateKey(),
    routine: null,
  });
});
