/**
 * Branded reset-password screen (D2) — REAL render test.
 *
 * Mirrors the forgot/login harness: real Redux + theme + i18n, only leaf
 * boundaries mocked. The reset screen validates the deep-link token on mount,
 * then (if valid) shows the new-password form gated by the shared reset schema.
 */

const mockReset = jest.fn();
const mockValidate = jest.fn();
jest.mock('../src/auth/authApi', () => ({
  resetPasswordRequest: (...a: unknown[]) => mockReset(...a),
  validateResetTokenRequest: (...a: unknown[]) => mockValidate(...a),
  loginRequest: jest.fn(),
  registerRequest: jest.fn(),
  refreshRequest: jest.fn(),
  logoutRequest: jest.fn(),
}));

jest.mock('../src/notify', () => ({
  notify: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

const mockReplace = jest.fn();
let mockParams: Record<string, string> = { token: 'tok-123' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
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
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { notify } from '../src/notify';
import '../src/i18n';
import ResetRoute from '../app/(auth)/reset';

const VALID_PW = 'Password1234';

let store: ReturnType<typeof makeStore>;

const renderScreen = async () =>
  render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <ResetRoute />
      </BeyouThemeProvider>
    </Provider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { token: 'tok-123' };
  store = makeStore();
});

describe('ResetRoute (branded)', () => {
  it('validates the token on mount and shows the form when valid', async () => {
    mockValidate.mockResolvedValueOnce({ valid: true });
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByTestId('reset-password-input')).toBeTruthy());
    expect(mockValidate).toHaveBeenCalledWith('tok-123');
    expect(screen.getByTestId('reset-submit-button')).toBeTruthy();
  });

  it('shows the invalid state when the token does not validate', async () => {
    mockValidate.mockResolvedValueOnce({ error: { errorKey: 'PASSWORD_RESET_TOKEN_INVALID' } });
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByTestId('reset-invalid')).toBeTruthy());
    expect(screen.queryByTestId('reset-password-input')).toBeNull();
  });

  it('shows the invalid state and skips validation when no token is present', async () => {
    mockParams = {};
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByTestId('reset-invalid')).toBeTruthy());
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('blocks submit on a password mismatch (shared schema refine)', async () => {
    mockValidate.mockResolvedValueOnce({ valid: true });
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByTestId('reset-password-input')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('reset-password-input'), VALID_PW);
      fireEvent.changeText(screen.getByTestId('reset-confirm-input'), 'Different1234');
      fireEvent.press(screen.getByTestId('reset-submit-button'));
    });
    await waitFor(() => expect(screen.getByTestId('reset-confirm-input-error')).toBeTruthy());
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('posts token + password and shows success on a valid submit', async () => {
    mockValidate.mockResolvedValueOnce({ valid: true });
    mockReset.mockResolvedValueOnce({ success: true });
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByTestId('reset-password-input')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('reset-password-input'), VALID_PW);
      fireEvent.changeText(screen.getByTestId('reset-confirm-input'), VALID_PW);
      fireEvent.press(screen.getByTestId('reset-submit-button'));
    });
    expect(mockReset).toHaveBeenCalledWith('tok-123', VALID_PW);
    await waitFor(() => expect(screen.getByTestId('reset-success')).toBeTruthy());
  });

  it('falls back to the invalid state when the token expires at submit time', async () => {
    mockValidate.mockResolvedValueOnce({ valid: true });
    mockReset.mockResolvedValueOnce({ error: { errorKey: 'PASSWORD_RESET_TOKEN_EXPIRED' } });
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByTestId('reset-password-input')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('reset-password-input'), VALID_PW);
      fireEvent.changeText(screen.getByTestId('reset-confirm-input'), VALID_PW);
      fireEvent.press(screen.getByTestId('reset-submit-button'));
    });
    await waitFor(() => expect(screen.getByTestId('reset-invalid')).toBeTruthy());
    expect(notify.error).not.toHaveBeenCalled();
  });
});
