/**
 * Shortcuts (P3-T3) — the dashboard nav grid. Renders all six entries and
 * navigates to the matching route on press.
 */
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import Shortcuts from '../src/ui/dashboard/Shortcuts';

const renderShortcuts = () =>
  render(
    <BeyouThemeProvider>
      <Shortcuts />
    </BeyouThemeProvider>,
  );

describe('Shortcuts', () => {
  beforeEach(() => mockPush.mockClear());

  it('renders all six shortcuts', async () => {
    await renderShortcuts();
    for (const key of ['categories', 'habits', 'tasks', 'routines', 'goals', 'config']) {
      expect(screen.getByTestId(`shortcut-${key}`)).toBeTruthy();
    }
  });

  it('navigates to the matching route on press', async () => {
    await renderShortcuts();
    fireEvent.press(screen.getByTestId('shortcut-goals'));
    expect(mockPush).toHaveBeenCalledWith('/goals');
    fireEvent.press(screen.getByTestId('shortcut-config'));
    expect(mockPush).toHaveBeenCalledWith('/configuration');
  });
});
