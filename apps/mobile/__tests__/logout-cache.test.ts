import { makeStore } from '../src/store';
import { logout } from '../src/auth/authSlice';
import { clearOfflineCache } from '../src/offline/db';

jest.mock('../src/offline/db', () => ({
  getDb: jest.fn(),
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
  getRefreshToken: jest.fn(async () => 'token'),
  setRefreshToken: jest.fn(async () => {}),
  clearRefreshToken: jest.fn(async () => {}),
}));
jest.mock('../src/lib/tutorialStore', () => ({
  saveTutorialPhase: jest.fn(async () => {}),
  loadTutorialPhase: jest.fn(async () => null),
}));

test('logout purges the offline SQLite cache', async () => {
  const store = makeStore();
  await store.dispatch(logout());
  expect(clearOfflineCache).toHaveBeenCalledTimes(1);
});
