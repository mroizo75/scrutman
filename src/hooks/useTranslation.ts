"use client";

import { useState, useEffect } from 'react';
import { getTranslation, Language } from '@/lib/translations';

export function useTranslation() {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Get language from localStorage first
    const savedLang = localStorage.getItem('language') as Language;
    
    if (savedLang) {
      setLanguage(savedLang);
    } else {
      // Auto-detect language from browser
      const browserLang = navigator.language.split('-')[0] as Language;
      const detectedLang = (browserLang === 'fr') ? 'fr' : 'en';
      setLanguage(detectedLang);
      localStorage.setItem('language', detectedLang);
    }

    // Listen for language changes
    const handleLanguageChange = (event: CustomEvent) => {
      setLanguage(event.detail);
    };

    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
    };
  }, []);

  const t = (key: string) => getTranslation(language, key);

  return { t, language };
}
