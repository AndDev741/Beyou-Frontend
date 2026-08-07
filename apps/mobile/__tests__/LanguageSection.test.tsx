/**
 * LanguageSection — o idioma vive no controle segmentado do sistema, com os
 * nomes por extenso como na web. Escolher persiste via editUser e despacha
 * para a slice de perfil. Boundary mocked: notify and the @beyou/api
 * HttpClient.
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
import LanguageSection from '../src/ui/config/LanguageSection';

let putSpy: jest.Mock;
beforeEach(() => {
  putSpy = jest.fn(async () => ({ data: {} }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post: noop, put: putSpy, delete: noop } as never);
  setLogger({ error: () => {} });
});

describe('LanguageSection', () => {
  it('persists the selected language via editUser and dispatches to perfil', async () => {
    const store = makeStore();
    await render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <LanguageSection />
        </BeyouThemeProvider>
      </Provider>,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('language-toggle-pt'));
    });

    await waitFor(() => expect(putSpy).toHaveBeenCalledWith('/user', { language: 'pt' }));
    expect(store.getState().perfil.languageInUse).toBe('pt');
  });
});
