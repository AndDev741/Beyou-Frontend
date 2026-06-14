import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { resources } from '@beyou/i18n';

const lng = getLocales()[0]?.languageCode === 'pt' ? 'pt' : 'en';

i18next.use(initReactI18next).init({
  resources,
  lng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18next;
