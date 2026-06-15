/**
 * Branded register screen (P2-T8) — REAL render test.
 *
 * Sibling of login.test.tsx. Renders RegisterRoute inside the real Redux
 * <Provider store> + real <BeyouThemeProvider> + real i18n (src/i18n) so the
 * screen is exercised with its true wiring. Only the leaf boundaries are mocked:
 *   - ../../src/auth/authApi   -> registerRequest can resolve (success) or reject
 *   - ../../src/notify         -> assert notify.error is called on failure
 *   - expo-router useRouter    -> back-to-login navigation primitive (replace)
 *   - expo-secure-store        -> authSlice transitively touches it
 *   - react-native-safe-area-context -> pass-through (real provider waits on a layout frame)
 *
 * The register thunk maps a thrown error to rejectWithValue('REGISTER_FAILED');
 * on success (registerRequest resolves) it returns register.fulfilled and the
 * screen swaps the form for a verify-email success view. The user is NOT
 * authenticated yet (email verification pending) — there is no auto-redirect.
 */

// Network boundary: the screen -> register thunk -> registerRequest. Mock it so
// the thunk's try/catch resolves or rejects deterministically without real fetch.
const mockRegisterRequest = jest.fn();
jest.mock('../../src/auth/authApi', () => ({
  loginRequest: jest.fn(),
  registerRequest: (...args: unknown[]) => mockRegisterRequest(...args),
  refreshRequest: jest.fn(),
  logoutRequest: jest.fn(),
}));

// Toast boundary: assert error surfacing without loading react-native-toast-message.
jest.mock('../../src/notify', () => ({
  notify: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

// expo-router: stub navigation primitives used by the screen (back-to-login uses replace).
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

// NOTE: @expo/vector-icons is mocked globally via __mocks__/@expo/vector-icons.js
// (auto-applied by jest). The real package imports expo-font -> expo-asset, an
// Expo-nested transitive dep jest cannot resolve. Icons are decorative here.

// expo-secure-store: authSlice imports the secure store at module load.
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
import RegisterRoute from './register';

// A password that satisfies the strong schema: 12+ chars, 2+ character classes.
const VALID_PASSWORD = 'Abcdefghijkl1';

// Fresh store per test — Redux state is not reset between Jest cases, so a
// shared singleton would let one test's auth state bleed into the next.
let store: ReturnType<typeof makeStore>;

const renderScreen = async () =>
  render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <RegisterRoute />
      </BeyouThemeProvider>
    </Provider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  store = makeStore();
});

describe('RegisterRoute (branded)', () => {
  it('renders the branded register screen with all required testIDs and brand', async () => {
    const screen = await renderScreen();
    expect(screen.getByTestId('register-screen')).toBeTruthy();
    expect(screen.getByTestId('register-name-input')).toBeTruthy();
    expect(screen.getByTestId('register-email-input')).toBeTruthy();
    expect(screen.getByTestId('register-password-input')).toBeTruthy();
    expect(screen.getByTestId('register-submit')).toBeTruthy();
    expect(screen.getByTestId('password-hints')).toBeTruthy();
    // i18n 'BeYou' -> "Be you" appears twice: MobileBrand wordmark + the heading
    // ("Welcome to BeYou"), unlike login whose heading says "Back!".
    expect(screen.getAllByText('Be you').length).toBeGreaterThanOrEqual(1);
  });

  it('surfaces the zod password error and does not call registerRequest for a weak password', async () => {
    const screen = await renderScreen();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('register-name-input'), 'Jane Doe');
      fireEvent.changeText(screen.getByTestId('register-email-input'), 'jane@test.com');
      fireEvent.changeText(screen.getByTestId('register-password-input'), 'short');
      fireEvent.press(screen.getByTestId('register-submit'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('register-password-input-error')).toBeTruthy();
    });
    // Live PasswordHints reflect the still-too-short password.
    expect(screen.getByTestId('PasswordHintLength-pending')).toBeTruthy();
    expect(mockRegisterRequest).not.toHaveBeenCalled();
  });

  it('shows the verify-email success view and routes back to login on confirm', async () => {
    mockRegisterRequest.mockResolvedValueOnce(undefined);
    const screen = await renderScreen();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('register-name-input'), 'Jane Doe');
      fireEvent.changeText(screen.getByTestId('register-email-input'), 'jane@test.com');
      fireEvent.changeText(screen.getByTestId('register-password-input'), VALID_PASSWORD);
      fireEvent.press(screen.getByTestId('register-submit'));
    });

    expect(mockRegisterRequest).toHaveBeenCalledWith('Jane Doe', 'jane@test.com', VALID_PASSWORD);
    expect(screen.getByTestId('register-success')).toBeTruthy();

    fireEvent.press(screen.getByTestId('register-success-to-login'));
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('calls notify.error and stays on the form when registration fails', async () => {
    mockRegisterRequest.mockRejectedValueOnce(new Error('boom'));
    const screen = await renderScreen();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('register-name-input'), 'Jane Doe');
      fireEvent.changeText(screen.getByTestId('register-email-input'), 'jane@test.com');
      fireEvent.changeText(screen.getByTestId('register-password-input'), VALID_PASSWORD);
      fireEvent.press(screen.getByTestId('register-submit'));
    });

    expect(notify.error).toHaveBeenCalled();
    expect(screen.queryByTestId('register-success')).toBeNull();
  });
});
