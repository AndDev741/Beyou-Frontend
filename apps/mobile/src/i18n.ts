import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { resources } from '@beyou/i18n';
import { installPluralRulesPolyfill } from './lib/pluralRulesPolyfill';

// Antes do init: o i18next monta o resolvedor de plural na inicialização.
installPluralRulesPolyfill();

const lng = getLocales()[0]?.languageCode === 'pt' ? 'pt' : 'en';

i18next.use(initReactI18next).init({
  resources,
  lng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
}).catch((e) => console.error('i18n init failed', e));

export default i18next;
