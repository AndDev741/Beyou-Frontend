/** AppearanceSection (P5-A2) — escolher modo/acento persiste via editUser. */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AppearanceSection from '../src/ui/config/AppearanceSection';

let putSpy: jest.Mock;
beforeEach(() => {
  putSpy = jest.fn(async () => ({ data: {} }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post: noop, put: putSpy, delete: noop } as never);
  setLogger({ error: () => {} });
});

const renderSection = () =>
  render(
    <Provider store={makeStore()}>
      <BeyouThemeProvider>
        <AppearanceSection />
      </BeyouThemeProvider>
    </Provider>,
  );

describe('AppearanceSection', () => {
  it('persists the chosen mode via editUser', async () => {
    await renderSection();

    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-mode-dark'));
    });

    await waitFor(() => expect(putSpy).toHaveBeenCalledWith('/user', { theme: 'dark:beyou' }));
  });

  it('persists the chosen accent pack alongside the mode', async () => {
    await renderSection();

    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-mode-light'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-accent-cyber'));
    });

    await waitFor(() => expect(putSpy).toHaveBeenCalledWith('/user', { theme: 'light:cyber' }));
  });
});
