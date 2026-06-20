/**
 * RoutineSettingsSection (P5-A3) — changing the XP decay strategy and saving
 * persists { timezone, xpDecayStrategy } via editUser and dispatches both to the
 * perfil slice. Boundary mocked: notify, expo-localization, and the @beyou/api
 * HttpClient.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('expo-localization', () => ({
  getCalendars: () => [{ timeZone: 'UTC' }],
  getLocales: () => [{ languageCode: 'en' }],
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutineSettingsSection from '../src/ui/config/RoutineSettingsSection';

let putSpy: jest.Mock;
beforeEach(() => {
  putSpy = jest.fn(async () => ({ data: {} }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post: noop, put: putSpy, delete: noop } as never);
  setLogger({ error: () => {} });
});

describe('RoutineSettingsSection', () => {
  it('saves the selected timezone + xp-decay strategy via editUser and dispatches', async () => {
    const store = makeStore();
    await render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <RoutineSettingsSection />
        </BeyouThemeProvider>
      </Provider>,
    );

    // Defaults: timezone 'UTC', xpDecayStrategy 'GRADUAL'. Pick FLAT, then save.
    await act(async () => {
      fireEvent.press(screen.getByTestId('xp-decay-FLAT'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('save-routine-settings'));
    });

    await waitFor(() =>
      expect(putSpy).toHaveBeenCalledWith('/user', {
        timezone: 'UTC',
        xpDecayStrategy: 'FLAT',
      }),
    );
    expect(store.getState().perfil.xpDecayStrategy).toBe('FLAT');
    expect(store.getState().perfil.timezone).toBe('UTC');
  });
});
