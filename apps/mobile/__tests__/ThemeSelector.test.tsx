/**
 * ThemeSelector — mode and accent swap the live theme through BeyouThemeProvider. A
 * minimal consumer renders the current preference for the assertion.
 */
import { Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { accentPacks } from '@beyou/theme';
import '../src/i18n';
import { BeyouThemeProvider, useBeyouTheme } from '../src/theme/ThemeProvider';
import ThemeSelector from '../src/ui/ThemeSelector';

function CurrentTheme() {
  const { theme } = useBeyouTheme();
  return (
    <>
      <Text testID="current-mode">{theme.mode}</Text>
      <Text testID="current-base">{theme.base}</Text>
      <Text testID="current-accent">{theme.accent}</Text>
    </>
  );
}

const renderSelector = async () =>
  render(
    <BeyouThemeProvider>
      <ThemeSelector />
      <CurrentTheme />
    </BeyouThemeProvider>,
  );

describe('ThemeSelector', () => {
  it('renders the three modes and every accent pack', async () => {
    const screen = await renderSelector();
    for (const mode of ['system', 'light', 'dark']) {
      expect(screen.getByTestId(`theme-mode-${mode}`)).toBeTruthy();
    }
    for (const pack of accentPacks) {
      expect(screen.getByTestId(`theme-accent-${pack.id}`)).toBeTruthy();
    }
  });

  it('switches the base when a mode is pressed', async () => {
    const screen = await renderSelector();
    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-mode-dark'));
    });
    expect(screen.getByTestId('current-base').props.children).toBe('dark');
    expect(screen.getByTestId('current-mode').props.children).toBe('dark:beyou');
  });

  it('swaps only the accent when a pack is pressed', async () => {
    const screen = await renderSelector();
    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-mode-light'));
    });
    const beyouAccent = screen.getByTestId('current-accent').props.children;

    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-accent-forest'));
    });
    expect(screen.getByTestId('current-accent').props.children).not.toBe(beyouAccent);
    expect(screen.getByTestId('current-base').props.children).toBe('light');
  });

  it('reports the selected pack through onSelect for persistence', async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <BeyouThemeProvider>
        <ThemeSelector onSelect={onSelect} />
      </BeyouThemeProvider>,
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-accent-amethyst'));
    });
    expect(onSelect).toHaveBeenCalledWith('system:amethyst');
  });
});
