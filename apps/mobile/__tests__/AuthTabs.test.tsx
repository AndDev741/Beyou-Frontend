/**
 * AuthTabs — Login | Register switcher (mirrors web authentication/header.tsx).
 * Verifies both tabs render and tapping a tab navigates to the sibling route.
 */
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

import { render, fireEvent } from '@testing-library/react-native';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import '../src/i18n';
import AuthTabs from '../src/ui/AuthTabs';

const renderTabs = async (active: 'login' | 'register') =>
  render(
    <BeyouThemeProvider>
      <AuthTabs active={active} />
    </BeyouThemeProvider>,
  );

beforeEach(() => jest.clearAllMocks());

describe('AuthTabs', () => {
  it('renders both Login and Register tabs', async () => {
    const screen = await renderTabs('login');
    expect(screen.getByTestId('auth-tab-login')).toBeTruthy();
    expect(screen.getByTestId('auth-tab-register')).toBeTruthy();
  });

  it('navigates to the register route when the Register tab is tapped', async () => {
    const screen = await renderTabs('login');
    fireEvent.press(screen.getByTestId('auth-tab-register'));
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/register');
  });

  it('navigates to the login route when the Login tab is tapped', async () => {
    const screen = await renderTabs('register');
    fireEvent.press(screen.getByTestId('auth-tab-login'));
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });
});
