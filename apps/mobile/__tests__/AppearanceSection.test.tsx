/** AppearanceSection (P5-A2) — selecting a theme persists it via editUser. */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import { themes } from '@beyou/theme';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AppearanceSection from '../src/ui/config/AppearanceSection';

const target = themes.find((t) => t.mode !== themes[0].mode)!;

let putSpy: jest.Mock;
beforeEach(() => {
  putSpy = jest.fn(async () => ({ data: {} }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post: noop, put: putSpy, delete: noop } as never);
  setLogger({ error: () => {} });
});

describe('AppearanceSection', () => {
  it('persists the selected theme via editUser', async () => {
    await render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <AppearanceSection />
        </BeyouThemeProvider>
      </Provider>,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId(`theme-swatch-${target.mode}`));
    });

    await waitFor(() => expect(putSpy).toHaveBeenCalledWith('/user', { theme: target.mode }));
  });
});
