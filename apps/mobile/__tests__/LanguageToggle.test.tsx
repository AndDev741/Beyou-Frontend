/**
 * LanguageToggle — EN | PT switch that drives the real i18n instance.
 */
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

import { render, fireEvent, act } from '@testing-library/react-native';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import '../src/i18n';
import LanguageToggle from '../src/ui/LanguageToggle';

function CurrentLang() {
  const { i18n: instance } = useTranslation();
  return <Text testID="current-lang">{instance.language}</Text>;
}

beforeEach(async () => {
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

describe('LanguageToggle', () => {
  it('renders EN and PT buttons', async () => {
    const screen = await render(<LanguageToggle />);
    expect(screen.getByTestId('lang-en')).toBeTruthy();
    expect(screen.getByTestId('lang-pt')).toBeTruthy();
  });

  it('changes the i18n language to pt when PT is pressed', async () => {
    const screen = await render(
      <>
        <LanguageToggle />
        <CurrentLang />
      </>,
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('lang-pt'));
    });
    expect(screen.getByTestId('current-lang').props.children).toBe('pt');
  });
});
