import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import en from './locales/en.json';
import es from './locales/es.json';

const resources = {
  en: {
    translation: en,
  },
  es: {
    translation: es,
  },
};

// Get device language
const deviceLanguages = getLocales();
const deviceLanguage = deviceLanguages[0]?.languageCode || 'en';

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: deviceLanguage === 'es' ? 'es' : 'en', // Default to Spanish for Spanish speakers, English otherwise
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    compatibilityJSON: 'v3',
  });

export default i18n;