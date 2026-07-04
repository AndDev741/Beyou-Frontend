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

import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import '../src/i18n';
import { makeStore } from '../src/store';
import { useDashboardData } from '../src/dashboard/useDashboardData';
import { readCollection, writeCollection } from '@beyou/offline';
import getHabits from '@beyou/api/habits/getHabits';

function Harness() {
  useDashboardData();
  return null;
}

beforeEach(() => {
  (readCollection as jest.Mock).mockReset().mockResolvedValue([]);
  (getHabits as jest.Mock).mockReset().mockResolvedValue({ error: 'offline' });
});

test('hydrates habits from the SQLite cache when every fetch fails (offline boot)', async () => {
  (readCollection as jest.Mock).mockImplementation(async (_db: unknown, table: string) =>
    table === 'habits' ? [{ id: 'h1', name: 'Cached habit' }] : []
  );
  const store = makeStore();
  render(
    <Provider store={store}>
      <Harness />
    </Provider>
  );
  await waitFor(() => expect(store.getState().habits.habits).toHaveLength(1));
  expect(store.getState().habits.habits[0].name).toBe('Cached habit');
});

test('persists fresh habits to the cache after a successful fetch', async () => {
  (getHabits as jest.Mock).mockResolvedValue({ success: [{ id: 'h2', name: 'Fresh habit' }] });
  const store = makeStore();
  render(
    <Provider store={store}>
      <Harness />
    </Provider>
  );
  await waitFor(() =>
    expect(writeCollection).toHaveBeenCalledWith(expect.anything(), 'habits', [
      { id: 'h2', name: 'Fresh habit' },
    ])
  );
  expect(store.getState().habits.habits[0].name).toBe('Fresh habit');
});
