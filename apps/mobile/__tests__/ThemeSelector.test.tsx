/**
 * ThemeSelector — pressing a swatch switches the live theme via BeyouThemeProvider.
 * A tiny consumer renders the current theme.mode so we can assert the change.
 */
import { Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { themes } from '@beyou/theme';
import { BeyouThemeProvider, useBeyouTheme } from '../src/theme/ThemeProvider';
import ThemeSelector from '../src/ui/ThemeSelector';

function CurrentMode() {
  const { theme } = useBeyouTheme();
  return <Text testID="current-mode">{theme.mode}</Text>;
}

const renderSelector = async () =>
  render(
    <BeyouThemeProvider>
      <ThemeSelector />
      <CurrentMode />
    </BeyouThemeProvider>,
  );

describe('ThemeSelector', () => {
  it('renders a swatch for every theme', async () => {
    const screen = await renderSelector();
    for (const t of themes) {
      expect(screen.getByTestId(`theme-swatch-${t.mode}`)).toBeTruthy();
    }
  });

  it('switches the active theme when a swatch is pressed', async () => {
    const screen = await renderSelector();
    // Pick a theme that is not the default starting one.
    const target = themes.find((t) => t.mode !== screen.getByTestId('current-mode').props.children);
    expect(target).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId(`theme-swatch-${target!.mode}`));
    });
    expect(screen.getByTestId('current-mode').props.children).toBe(target!.mode);
  });
});
