/**
 * RoutineSettingsSection — picking a decay strategy persists
 * { timezone, xpDecayStrategy } through editUser and dispatches both into the
 * perfil slice. There is no save button: only the profile has one. Boundary
 * mocked: notify, expo-localization, and the @beyou/api
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
  it('persists the xp-decay strategy as soon as it is picked', async () => {
    const store = makeStore();
    await render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <RoutineSettingsSection />
        </BeyouThemeProvider>
      </Provider>,
    );

    // Picking saves: only the profile has a save button. The value persisted is the
    // JUST-picked one, not whatever was in state when the tap happened.
    await act(async () => {
      fireEvent.press(screen.getByTestId('xp-decay-FLAT'));
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
