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
  if (value && typeof value === 'string') return value;

  // Fall back to English if key missing in selected language
  if (lang !== 'en') {
    let fallback: any = translations['en'];
    for (const k of keys) {
      fallback = fallback?.[k];
    }
    if (fallback && typeof fallback === 'string') return fallback;
  }

  // Last resort: return the key itself (visible bug indicator)
  return key;
}
