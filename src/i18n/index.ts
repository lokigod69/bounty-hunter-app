import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en/translation.json';
import deTranslation from './locales/de/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      de: { translation: deTranslation }
    },
    fallbackLng: 'en',
    debug: false,

    detection: {
      // R35: Only check localStorage - don't auto-detect from browser
      // This ensures new users get English by default
      // Users can manually switch language and it will be saved to localStorage
      order: ['localStorage'],
      caches: ['localStorage']
    },

    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
