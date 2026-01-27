/**
 * EduAccess - Language Selector Component
 * Dropdown for switching between English and Spanish
 * Respects user's font size preferences
 */

import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { changeLanguage, getCurrentLanguage } from '@/lib/i18n';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

const languages = [
  { code: 'es' as const, label: 'Español', flag: '🇪🇸' },
  { code: 'en' as const, label: 'English', flag: '🇺🇸' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const currentLang = getCurrentLanguage();
  const { visualProfile } = useStore();

  const handleLanguageChange = (lang: 'en' | 'es') => {
    changeLanguage(lang);
  };

  const currentLanguage = languages.find((l) => l.code === currentLang) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="language-btn h-auto gap-2 px-3 py-2" 
          aria-label="Select language"
        >
          <Globe className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="language-text whitespace-nowrap">
            {currentLanguage.flag} {currentLanguage.code.toUpperCase()}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="language-dropdown bg-background border min-w-[180px]"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              "language-item flex items-center gap-3 px-4 py-3 cursor-pointer",
              currentLang === lang.code && "bg-accent"
            )}
          >
            <span className="flag-icon flex-shrink-0 text-lg" aria-hidden="true">
              {lang.flag}
            </span>
            <span className="flex-1">{lang.label}</span>
            {currentLang === lang.code && (
              <Check className="h-4 w-4 text-primary ml-auto" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
