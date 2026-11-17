/**
 * AppleSignInButton — real render + real appleLogin thunk.
 *
 * Drives the native Apple sheet mock (signInAsync, globally mocked in jest.setup.js) and
 * the network boundary (authApi.appleMobileLoginRequest), asserting the redux auth state
 * and notify side effects, plus the nonce contract the backend checks.
 */

const mockAppleRequest = jest.fn();
jest.mock('../src/auth/authApi', () => ({
  appleMobileLoginRequest: (...a: unknown[]) => mockAppleRequest(...a),
  googleMobileLoginRequest: jest.fn(),
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
import * as AppleAuthentication from 'expo-apple-authentication';
import { ApiError } from '@beyou/api';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { notify } from '../src/notify';
import '../src/i18n';
import AppleSignInButton from '../src/ui/AppleSignInButton';
import SocialSignIn from '../src/ui/auth/SocialSignIn';

const mockSignInAsync = AppleAuthentication.signInAsync as jest.Mock;
const mockIsAvailable = AppleAuthentication.isAvailableAsync as jest.Mock;

let store: ReturnType<typeof makeStore>;

const renderInApp = (node: React.ReactElement) =>
  render(
    <Provider store={store}>
      <BeyouThemeProvider>{node}</BeyouThemeProvider>
    </Provider>,
  );

const press = async (screen: Awaited<ReturnType<typeof renderInApp>>) => {
  await act(async () => {
    fireEvent.press(screen.getByTestId('apple-signin-button'));
  });
};

const CREDENTIAL = {
  user: '001234.abc.0987',
  identityToken: 'apple-identity-token',
  authorizationCode: 'apple-code',
  fullName: { givenName: 'Ana', familyName: 'Silva' },
  email: 'ana@example.test',
};

beforeEach(() => {
  jest.clearAllMocks();
  store = makeStore();
});

describe('AppleSignInButton', () => {
  it('signs in: sends the token, the RAW nonce and the first-time name, then authenticates', async () => {
    mockSignInAsync.mockResolvedValueOnce(CREDENTIAL);
    mockAppleRequest.mockResolvedValueOnce({ accessToken: 'jwt', refreshToken: 'refresh', profile: { name: 'Ana' } });

    const screen = await renderInApp(<AppleSignInButton />);
    await press(screen);

    // Apple gets the hash; the backend gets the raw value and recomputes the hash.
    const raw = '00000000-0000-4000-8000-00000000000000000000-0000-4000-8000-000000000000';
    expect(mockSignInAsync).toHaveBeenCalledWith(expect.objectContaining({ nonce: `sha256(${raw})` }));
    expect(mockAppleRequest).toHaveBeenCalledWith({
      identityToken: 'apple-identity-token',
      nonce: raw,
      authorizationCode: 'apple-code',
      givenName: 'Ana',
      familyName: 'Silva',
    });
    await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'));
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('closing the Apple sheet is a silent no-op', async () => {
    mockSignInAsync.mockRejectedValueOnce(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }));

    const screen = await renderInApp(<AppleSignInButton />);
    await press(screen);

    expect(mockAppleRequest).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('a native failure shows the Apple error', async () => {
    mockSignInAsync.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'ERR_REQUEST_FAILED' }));

    const screen = await renderInApp(<AppleSignInButton />);
    await press(screen);

    expect(notify.error).toHaveBeenCalledWith('Could not sign in with Apple. Please try again.');
  });

  it('a backend refusal for an unverified password account names the fixable problem', async () => {
    mockSignInAsync.mockResolvedValueOnce(CREDENTIAL);
    mockAppleRequest.mockRejectedValueOnce(new ApiError(403, { error: 'EMAIL_NOT_VERIFIED' }, 'forbidden'));

    const screen = await renderInApp(<AppleSignInButton />);
    await press(screen);

    await waitFor(() => expect(store.getState().auth.needsVerification).toBe(true));
    expect(notify.error).toHaveBeenCalledWith('Please verify your email before logging in');
  });
});

describe('SocialSignIn', () => {
  it('shows the Apple button once iOS says Sign in with Apple is available', async () => {
    mockIsAvailable.mockResolvedValueOnce(true);

    const screen = await renderInApp(<SocialSignIn />);

    await waitFor(() => expect(screen.getByTestId('apple-signin-button')).toBeTruthy());
    // No EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in this run: Google cannot finish on iOS, so it
    // is not offered rather than offered broken.
    expect(screen.queryByTestId('google-signin-button')).toBeNull();
  });

  it('renders nothing at all when no alternative is available', async () => {
    mockIsAvailable.mockResolvedValueOnce(false);

    const screen = await renderInApp(<SocialSignIn />);

    await waitFor(() => expect(mockIsAvailable).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByTestId('social-sign-in')).toBeNull();
  });
});
