/**
 * RoutineSettingsSection — escolher a estratégia de decaimento persiste
 * { timezone, xpDecayStrategy } via editUser e despacha os dois para a slice de
 * perfil. Não há botão de salvar: só o perfil tem. Boundary mocked: notify, expo-localization, and the @beyou/api
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

    // Escolher já salva: só o perfil tem botão de salvar. O valor persistido é
    // o RECÉM-escolhido, não o que estava no estado quando o toque aconteceu.
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
