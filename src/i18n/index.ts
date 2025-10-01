import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import es from './locales/es.json';

const LANGUAGE_STORAGE_KEY = '@language_preference';

const resources = {
  en: {
    translation: en,
  },
  es: {
    translation: es,
  },
};

// Get stored language preference or device language as fallback
const getStoredLanguage = async (): Promise<string> => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'es')) {
      return storedLanguage;
    }
  } catch (error) {
    console.warn('Failed to load stored language preference:', error);
  }
  
  // Fallback to device language
  const deviceLanguages = getLocales();
  const deviceLanguage = deviceLanguages[0]?.languageCode || 'en';
  return deviceLanguage === 'es' ? 'es' : 'en';
};

// Save language preference
export const saveLanguagePreference = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to save language preference:', error);
  }
};

// Initialize i18n
const initializeI18n = async () => {
  const initialLanguage = await getStoredLanguage();
  
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // React already does escaping
      },
      compatibilityJSON: 'v3',
    });
};

// Initialize with stored language
initializeI18n();

export default i18n;