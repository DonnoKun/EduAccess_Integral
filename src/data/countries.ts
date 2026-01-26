/**
 * EduAccess - Country Data for Phone Input
 */

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  placeholder: string;
  minLength: number;
  maxLength: number;
}

export const countries: Country[] = [
  {
    code: 'MX',
    name: 'México',
    dialCode: '+52',
    flag: '🇲🇽',
    placeholder: '123 456 7890',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
    placeholder: '(555) 123-4567',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: 'ES',
    name: 'España',
    dialCode: '+34',
    flag: '🇪🇸',
    placeholder: '600 000 000',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: 'AR',
    name: 'Argentina',
    dialCode: '+54',
    flag: '🇦🇷',
    placeholder: '11 2345 6789',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: 'CO',
    name: 'Colombia',
    dialCode: '+57',
    flag: '🇨🇴',
    placeholder: '312 345 6789',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: 'CL',
    name: 'Chile',
    dialCode: '+56',
    flag: '🇨🇱',
    placeholder: '9 1234 5678',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: 'PE',
    name: 'Perú',
    dialCode: '+51',
    flag: '🇵🇪',
    placeholder: '912 345 678',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: 'VE',
    name: 'Venezuela',
    dialCode: '+58',
    flag: '🇻🇪',
    placeholder: '412 345 6789',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: 'GT',
    name: 'Guatemala',
    dialCode: '+502',
    flag: '🇬🇹',
    placeholder: '1234 5678',
    minLength: 8,
    maxLength: 8,
  },
  {
    code: 'CR',
    name: 'Costa Rica',
    dialCode: '+506',
    flag: '🇨🇷',
    placeholder: '8123 4567',
    minLength: 8,
    maxLength: 8,
  },
];

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code);
}

export function getDefaultCountry(): Country {
  return countries[0]; // Mexico
}

export function validatePhoneNumber(countryCode: string, phoneNumber: string): boolean {
  const country = getCountryByCode(countryCode);
  if (!country) return false;

  // Remove spaces, dashes, parentheses
  const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');

  // Check length
  if (cleanNumber.length < country.minLength) return false;
  if (cleanNumber.length > country.maxLength) return false;

  // Check if all digits
  if (!/^\d+$/.test(cleanNumber)) return false;

  return true;
}

export function getFullPhoneNumber(countryCode: string, phone: string): string {
  const country = getCountryByCode(countryCode);
  if (!country) return phone;
  
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return `${country.dialCode}${cleanPhone}`;
}

// Detect user's country from timezone
export function detectCountryFromTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Map timezones to country codes
    const timezoneMap: Record<string, string> = {
      'America/Mexico_City': 'MX',
      'America/Tijuana': 'MX',
      'America/Cancun': 'MX',
      'America/Monterrey': 'MX',
      'America/New_York': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Los_Angeles': 'US',
      'America/Phoenix': 'US',
      'Europe/Madrid': 'ES',
      'Atlantic/Canary': 'ES',
      'America/Argentina/Buenos_Aires': 'AR',
      'America/Bogota': 'CO',
      'America/Santiago': 'CL',
      'America/Lima': 'PE',
      'America/Caracas': 'VE',
      'America/Guatemala': 'GT',
      'America/Costa_Rica': 'CR',
    };

    // Check for exact match
    if (timezoneMap[timezone]) {
      return timezoneMap[timezone];
    }

    // Check for partial match
    if (timezone.includes('Mexico')) return 'MX';
    if (timezone.includes('Argentina')) return 'AR';

    return 'MX'; // Default to Mexico
  } catch {
    return 'MX';
  }
}
