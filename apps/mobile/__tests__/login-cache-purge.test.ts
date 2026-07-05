jest.mock('../src/offline/db', () => ({
  getDb: jest.fn(async () => ({})),
  getCacheGeneration: jest.fn(() => 0),
  clearOfflineCache: jest.fn(async () => {}),
}));
jest.mock('../src/auth/authApi', () => ({
  loginRequest: jest.fn(),
  registerRequest: jest.fn(),
  refreshRequest: jest.fn(),
  logoutRequest: jest.fn(async () => {}),
  googleMobileLoginRequest: jest.fn(),
}));
jest.mock('../src/auth/secureStore', () => ({
  getRefreshToken: jest.fn(async () => null),
  setRefreshToken: jest.fn(async () => {}),
  clearRefreshToken: jest.fn(async () => {}),
}));
jest.mock('../src/lib/tutorialStore', () => ({
  saveTutorialPhase: jest.fn(async () => {}),
  loadTutorialPhase: jest.fn(async () => null),
}));

import { setLogger } from '@beyou/api';
import { makeStore } from '../src/store';
import { login, googleLogin } from '../src/auth/authSlice';
import { clearOfflineCache } from '../src/offline/db';
import { loginRequest, googleMobileLoginRequest } from '../src/auth/authApi';

const AUTH_OK = {
  accessToken: 'access',
  refreshToken: 'refresh',
  profile: { name: 'Account B' },
};

beforeEach(() => {
  setLogger({ error: () => {} });
  (clearOfflineCache as jest.Mock).mockClear();
});

test('login purges any previous account offline cache before entering', async () => {
  (loginRequest as jest.Mock).mockResolvedValue(AUTH_OK);

  const store = makeStore();
  await store.dispatch(login({ email: 'b@b.com', password: 'secret123456' }));

  expect(store.getState().auth.status).toBe('authenticated');
  expect(clearOfflineCache).toHaveBeenCalledTimes(1);
});

test('google login purges the offline cache too', async () => {
  (googleMobileLoginRequest as jest.Mock).mockResolvedValue(AUTH_OK);

  const store = makeStore();
  await store.dispatch(googleLogin('google-id-token'));

  expect(store.getState().auth.status).toBe('authenticated');
  expect(clearOfflineCache).toHaveBeenCalledTimes(1);
});

test('a failed login does not purge the cache', async () => {
  (loginRequest as jest.Mock).mockRejectedValue(new Error('bad credentials'));

  const store = makeStore();
  await store.dispatch(login({ email: 'b@b.com', password: 'wrong' }));

  expect(store.getState().auth.status).toBe('unauthenticated');
  expect(clearOfflineCache).not.toHaveBeenCalled();
});
