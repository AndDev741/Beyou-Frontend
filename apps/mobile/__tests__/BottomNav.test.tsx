/** BottomNav (dashboard action bar) — renders all six items and navigates. */
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import BottomNav from '../src/ui/dashboard/BottomNav';

const renderNav = () =>
  render(
    <BeyouThemeProvider>
      <BottomNav />
    </BeyouThemeProvider>,
  );

describe('BottomNav', () => {
  beforeEach(() => mockPush.mockClear());

  it('renders all six nav items', async () => {
    await renderNav();
    for (const key of ['categories', 'tasks', 'habits', 'routines', 'goals', 'config']) {
      expect(screen.getByTestId(`nav-${key}`)).toBeTruthy();
    }
  });

  it('navigates to the matching route on press', async () => {
    await renderNav();
    fireEvent.press(screen.getByTestId('nav-habits'));
    expect(mockPush).toHaveBeenCalledWith('/habits');
    fireEvent.press(screen.getByTestId('nav-routines'));
    expect(mockPush).toHaveBeenCalledWith('/routines');
  });
});
