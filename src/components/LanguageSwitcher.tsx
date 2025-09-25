"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' }
];

export default function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState<'en' | 'fr'>('en');

  useEffect(() => {
    // Get language from localStorage or auto-detect from browser
    const savedLang = localStorage.getItem('language') as 'en' | 'fr';
    
    if (savedLang) {
      setCurrentLang(savedLang);
    } else {
      // Auto-detect language from browser
      const browserLang = navigator.language.split('-')[0] as 'en' | 'fr';
      const detectedLang = (browserLang === 'fr') ? 'fr' : 'en';
      setCurrentLang(detectedLang);
      localStorage.setItem('language', detectedLang);
    }
  }, []);

  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0];

  const handleLanguageChange = (newLocale: 'en' | 'fr') => {
    setCurrentLang(newLocale);
    localStorage.setItem('language', newLocale);
    // Trigger a re-render by updating a global state or using a context
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: newLocale }));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguage.flag}</span>
          <span className="hidden md:inline">{currentLanguage.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code as 'en' | 'fr')}
            className="flex items-center gap-2"
          >
            <span>{language.flag}</span>
            <span>{language.name}</span>
            {language.code === currentLang && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
