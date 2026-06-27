/** viewFiltersStore — secure-store round-trip + guards (feat/mobile-quick-create:
 * persist the per-list sort choice across launches). */
const store: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => store[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { store[k] = v; }),
}));

import { loadViewFilters, saveViewFilters } from '../src/lib/viewFiltersStore';
import * as SecureStore from 'expo-secure-store';

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  jest.clearAllMocks();
});

const filters = { categories: 'default', goals: 'name-asc', habits: 'xp-desc', routines: 'default', tasks: 'default' } as never;

test('save then load returns the same prefs', async () => {
  await saveViewFilters(filters);
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('beyou.viewFilters', JSON.stringify(filters));
  expect(await loadViewFilters()).toEqual(filters);
});

test('load returns null when nothing is stored', async () => {
  expect(await loadViewFilters()).toBeNull();
});

test('load returns null on corrupt JSON', async () => {
  store['beyou.viewFilters'] = '{not json';
  expect(await loadViewFilters()).toBeNull();
});
