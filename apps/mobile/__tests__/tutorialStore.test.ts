const store: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => store[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { store[k] = v; }),
  deleteItemAsync: jest.fn(async (k: string) => { delete store[k]; }),
}));
import { loadTutorialPhase, saveTutorialPhase } from '../src/lib/tutorialStore';

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; jest.clearAllMocks(); });

test('save then load round-trips a phase', async () => {
  await saveTutorialPhase('categories');
  expect(await loadTutorialPhase()).toBe('categories');
});
test('load returns null when empty', async () => {
  expect(await loadTutorialPhase()).toBeNull();
});
test('saving null clears the key', async () => {
  await saveTutorialPhase('intro');
  await saveTutorialPhase(null);
  expect(await loadTutorialPhase()).toBeNull();
});
test('load returns null for an unknown stored value', async () => {
  store['beyou.tutorial.phase'] = 'bogus';
  expect(await loadTutorialPhase()).toBeNull();
});
