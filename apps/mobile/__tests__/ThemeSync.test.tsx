/** ThemeSync (P5-A2) — applies the saved profile theme once the profile loads. */
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { render, screen, act, waitFor } from '@testing-library/react-native';
import { themes } from '@beyou/theme';
import { bootstrap } from '../src/auth/authSlice';
import { makeStore } from '../src/store';
import { BeyouThemeProvider, useBeyouTheme } from '../src/theme/ThemeProvider';
import ThemeSync from '../src/theme/ThemeSync';

const target = themes.find((t) => t.mode !== themes[0].mode)!;

function CurrentMode() {
  const { theme } = useBeyouTheme();
  return <Text testID="mode">{theme.mode}</Text>;
}

describe('ThemeSync', () => {
  it('applies the saved profile theme after the profile loads', async () => {
    const store = makeStore();
    await render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <ThemeSync />
          <CurrentMode />
        </BeyouThemeProvider>
      </Provider>,
    );

    expect(screen.getByTestId('mode').props.children).not.toBe(target.mode);

    await act(async () => {
      store.dispatch(bootstrap.fulfilled({ themeInUse: target.mode } as never, 'req', undefined));
    });

    await waitFor(() => expect(screen.getByTestId('mode').props.children).toBe(target.mode));
  });
});
