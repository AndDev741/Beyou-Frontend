/**
 * ConstanceSection (P5-A3) — selecting a constance mode and saving persists
 * { constanceConfiguration } via editUser (editUser-only; no perfil field).
 * Boundary mocked: notify and the @beyou/api HttpClient.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ConstanceSection from '../src/ui/config/ConstanceSection';
import { notify } from '../src/notify';

let putSpy: jest.Mock;
beforeEach(() => {
  putSpy = jest.fn(async () => ({ data: {} }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post: noop, put: putSpy, delete: noop } as never);
  setLogger({ error: () => {} });
  (notify.success as jest.Mock).mockClear();
  (notify.error as jest.Mock).mockClear();
});

describe('ConstanceSection', () => {
  it('persists the selected constance mode via editUser and toasts success', async () => {
    await render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <ConstanceSection />
        </BeyouThemeProvider>
      </Provider>,
    );

    // Default is ANY; pick COMPLETE then save.
    await act(async () => {
      fireEvent.press(screen.getByTestId('constance-COMPLETE'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('save-constance'));
    });

    await waitFor(() =>
      expect(putSpy).toHaveBeenCalledWith('/user', { constanceConfiguration: 'COMPLETE' }),
    );
    expect(notify.success).toHaveBeenCalled();
  });
});
