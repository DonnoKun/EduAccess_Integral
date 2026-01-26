/**
 * EduAccess - Language Selector Component
 * Dropdown for switching between English and Spanish
 */

import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { changeLanguage, getCurrentLanguage } from '@/lib/i18n';

const languages = [
  { code: 'es' as const, label: 'Español', flag: '🇪🇸' },
  { code: 'en' as const, label: 'English', flag: '🇺🇸' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const currentLang = getCurrentLanguage();

  const handleLanguageChange = (lang: 'en' | 'es') => {
    changeLanguage(lang);
  };

  const currentLanguage = languages.find((l) => l.code === currentLang) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2" aria-label="Select language">
          <Globe className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{currentLanguage.flag} {currentLanguage.label}</span>
          <span className="sm:hidden">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background border">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`flex items-center gap-2 cursor-pointer ${
              currentLang === lang.code ? 'bg-accent' : ''
            }`}
          >
            <span aria-hidden="true">{lang.flag}</span>
            <span>{lang.label}</span>
            {currentLang === lang.code && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
