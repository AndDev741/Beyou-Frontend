/**
 * GoogleSignInButton (D3) — REAL render + real googleLogin thunk.
 *
 * Drives the native sign-in mock (GoogleSignin.signIn / isSuccessResponse) and the
 * network boundary (authApi.googleMobileLoginRequest), asserting the redux auth
 * state and notify side effects. The native module is globally mocked in
 * jest.setup.js; here we override per case.
 */

const mockGoogleRequest = jest.fn();
jest.mock('../src/auth/authApi', () => ({
  googleMobileLoginRequest: (...a: unknown[]) => mockGoogleRequest(...a),
  loginRequest: jest.fn(),
  registerRequest: jest.fn(),
  refreshRequest: jest.fn(),
  logoutRequest: jest.fn(),
}));

jest.mock('../src/notify', () => ({
  notify: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

jest.mock('../src/lib/nativeHttpClient', () => ({
  nativeHttpClient: {},
  setAccessToken: jest.fn(),
  setRefreshHandler: jest.fn(),
  setOnUnauthenticated: jest.fn(),
}));

import { Provider } from 'react-redux';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { notify } from '../src/notify';
import '../src/i18n';
import GoogleSignInButton from '../src/ui/GoogleSignInButton';

const mockSignIn = GoogleSignin.signIn as jest.Mock;
const mockSignOut = GoogleSignin.signOut as jest.Mock;
const mockIsSuccess = isSuccessResponse as unknown as jest.Mock;

let store: ReturnType<typeof makeStore>;

const renderButton = async () =>
  render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <GoogleSignInButton />
      </BeyouThemeProvider>
    </Provider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  store = makeStore();
});

const press = async (screen: Awaited<ReturnType<typeof renderButton>>) => {
  await act(async () => {
    fireEvent.press(screen.getByTestId('google-signin-button'));
  });
};

describe('GoogleSignInButton', () => {
  it('signs in: exchanges the ID token and authenticates', async () => {
    mockSignIn.mockResolvedValueOnce({ type: 'success', data: { idToken: 'gid-123' } });
    mockIsSuccess.mockReturnValue(true);
    mockGoogleRequest.mockResolvedValueOnce({ accessToken: 'jwt', refreshToken: 'refresh', profile: { name: 'Al' } });

    const screen = await renderButton();
    await press(screen);

    expect(mockGoogleRequest).toHaveBeenCalledWith('gid-123');
    await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'));
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('drops the cached account before asking, so the picker comes back every time', async () => {
    mockSignIn.mockResolvedValueOnce({ type: 'success', data: { idToken: 'gid-123' } });
    mockIsSuccess.mockReturnValue(true);
    mockGoogleRequest.mockResolvedValueOnce({ accessToken: 'jwt', refreshToken: 'refresh', profile: { name: 'Al' } });

    const screen = await renderButton();
    await press(screen);

    // Android's legacy Google Sign-In resolves getSignInIntent() from the account it
    // cached on the first success and draws no picker at all after that. The order is
    // the whole assertion: clearing afterwards would arrive too late for this tap, and
    // the person stuck on the wrong account would still be stuck.
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockSignOut.mock.invocationCallOrder[0]).toBeLessThan(mockSignIn.mock.invocationCallOrder[0]);
  });

  it('signs in anyway when dropping the cached account fails', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('client not configured yet'));
    mockSignIn.mockResolvedValueOnce({ type: 'success', data: { idToken: 'gid-123' } });
    mockIsSuccess.mockReturnValue(true);
    mockGoogleRequest.mockResolvedValueOnce({ accessToken: 'jwt', refreshToken: 'refresh', profile: { name: 'Al' } });

    const screen = await renderButton();
    await press(screen);

    // Losing the picker is a worse day than it used to be; losing the sign-in is a
    // broken app. This one degrades to the old behaviour rather than to nothing.
    await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'));
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('cancellation is a silent no-op', async () => {
    mockSignIn.mockResolvedValueOnce({ type: 'cancelled', data: null });
    mockIsSuccess.mockReturnValue(false);

    const screen = await renderButton();
    await press(screen);

    expect(mockGoogleRequest).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('shows an error when the native sign-in throws', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('play services missing'));

    const screen = await renderButton();
    await press(screen);

    expect(notify.error).toHaveBeenCalled();
    expect(mockGoogleRequest).not.toHaveBeenCalled();
  });

  it('shows an error when the success response has no ID token', async () => {
    mockSignIn.mockResolvedValueOnce({ type: 'success', data: { idToken: null } });
    mockIsSuccess.mockReturnValue(true);

    const screen = await renderButton();
    await press(screen);

    expect(notify.error).toHaveBeenCalled();
    expect(mockGoogleRequest).not.toHaveBeenCalled();
  });

  it('shows an error when the backend rejects the ID token', async () => {
    mockSignIn.mockResolvedValueOnce({ type: 'success', data: { idToken: 'gid-123' } });
    mockIsSuccess.mockReturnValue(true);
    mockGoogleRequest.mockRejectedValueOnce(new Error('401'));

    const screen = await renderButton();
    await press(screen);

    expect(notify.error).toHaveBeenCalled();
    expect(store.getState().auth.status).not.toBe('authenticated');
  });
});
