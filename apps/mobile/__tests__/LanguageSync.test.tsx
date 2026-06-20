/** LanguageSync (P5-A3) — applies the saved profile language once the profile loads. */
jest.mock('expo-localization', () => ({
  getCalendars: () => [{ timeZone: 'UTC' }],
  getLocales: () => [{ languageCode: 'en' }],
}));

import { Provider } from 'react-redux';
import { render, act, waitFor } from '@testing-library/react-native';
import i18n from '../src/i18n';
import { bootstrap } from '../src/auth/authSlice';
import { makeStore } from '../src/store';
import LanguageSync from '../src/i18n/LanguageSync';

describe('LanguageSync', () => {
  it('applies the saved profile language after the profile loads', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    const store = makeStore();
    await render(
      <Provider store={store}>
        <LanguageSync />
      </Provider>,
    );

    expect(i18n.language).not.toBe('pt');

    await act(async () => {
      store.dispatch(bootstrap.fulfilled({ languageInUse: 'pt' } as never, 'req', undefined));
    });

    await waitFor(() => expect(i18n.language).toBe('pt'));
  });
});
