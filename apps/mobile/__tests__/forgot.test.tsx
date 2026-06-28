/**
 * Branded forgot-password screen (D1) — REAL render test.
 *
 * Renders ForgotRoute inside the real Redux <Provider store> + real
 * <BeyouThemeProvider> + real i18n so the screen runs with its true wiring.
 * Only leaf boundaries are mocked: authApi.forgotPasswordRequest (network),
 * notify (toast), expo-router (navigation), and the Expo native shims the
 * store/i18n pull in at module load.
 */

const mockForgot = jest.fn();
jest.mock('../src/auth/authApi', () => ({
  forgotPasswordRequest: (...args: unknown[]) => mockForgot(...args),
  loginRequest: jest.fn(),
  registerRequest: jest.fn(),
  refreshRequest: jest.fn(),
  logoutRequest: jest.fn(),
}));

jest.mock('../src/notify', () => ({
  notify: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

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
import ForgotRoute from '../app/(auth)/forgot';

let store: ReturnType<typeof makeStore>;

const renderScreen = async () =>
  render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <ForgotRoute />
      </BeyouThemeProvider>
    </Provider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  store = makeStore();
});

describe('ForgotRoute (branded)', () => {
  it('renders the screen with email input, submit, and back link', async () => {
    const screen = await renderScreen();
    expect(screen.getByTestId('forgot-screen')).toBeTruthy();
    expect(screen.getByTestId('forgot-email-input')).toBeTruthy();
    expect(screen.getByTestId('forgot-submit-button')).toBeTruthy();
    expect(screen.getByTestId('forgot-back-link')).toBeTruthy();
  });

  it('blocks submit and shows a validation error on an invalid email', async () => {
    const screen = await renderScreen();
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('forgot-email-input'), 'not-an-email');
      fireEvent.press(screen.getByTestId('forgot-submit-button'));
    });
    await waitFor(() => expect(screen.getByTestId('forgot-email-input-error')).toBeTruthy());
    expect(mockForgot).not.toHaveBeenCalled();
  });

  it('posts the email and shows the success state on a valid submit', async () => {
    mockForgot.mockResolvedValueOnce(undefined);
    const screen = await renderScreen();
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('forgot-email-input'), 'user@test.com');
      fireEvent.press(screen.getByTestId('forgot-submit-button'));
    });
    expect(mockForgot).toHaveBeenCalledWith('user@test.com');
    await waitFor(() => expect(screen.getByTestId('forgot-success')).toBeTruthy());
  });

  it('calls notify.error when the request fails', async () => {
    mockForgot.mockRejectedValueOnce(new Error('network'));
    const screen = await renderScreen();
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('forgot-email-input'), 'user@test.com');
      fireEvent.press(screen.getByTestId('forgot-submit-button'));
    });
    expect(notify.error).toHaveBeenCalled();
    expect(screen.queryByTestId('forgot-success')).toBeNull();
  });

  it('navigates back to login from the back link', async () => {
    const screen = await renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('forgot-back-link'));
    });
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });
});
