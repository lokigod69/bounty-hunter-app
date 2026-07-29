// src/components/LanguageSwitcher.tsx
// A component for switching between supported languages.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES, toSupportedLanguage } from '../i18n/languages';
import { AVAILABLE_LANGUAGE_CODES, loadLanguage } from '../i18n';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [switching, setSwitching] = useState(false);

  const current = toSupportedLanguage(i18n.language);

  // Only languages whose files exist — never advertise a language that would
  // silently render English (see AVAILABLE_LANGUAGE_CODES).
  const languages = SUPPORTED_LANGUAGES.filter((lang) =>
    AVAILABLE_LANGUAGE_CODES.includes(lang.code)
  );

  // Languages are named by their endonym (Deutsch, Español, Polski) rather than
  // translated into the current UI language: someone hunting for their own
  // language scans for the word they recognise, and that word does not change
  // depending on which language the app happens to be in right now. It also
  // means adding a locale needs no new translation keys.
  const handleChange = async (code: string) => {
    setSwitching(true);
    try {
      // Non-English locales are lazy chunks — fetch before switching, or the
      // UI flashes English while the bundle is still in the air.
      await loadLanguage(code);
      await i18n.changeLanguage(code);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2 group">
      <Globe className="w-5 h-5 text-gray-400" />
      <select
        value={current}
        disabled={switching}
        onChange={(e) => void handleChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm appearance-none cursor-pointer pr-8
                   focus:outline-none focus:border-emerald-500 disabled:opacity-60"
        aria-label={t('languageSwitcher.language')}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.nativeName}
          </option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  );
}
