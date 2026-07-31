// src/i18n/format.ts
//
// Every locale-aware format in the app goes through here.
//
// Two rules, both deliberate:
//
// 1. **Locale is always the first argument. This module never reads the active
//    language itself.** `src/domain/missions.ts` established the pattern when it
//    refused to import i18next so the domain layer could stay pure -
//    `TaskLifecycleRpcError` carries a `.code` and the UI localizes it. The same
//    rule applies to formatting: plain modules are *given* a locale by their
//    caller and never reach for a global. React components get the ergonomic
//    version from `useFormatters()`, which binds these to `i18n.language`.
//
// 2. **The Intl instances are memoized.** Constructing an `Intl.NumberFormat` is
//    expensive relative to what it does, and the countdown timers re-render every
//    card every 60 seconds. Building one per render was measurable.
//
// Why this exists at all: before it, the app called `toLocaleDateString(undefined)`
// and `toLocaleString()` with no argument in a dozen places. `undefined` means the
// *device* locale, not the app locale - so a German user on an en-US phone read
// German copy with "Mar 3, 2026" and "2,000" in it, and the rendering changed
// depending on whose phone it was. There was exactly one correct call site in the
// entire codebase.

/** The decimal/grouping behaviour of a locale, cached by locale + options. */
const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = locale + '|' + JSON.stringify(options);
  let f = numberFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, options);
    numberFormatters.set(key, f);
  }
  return f;
}

function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = locale + '|' + JSON.stringify(options);
  let f = dateFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    dateFormatters.set(key, f);
  }
  return f;
}

/**
 * A plain integer or decimal with the locale's own grouping and decimal marks.
 * 2000 -> "2,000" (en) / "2.000" (de) / "2 000" (fr).
 */
export function formatNumber(
  locale: string,
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  return numberFormat(locale, options).format(value);
}

/**
 * Abbreviated numbers for tight spaces: the credit badge in the header.
 *
 * This replaces a hand-rolled `${(v/1000).toFixed(1)}k`, which was wrong twice
 * over. "k" is an English abbreviation - German and the Nordics want "Tsd."/"tn",
 * Polish and Czech "tys." - and `toFixed` emits a "." decimal point in eleven of
 * our twelve locales, which write "1,2" not "1.2". Compact notation gets both
 * right from CLDR data, and it makes the old 1000/10000 thresholds unnecessary.
 */
export function formatCompactNumber(locale: string, value: number): string {
  return numberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
}

/** A calendar date in the app's language, never the device's. */
export function formatDate(
  locale: string,
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return dateFormat(locale, options).format(d);
}

/** A percentage. Several locales (fr, sv, cs) put a space before the sign. */
export function formatPercent(locale: string, fraction: number): string {
  return numberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(fraction);
}

/**
 * A file size in kilobytes. `style: 'unit'` gives the localized unit symbol and
 * the locale's decimal separator in one call - the previous
 * `${(bytes/1024).toFixed(2)} KB` hard-coded an English decimal point.
 */
export function formatFileSize(locale: string, bytes: number): string {
  return numberFormat(locale, {
    style: 'unit',
    unit: 'kilobyte',
    unitDisplay: 'short',
    maximumFractionDigits: 2,
  }).format(bytes / 1024);
}

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
}

/**
 * A countdown like "3d 4h 12m", localized.
 *
 * The d/h/m suffixes were raw English literals rendered to every locale. German
 * wants T/Std./Min., French j/h/min, Polish dz./godz./min. `unitDisplay: 'narrow'`
 * is the CLDR-correct source for those.
 *
 * Zero-valued leading units are dropped, matching the previous behaviour: minutes
 * always render, so a duration under a minute reads "0m" rather than empty.
 */
export function formatDuration(locale: string, { days, hours, minutes }: DurationParts): string {
  const parts: string[] = [];
  const unit = (value: number, u: 'day' | 'hour' | 'minute') =>
    numberFormat(locale, {
      style: 'unit',
      unit: u,
      unitDisplay: 'narrow',
      maximumFractionDigits: 0,
    }).format(value);

  if (days > 0) parts.push(unit(days, 'day'));
  if (hours > 0) parts.push(unit(hours, 'hour'));
  parts.push(unit(minutes, 'minute'));
  return parts.join(' ');
}

/** Test seam: the memo tables are module-global and would leak between cases. */
export function __clearFormatterCaches(): void {
  numberFormatters.clear();
  dateFormatters.clear();
}
