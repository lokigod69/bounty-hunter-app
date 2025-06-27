// src/components/LanguageSwitcher.tsx
// A component for switching between supported languages.

import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'en', name: t('languageSwitcher.en'), flag: '🇬🇧' },
    { code: 'de', name: t('languageSwitcher.de'), flag: '🇩🇪' }
  ];

  const currentLanguage = languages.find(lang => i18n.language.startsWith(lang.code));

  return (
    <div className="relative flex items-center gap-2 group">
      <Globe className="w-5 h-5 text-gray-400" />
      <select
        value={currentLanguage?.code || 'en'}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm appearance-none cursor-pointer pr-8
                   focus:outline-none focus:border-emerald-500"
        aria-label={t('languageSwitcher.language')}
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  );
}
