/**
 * What signing out takes with it.
 *
 * The thunk is the only teardown this app has: it revokes the refresh token, drops the
 * access token and clears the two things kept outside redux. Both of those live in
 * SecureStore under their own keys, written by modules that know nothing about auth, so
 * nothing about the type system connects them to this thunk. They were added one at a
 * time, and the second one was missing for a while — the AI wizard's progress carries
 * the names of the categories and habits it created, and it survived a logout on a
 * device that might well be handed to someone else.
 *
 * Deleting an account ends here too, which is what makes it worth pinning: the delete
 * flow finishes by dispatching this.
 */
jest.mock('../src/auth/authApi', () => ({
  loginRequest: jest.fn(),
  registerRequest: jest.fn(),
  refreshRequest: jest.fn(),
  googleMobileLoginRequest: jest.fn(),
  logoutRequest: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/auth/secureStore', () => ({
  getRefreshToken: jest.fn().mockResolvedValue('a-stored-refresh-token'),
  setRefreshToken: jest.fn().mockResolvedValue(undefined),
  clearRefreshToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/lib/tutorialStore', () => ({
  loadTutorialPhase: jest.fn().mockResolvedValue(null),
  saveTutorialPhase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/lib/aiOnboardingStore', () => ({
  loadWizardProgress: jest.fn().mockResolvedValue(null),
  saveWizardProgress: jest.fn().mockResolvedValue(undefined),
  clearWizardProgress: jest.fn().mockResolvedValue(undefined),
}));

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { logout } from '../src/auth/authSlice';
import { makeStore } from '../src/store';
import * as secureStore from '../src/auth/secureStore';
import { logoutRequest } from '../src/auth/authApi';
import { saveTutorialPhase } from '../src/lib/tutorialStore';
import { clearWizardProgress } from '../src/lib/aiOnboardingStore';

beforeEach(() => {
  jest.clearAllMocks();
  (secureStore.getRefreshToken as jest.Mock).mockResolvedValue('a-stored-refresh-token');
});

it('revokes the token server-side and clears it locally', async () => {
  const store = makeStore();

  await store.dispatch(logout());

  expect(logoutRequest).toHaveBeenCalledWith('a-stored-refresh-token');
  expect(secureStore.clearRefreshToken).toHaveBeenCalled();
  expect(store.getState().auth.status).toBe('unauthenticated');
});

it('takes the tutorial phase and the AI wizard progress with it', async () => {
  const store = makeStore();

  await store.dispatch(logout());

  // Neither is redux state, so nothing else in the app would clear them. Leaving the
  // wizard progress behind hands the next person the names of the categories and
  // habits it created for the account that just left.
  expect(saveTutorialPhase).toHaveBeenCalledWith(null);
  expect(clearWizardProgress).toHaveBeenCalled();
});

it('signs the device out of Google as well', async () => {
  const store = makeStore();

  await store.dispatch(logout());

  // Not redux, not SecureStore — this one lives in Play Services' own store for the
  // app. Android answers the next sign-in with the account cached here and skips the
  // picker entirely, so leaving it behind is how someone ends up unable to reach their
  // own second account without wiping the app.
  expect(GoogleSignin.signOut).toHaveBeenCalled();
});

it('finishes the logout even when Google refuses to sign out', async () => {
  (GoogleSignin.signOut as jest.Mock).mockRejectedValueOnce(new Error('client not configured'));
  const store = makeStore();

  await store.dispatch(logout());

  // This is the last await in the thunk, so an unhandled rejection here would reject
  // the thunk, skip `logout.fulfilled` and leave the app believing it is still signed
  // in — a much bigger failure than the one it was reacting to.
  expect(secureStore.clearRefreshToken).toHaveBeenCalled();
  expect(store.getState().auth.status).toBe('unauthenticated');
});

it('still clears local state when the server call fails', async () => {
  (logoutRequest as jest.Mock).mockRejectedValueOnce(new Error('no network'));
  const store = makeStore();

  await store.dispatch(logout());

  // A phone with no signal must still end up signed out locally.
  expect(secureStore.clearRefreshToken).toHaveBeenCalled();
  expect(clearWizardProgress).toHaveBeenCalled();
  expect(store.getState().auth.status).toBe('unauthenticated');
});
