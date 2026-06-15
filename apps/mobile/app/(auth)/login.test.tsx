/**
 * Branded login screen (P2-T7) — REAL render test.
 *
 * Renders LoginRoute inside the real Redux <Provider store> + real
 * <BeyouThemeProvider> + real i18n (src/i18n) so the screen is exercised with
 * its true wiring. Only the leaf boundaries are mocked:
 *   - ../../src/auth/authApi   -> loginRequest can resolve (success) or reject (ApiError)
 *   - ../../src/notify         -> assert notify.error is called on failure
 *   - expo-router useRouter    -> Forgot link / navigation primitives
 *   - expo-secure-store        -> setRefreshToken on the success path
 *   - react-native-safe-area-context -> pass-through (real provider waits on a layout frame)
 *
 * The login thunk maps a thrown ApiError to a rejected payload
 * ('INVALID_CREDENTIALS'); the screen turns that into notify.error(t('WrongPassOrEmailError')).
 */

import { ApiError } from '@beyou/api';

// Network boundary: the screen -> login thunk -> loginRequest. Mock it so the
// thunk's try/catch resolves or rejects deterministically without real fetch.
const mockLoginRequest = jest.fn();
jest.mock('../../src/auth/authApi', () => ({
  loginRequest: (...args: unknown[]) => mockLoginRequest(...args),
  registerRequest: jest.fn(),
  refreshRequest: jest.fn(),
  logoutRequest: jest.fn(),
}));

// Toast boundary: assert error surfacing without loading react-native-toast-message.
jest.mock('../../src/notify', () => ({
  notify: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

// expo-router: stub navigation primitives used by the screen.
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

// NOTE: @expo/vector-icons is mocked globally via __mocks__/@expo/vector-icons.js
// (auto-applied by jest). The real package imports expo-font -> expo-asset, an
// Expo-nested transitive dep jest cannot resolve. Icons are decorative here.

// expo-secure-store: the success path persists the refresh token.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// expo-localization: unavailable in jest env (i18n init reads it).
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

// nativeHttpClient: authSlice imports setAccessToken at module load.
jest.mock('../../src/lib/nativeHttpClient', () => ({
  nativeHttpClient: {},
  setAccessToken: jest.fn(),
  setRefreshHandler: jest.fn(),
  setOnUnauthenticated: jest.fn(),
}));

// safe-area-context: real provider waits for an onLayout frame; pass through.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const PassThrough = ({ children }: { children?: unknown }) => children;
  PassThrough.displayName = 'SafeAreaProvider';
  return {
    SafeAreaProvider: PassThrough,
    SafeAreaView: PassThrough,
    SafeAreaInsetsContext: React.createContext({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

import { Provider } from 'react-redux';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { makeStore } from '../../src/store';
import { BeyouThemeProvider } from '../../src/theme/ThemeProvider';
import { notify } from '../../src/notify';
import '../../src/i18n';
import LoginRoute from './login';

// Fresh store per test — Redux state is not reset between Jest cases, so a
// shared singleton would let one test's auth.error/status bleed into the next.
let store: ReturnType<typeof makeStore>;

const renderScreen = async () =>
  render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <LoginRoute />
      </BeyouThemeProvider>
    </Provider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  store = makeStore();
});

describe('LoginRoute (branded)', () => {
  it('renders the branded login screen with all required testIDs and brand', async () => {
    const screen = await renderScreen();
    expect(screen.getByTestId('login-screen')).toBeTruthy();
    expect(screen.getByTestId('login-email-input')).toBeTruthy();
    expect(screen.getByTestId('login-password-input')).toBeTruthy();
    expect(screen.getByTestId('login-submit-button')).toBeTruthy();
    // MobileBrand brand name (i18n 'BeYou' -> "Be you")
    expect(screen.getByText('Be you')).toBeTruthy();
  });

  it('surfaces zod validation errors when submitting empty fields', async () => {
    const screen = await renderScreen();
    fireEvent.press(screen.getByTestId('login-submit-button'));
    await waitFor(() => {
      expect(screen.getByTestId('login-email-input-error')).toBeTruthy();
    });
    expect(screen.getByTestId('login-password-input-error')).toBeTruthy();
    expect(mockLoginRequest).not.toHaveBeenCalled();
  });

  it('calls notify.error when login fails with bad credentials', async () => {
    // loginSchema only requires a non-empty password (strength is server-side),
    // so any non-empty string passes zod and reaches the mocked loginRequest.
    mockLoginRequest.mockRejectedValueOnce(new ApiError(401, 'Unauthorized', 'INVALID_CREDENTIALS'));
    const screen = await renderScreen();

    // Wrap the interaction in async act so the awaited login thunk AND its trailing
    // re-renders settle inside this act scope — otherwise the tail leaks into the
    // next test and corrupts its render ("overlapping act() calls").
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('login-email-input'), 'user@test.com');
      fireEvent.changeText(screen.getByTestId('login-password-input'), 'somepassword');
      fireEvent.press(screen.getByTestId('login-submit-button'));
    });

    expect(notify.error).toHaveBeenCalled();
    expect(mockLoginRequest).toHaveBeenCalledWith('user@test.com', 'somepassword');
  });

  it('shows the inline verify card (not a toast) when login fails with EMAIL_NOT_VERIFIED', async () => {
    // The login thunk maps the rejection via parseApiError(e).message, which reads
    // ApiError.data (the response body) — so the key must live in `data`, not the
    // Error message arg. A { message } body is how the backend signals this.
    mockLoginRequest.mockRejectedValueOnce(new ApiError(403, { message: 'EMAIL_NOT_VERIFIED' }));
    const screen = await renderScreen();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('login-email-input'), 'user@test.com');
      fireEvent.changeText(screen.getByTestId('login-password-input'), 'somepassword');
      fireEvent.press(screen.getByTestId('login-submit-button'));
    });

    expect(screen.getByTestId('login-email-not-verified')).toBeTruthy();
    // The unverified-email path uses the inline card, NOT the error toast.
    expect(notify.error).not.toHaveBeenCalled();
  });
});
