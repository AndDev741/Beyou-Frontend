jest.mock('../src/offline/db', () => ({
  getDb: jest.fn(async () => ({})),
  getCacheGeneration: jest.fn(() => 0),
  clearOfflineCache: jest.fn(async () => {}),
}));
jest.mock('@beyou/offline', () => {
  const actual = jest.requireActual('@beyou/offline');
  return { __esModule: true, ...actual, readKV: jest.fn(async () => null) };
});
jest.mock('../src/auth/authApi', () => ({
  loginRequest: jest.fn(),
  registerRequest: jest.fn(),
  refreshRequest: jest.fn(),
  logoutRequest: jest.fn(async () => {}),
  googleMobileLoginRequest: jest.fn(),
}));
jest.mock('../src/auth/secureStore', () => ({
  getRefreshToken: jest.fn(async () => 'stored-refresh-token'),
  setRefreshToken: jest.fn(async () => {}),
  clearRefreshToken: jest.fn(async () => {}),
}));
jest.mock('../src/lib/tutorialStore', () => ({
  saveTutorialPhase: jest.fn(async () => {}),
  loadTutorialPhase: jest.fn(async () => null),
}));

import { ApiError, setLogger } from '@beyou/api';
import { makeStore } from '../src/store';
import { bootstrap } from '../src/auth/authSlice';
import { refreshRequest } from '../src/auth/authApi';
import * as secureStore from '../src/auth/secureStore';
import { readKV } from '@beyou/offline';

beforeEach(() => {
  setLogger({ error: () => {} });
  (refreshRequest as jest.Mock).mockReset();
  (secureStore.clearRefreshToken as jest.Mock).mockClear();
  (readKV as jest.Mock).mockReset().mockResolvedValue(null);
});

test('offline boot: network failure + cached profile enters authenticated without clearing the token', async () => {
  (refreshRequest as jest.Mock).mockRejectedValue(new ApiError(0, undefined, 'Network request failed'));
  (readKV as jest.Mock).mockResolvedValue({ name: 'Cached User' });

  const store = makeStore();
  await store.dispatch(bootstrap());

  expect(store.getState().auth.status).toBe('authenticated');
  expect((store.getState().auth.profile as { name?: string } | null)?.name).toBe('Cached User');
  expect(secureStore.clearRefreshToken).not.toHaveBeenCalled();
});

test('token rejected (401): refresh token is cleared and user goes back to login', async () => {
  (refreshRequest as jest.Mock).mockRejectedValue(new ApiError(401, undefined, 'Unauthorized'));

  const store = makeStore();
  await store.dispatch(bootstrap());

  expect(store.getState().auth.status).toBe('unauthenticated');
  expect(secureStore.clearRefreshToken).toHaveBeenCalledTimes(1);
});

test('network failure with no cached profile: unauthenticated but the token survives for the next boot', async () => {
  (refreshRequest as jest.Mock).mockRejectedValue(new ApiError(0, undefined, 'Network request failed'));

  const store = makeStore();
  await store.dispatch(bootstrap());

  expect(store.getState().auth.status).toBe('unauthenticated');
  expect(secureStore.clearRefreshToken).not.toHaveBeenCalled();
});

test('server error (500) is not a token rejection: token survives', async () => {
  (refreshRequest as jest.Mock).mockRejectedValue(new ApiError(500, undefined, 'HTTP 500'));

  const store = makeStore();
  await store.dispatch(bootstrap());

  expect(secureStore.clearRefreshToken).not.toHaveBeenCalled();
});
