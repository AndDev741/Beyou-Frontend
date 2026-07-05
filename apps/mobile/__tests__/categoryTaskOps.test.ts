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
jest.mock('@beyou/api/categories/createCategory', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: [{ id: 'server' }] })),
}));
jest.mock('@beyou/api/categories/editCategory', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: [] })),
}));
jest.mock('@beyou/api/categories/deleteCategory', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: [] })),
}));
jest.mock('@beyou/api/tasks/createTask', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: [{ id: 'server' }] })),
}));
jest.mock('@beyou/api/tasks/editTask', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: [] })),
}));
jest.mock('@beyou/api/tasks/deleteTask', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: [] })),
}));

import { setLogger } from '@beyou/api';
import '../src/i18n';
import i18n from '../src/i18n';
import { makeStore } from '../src/store';
import { setOnline } from '../src/offline/connectivitySlice';
import { enterTasks } from '@beyou/state/task/tasksSlice';
import { setOfflineStore, setSyncEngine } from '../src/offline/mutations';
import { createCategoryOffline } from '../src/offline/ops/categoryOps';
import { createTaskOffline, deleteTaskOffline } from '../src/offline/ops/taskOps';
import { upsertRow, deleteRow } from '@beyou/offline';
import createCategory from '@beyou/api/categories/createCategory';
import type category from '@beyou/types/category/categoryType';
import type { task } from '@beyou/types/tasks/taskType';

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

test('offline create category: optimistic redux row + mirror upsert + queued op', async () => {
  const store = makeStore();
  store.dispatch(setOnline(false));
  setOfflineStore(store);
  const enqueued = makeEngine();

  const res = await createCategoryOffline('Health', 'd', 0, 'lucide:heart', t);

  expect(createCategory).not.toHaveBeenCalled();
  expect(res.queued).toBe(true);
  const categories = store.getState().categories.categories as category[];
  expect(categories).toHaveLength(1);
  expect(categories[0].name).toBe('Health');
  expect(categories[0].id).toMatch(/^[0-9a-f]{8}-/);
  expect(upsertRow).toHaveBeenCalledWith(expect.anything(), 'categories', expect.objectContaining({ name: 'Health' }));
  expect(enqueued[0].opType).toBe('category.create');
  expect(enqueued[0].payload).toEqual({
    id: categories[0].id,
    name: 'Health',
    description: 'd',
    experience: 0,
    icon: 'lucide:heart',
  });
});

test('offline delete task: removes from redux + mirror + queues the op', async () => {
  const store = makeStore();
  store.dispatch(setOnline(false));
  store.dispatch(enterTasks([{ id: 't1' } as unknown as task]));
  setOfflineStore(store);
  const enqueued = makeEngine();

  const res = await deleteTaskOffline('t1', t);

  expect(res.queued).toBe(true);
  expect(store.getState().tasks.tasks).toHaveLength(0);
  expect(deleteRow).toHaveBeenCalledWith(expect.anything(), 'tasks', 't1');
  expect(enqueued[0]).toEqual({ opType: 'task.delete', payload: { id: 't1' } });
});

test('offline create task: optimistic redux row + queued op keeps the registry payload shape', async () => {
  const store = makeStore();
  store.dispatch(setOnline(false));
  setOfflineStore(store);
  const enqueued = makeEngine();

  const res = await createTaskOffline('Water', '', 'lucide:cup', [], t, 2, 2, false);

  expect(res.queued).toBe(true);
  const tasks = store.getState().tasks.tasks as task[];
  expect(tasks).toHaveLength(1);
  expect(tasks[0].name).toBe('Water');
  expect(enqueued[0].opType).toBe('task.create');
  expect(enqueued[0].payload).toEqual({
    id: tasks[0].id,
    name: 'Water',
    description: '',
    iconId: 'lucide:cup',
    categoriesId: [],
    importance: 2,
    difficulty: 2,
    oneTimeTask: false,
  });
});

test('online: createCategoryOffline delegates to the mocked api and enqueues nothing', async () => {
  const store = makeStore();
  store.dispatch(setOnline(true));
  setOfflineStore(store);
  const enqueued = makeEngine();

  await createCategoryOffline('Health', 'd', 0, 'lucide:heart', t);

  expect(createCategory).toHaveBeenCalled();
  expect(enqueued).toHaveLength(0);
});
