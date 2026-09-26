/**
 * The device's copy of the last theme, read while the splash is still up. The splash waits for
 * this read, so the one rule that matters is that it always answers.
 */
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

import * as SecureStore from 'expo-secure-store';
import { loadSavedTheme, saveTheme } from '../src/lib/themeStore';

const getItem = SecureStore.getItemAsync as jest.Mock;

afterEach(() => {
  jest.useRealTimers();
  getItem.mockReset();
});

it('returns what was saved', async () => {
  getItem.mockResolvedValue('dark:beyou');
  await expect(loadSavedTheme()).resolves.toBe('dark:beyou');
  expect(getItem).toHaveBeenCalledWith('beyou.theme');
});

it('returns null on first launch and when the store throws', async () => {
  getItem.mockResolvedValueOnce(null);
  await expect(loadSavedTheme()).resolves.toBeNull();
  getItem.mockRejectedValueOnce(new Error('keystore locked'));
  await expect(loadSavedTheme()).resolves.toBeNull();
});

it('gives up on a read that never answers, so the splash cannot hang on it', async () => {
  jest.useFakeTimers();
  getItem.mockReturnValue(new Promise(() => {}));
  const pending = loadSavedTheme();
  jest.advanceTimersByTime(1000);
  await expect(pending).resolves.toBeNull();
});

it('writes under the same key it reads', async () => {
  await saveTheme('light:sunset');
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('beyou.theme', 'light:sunset');
});
