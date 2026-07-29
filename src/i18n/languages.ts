// src/i18n/languages.ts
// Single source of truth for which languages exist. The loader (i18n/index.ts)
// and the switcher (components/LanguageSwitcher.tsx) both read this list, so a
// new locale is added in exactly one place.
//
// Scope decided 2026-07-29: English + German (shipped) plus the Romance core
// first, then the next-largest European app markets. `nativeName` is what the
// switcher shows — a language picker that names languages in a language you may
// not read is a picker you cannot use.

export interface SupportedLanguage {
  /** BCP-47 primary subtag; also the locales/ directory name. */
  code: string;
  /** For our own docs and sorting — never rendered to a user. */
  englishName: string;
  /** Endonym, shown in the picker. */
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', englishName: 'English',    nativeName: 'English',    flag: '🇬🇧' },
  { code: 'de', englishName: 'German',     nativeName: 'Deutsch',    flag: '🇩🇪' },
  // Romance core — Michael's explicit priority.
  { code: 'es', englishName: 'Spanish',    nativeName: 'Español',    flag: '🇪🇸' },
  { code: 'pt', englishName: 'Portuguese', nativeName: 'Português',  flag: '🇵🇹' },
  { code: 'it', englishName: 'Italian',    nativeName: 'Italiano',   flag: '🇮🇹' },
  { code: 'fr', englishName: 'French',     nativeName: 'Français',   flag: '🇫🇷' },
  { code: 'ro', englishName: 'Romanian',   nativeName: 'Română',     flag: '🇷🇴' },
  // Next-largest European markets.
  { code: 'nl', englishName: 'Dutch',      nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', englishName: 'Polish',     nativeName: 'Polski',     flag: '🇵🇱' },
  { code: 'sv', englishName: 'Swedish',    nativeName: 'Svenska',    flag: '🇸🇪' },
  { code: 'da', englishName: 'Danish',     nativeName: 'Dansk',      flag: '🇩🇰' },
  { code: 'cs', englishName: 'Czech',      nativeName: 'Čeština',    flag: '🇨🇿' },
];

export const SUPPORTED_LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

export const FALLBACK_LANGUAGE = 'en';

/**
 * Narrow anything (a localStorage value, a browser tag like `pt-BR`) to a code
 * we actually ship. Unknown input falls back to English rather than leaving
 * i18next on a language with no resources.
 */
export function toSupportedLanguage(input: string | null | undefined): string {
  if (!input) return FALLBACK_LANGUAGE;
  const lower = input.toLowerCase();
  if (SUPPORTED_LANGUAGE_CODES.includes(lower)) return lower;
  // `pt-BR` -> `pt`, `de-CH` -> `de`.
  const primary = lower.split('-')[0];
  return SUPPORTED_LANGUAGE_CODES.includes(primary) ? primary : FALLBACK_LANGUAGE;
}
