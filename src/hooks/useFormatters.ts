// src/hooks/useFormatters.ts
//
// The component-facing half of src/i18n/format.ts.
//
// `format.ts` takes an explicit locale so plain modules can use it without
// reaching for a global (the rule src/domain/missions.ts set). Components should
// not have to thread `i18n.language` through every call site by hand, so this
// binds the active language once and re-binds when it changes.
//
// Depending on `useTranslation()` is what makes a language switch re-render these
// numbers and dates: the hook subscribes to i18next's `languageChanged`. Reading
// the singleton's `.language` directly would format correctly on first paint and
// then go stale the moment the user switched language, which is the subtler
// version of the bug this whole module exists to remove.

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatCompactNumber,
  formatDate,
  formatDuration,
  formatFileSize,
  formatNumber,
  formatPercent,
  type DurationParts,
} from '../i18n/format';

export interface Formatters {
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  compactNumber: (value: number) => string;
  date: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  duration: (parts: DurationParts) => string;
  fileSize: (bytes: number) => string;
  percent: (fraction: number) => string;
  /** The active language, for the rare call that needs to pass it onward. */
  locale: string;
}

export function useFormatters(): Formatters {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return useMemo<Formatters>(
    () => ({
      number: (value, options) => formatNumber(locale, value, options),
      compactNumber: (value) => formatCompactNumber(locale, value),
      date: (value, options) => formatDate(locale, value, options),
      duration: (parts) => formatDuration(locale, parts),
      fileSize: (bytes) => formatFileSize(locale, bytes),
      percent: (fraction) => formatPercent(locale, fraction),
      locale,
    }),
    [locale],
  );
}
