/**
 * EduAccess - Internationalization Configuration
 * Supports English (en) and Spanish (es)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '@/locales/en.json';
import es from '@/locales/es.json';

// Custom language detector that checks localStorage first, then browser language
const customLanguageDetector = {
  name: 'customDetector',
  lookup() {
    // Check localStorage first
    const storedLang = localStorage.getItem('language');
    if (storedLang && ['en', 'es'].includes(storedLang)) {
      return storedLang;
    }

    // Check browser language
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang) {
      if (browserLang.startsWith('en')) return 'en';
      if (browserLang.startsWith('es')) return 'es';
    }

    // Default to Spanish
    return 'es';
  },
  cacheUserLanguage(lng: string) {
    localStorage.setItem('language', lng);
  },
};

const languageDetector = new LanguageDetector();
languageDetector.addDetector(customLanguageDetector);

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'es',
    supportedLngs: ['en', 'es'],
    detection: {
      order: ['customDetector', 'localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

// Helper to change language and persist
export function changeLanguage(lng: 'en' | 'es') {
  i18n.changeLanguage(lng);
  localStorage.setItem('language', lng);
}

// Get current language
export function getCurrentLanguage(): 'en' | 'es' {
  const lang = i18n.language;
  return lang.startsWith('es') ? 'es' : 'en';
}
