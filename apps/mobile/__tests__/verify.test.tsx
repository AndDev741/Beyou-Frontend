/**
 * Email-verification screen (D2) — REAL render test.
 *
 * Calls verifyEmailRequest once on mount (deep-link token) and renders one of
 * loading / success / expired / error. Only leaf boundaries are mocked.
 */

const mockVerify = jest.fn();
jest.mock('../src/auth/authApi', () => ({
  verifyEmailRequest: (...a: unknown[]) => mockVerify(...a),
  loginRequest: jest.fn(),
  registerRequest: jest.fn(),
  refreshRequest: jest.fn(),
  logoutRequest: jest.fn(),
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
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import '../src/i18n';
import VerifyRoute from '../app/(auth)/verify';

let store: ReturnType<typeof makeStore>;

const renderScreen = async () =>
  render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <VerifyRoute />
      </BeyouThemeProvider>
    </Provider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { token: 'tok-123' };
  store = makeStore();
});

describe('VerifyRoute', () => {
  it('verifies the token on mount and shows success', async () => {
    mockVerify.mockResolvedValueOnce('success');
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByTestId('verify-success')).toBeTruthy());
    expect(mockVerify).toHaveBeenCalledWith('tok-123');
  });

  it('shows the expired state', async () => {
    mockVerify.mockResolvedValueOnce('expired');
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByTestId('verify-expired')).toBeTruthy());
  });

  it('shows the error state', async () => {
    mockVerify.mockResolvedValueOnce('error');
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByTestId('verify-error')).toBeTruthy());
  });

  it('shows the error state and skips the request when no token is present', async () => {
    mockParams = {};
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByTestId('verify-error')).toBeTruthy());
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('navigates to login from the success CTA', async () => {
    mockVerify.mockResolvedValueOnce('success');
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByTestId('verify-login-button')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId('verify-login-button'));
    });
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });
});
