/**
 * EduAccess - Country Code Selector Component
 * Accessible dropdown for selecting phone country codes
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { countries, Country, detectCountryFromTimezone, getCountryByCode } from '@/data/countries';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface CountryCodeSelectorProps {
  value: string;
  onChange: (countryCode: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function CountryCodeSelector({
  value,
  onChange,
  disabled = false,
  compact = false,
}: CountryCodeSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedCountry = getCountryByCode(value) || countries[0];

  // Auto-detect country on mount if no value set
  useEffect(() => {
    if (!value) {
      const detectedCode = detectCountryFromTimezone();
      onChange(detectedCode);
    }
  }, []);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Filter countries based on search
  const filteredCountries = countries.filter((country) => {
    const query = searchQuery.toLowerCase();
    return (
      country.name.toLowerCase().includes(query) ||
      country.dialCode.includes(query) ||
      country.code.toLowerCase().includes(query)
    );
  });

  // Reset highlighted index when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredCountries.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCountries[highlightedIndex]) {
          handleSelect(filteredCountries[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (country: Country) => {
    onChange(country.code);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const highlightedEl = listRef.current.querySelector('[data-highlighted="true"]');
      highlightedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex items-center gap-1 px-3 h-12 rounded-md border border-input bg-background',
            'hover:bg-accent hover:text-accent-foreground transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:opacity-50 disabled:pointer-events-none',
            compact ? 'min-w-[90px]' : 'min-w-[120px]'
          )}
          aria-label={t('login.selectCountry')}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="text-lg" role="img" aria-label={selectedCountry.name}>
            {selectedCountry.flag}
          </span>
          <span className={cn('font-medium', compact ? 'text-sm' : 'text-base')}>
            {compact ? selectedCountry.dialCode : `${selectedCountry.dialCode}`}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform ml-auto',
              isOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      
      <PopoverContent
        className="w-[280px] p-0 bg-popover border border-border shadow-lg z-50"
        align="start"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('login.searchCountry')}
              className="pl-8 h-9 text-sm"
              aria-label={t('login.searchCountry')}
            />
          </div>
        </div>

        {/* Country List */}
        <div
          ref={listRef}
          role="listbox"
          aria-label={t('login.countryCode')}
          className="max-h-[250px] overflow-y-auto"
        >
          {filteredCountries.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {t('login.noCountriesFound')}
            </div>
          ) : (
            filteredCountries.map((country, index) => (
              <button
                key={country.code}
                type="button"
                role="option"
                aria-selected={country.code === value}
                data-highlighted={index === highlightedIndex}
                onClick={() => handleSelect(country)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  country.code === value && 'bg-primary/10 text-primary',
                  index === highlightedIndex && 'bg-accent'
                )}
              >
                <span className="text-xl" role="img" aria-hidden="true">
                  {country.flag}
                </span>
                <span className="flex-1 text-sm font-medium">{country.name}</span>
                <span className="text-sm text-muted-foreground">{country.dialCode}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
