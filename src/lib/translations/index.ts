import { en } from './en';
import { fr } from './fr';

export type Language = 'en' | 'fr';

export const translations = {
  en,
  fr
};

export function getTranslation(lang: Language, key: string): string {
  const keys = key.split('.');
  let value: any = translations[lang];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || key;
}
