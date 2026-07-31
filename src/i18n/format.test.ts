import { describe, expect, it, beforeEach } from 'vitest';
import {
  formatNumber,
  formatCompactNumber,
  formatDate,
  formatDuration,
  formatFileSize,
  formatPercent,
  __clearFormatterCaches,
} from './format';
import { SUPPORTED_LANGUAGE_CODES } from './languages';

// These tests exist because the bug class they cover is invisible to every other
// gate: `toLocaleString()` with no argument compiles, typechecks, lints, and
// renders perfectly - in the DEVICE's locale. It only misbehaves on someone
// else's phone, which is exactly where nobody was looking.

beforeEach(() => {
  __clearFormatterCaches();
});

describe('formatNumber', () => {
  it('groups by the locale, not the device', () => {
    expect(formatNumber('en', 2000)).toBe('2,000');
    expect(formatNumber('de', 2000)).toBe('2.000');
  });

  it('English and German disagree, which is the whole point', () => {
    // If these ever match, the locale argument is being ignored somewhere.
    expect(formatNumber('en', 1234567)).not.toBe(formatNumber('de', 1234567));
  });

  it('produces a non-empty string for every locale we ship', () => {
    for (const code of SUPPORTED_LANGUAGE_CODES) {
      expect(formatNumber(code, 1234).length).toBeGreaterThan(0);
    }
  });
});

describe('formatCompactNumber', () => {
  it('does not render an English "k" to non-English locales', () => {
    // The hand-rolled version emitted `${(v/1000).toFixed(1)}k` for everyone.
    // German abbreviates thousands as "Tsd.", not "k".
    const de = formatCompactNumber('de', 12000);
    expect(de.toLowerCase()).not.toMatch(/\d\s*k$/);
  });

  it('uses the locale decimal separator, not a hard-coded dot', () => {
    // toFixed(1) always emits ".", so nine of our twelve locales read "1.2k"
    // in a UI that writes every other number as "1,2".
    for (const code of ['fr', 'pl', 'cs', 'sv', 'da', 'nl', 'es', 'pt', 'ro']) {
      expect(formatCompactNumber(code, 1200)).toContain(',');
    }
  });

  it('respects locales that do not abbreviate thousands at all', () => {
    // Discovered while writing these tests, and worth pinning: German and
    // Italian CLDR short-compact notation does NOT abbreviate thousands. The
    // hand-rolled formatter rendered "1.2k" and "12k" to both; the correct
    // output is the full number. Abbreviation starts at millions.
    expect(formatCompactNumber('de', 1200)).toBe('1200');
    expect(formatCompactNumber('de', 12000)).toBe('12.000');
    expect(formatCompactNumber('it', 12000)).toBe('12.000');

    expect(formatCompactNumber('de', 1500000)).toContain('Mio');
    expect(formatCompactNumber('de', 1500000)).toContain(',');
  });

  it('never emits a bare English "k" to a locale that does not use one', () => {
    // pl "tys.", cs "tis.", sv "tn", da "t", es/pt "mil" - none of them "k".
    for (const code of ['de', 'pl', 'cs', 'sv', 'da', 'es', 'pt', 'it']) {
      expect(formatCompactNumber(code, 12000)).not.toMatch(/\d\s*k\b/i);
    }
  });

  it('still abbreviates in English', () => {
    expect(formatCompactNumber('en', 12000).toLowerCase()).toContain('k');
  });

  it('leaves small numbers unabbreviated', () => {
    expect(formatCompactNumber('en', 999)).toBe('999');
  });

  it('works for every locale we ship', () => {
    for (const code of SUPPORTED_LANGUAGE_CODES) {
      expect(formatCompactNumber(code, 15000).length).toBeGreaterThan(0);
    }
  });
});

describe('formatDate', () => {
  const d = new Date(Date.UTC(2026, 2, 3));

  it('follows the app locale', () => {
    expect(formatDate('en', d)).not.toBe(formatDate('de', d));
  });

  it('returns empty string for an unparseable value rather than "Invalid Date"', () => {
    // The old call sites fed `new Date(maybeNull)` straight into toLocaleDateString,
    // which renders the literal text "Invalid Date" to the user.
    expect(formatDate('en', 'not-a-date')).toBe('');
  });

  it('accepts Date, ISO string and epoch alike', () => {
    expect(formatDate('en', d)).toBe(formatDate('en', d.toISOString()));
    expect(formatDate('en', d)).toBe(formatDate('en', d.getTime()));
  });
});

describe('formatDuration', () => {
  it('does not render raw English d/h/m to German', () => {
    // TaskCard and MissionModalShell both hard-coded `${days}d ${hours}h ${mins}m`.
    const de = formatDuration('de', { days: 3, hours: 4, minutes: 12 });
    expect(de).not.toBe('3d 4h 12m');
  });

  it('drops zero-valued leading units but always keeps minutes', () => {
    expect(formatDuration('en', { days: 0, hours: 0, minutes: 5 })).not.toMatch(/\d+\s*d/);
    expect(formatDuration('en', { days: 0, hours: 0, minutes: 0 })).toMatch(/0/);
  });

  it('includes all three units when all are non-zero', () => {
    const en = formatDuration('en', { days: 3, hours: 4, minutes: 12 });
    expect(en).toContain('3');
    expect(en).toContain('4');
    expect(en).toContain('12');
  });

  it('works for every locale we ship', () => {
    for (const code of SUPPORTED_LANGUAGE_CODES) {
      expect(formatDuration(code, { days: 1, hours: 2, minutes: 3 }).length).toBeGreaterThan(0);
    }
  });
});

describe('formatFileSize', () => {
  it('uses the locale decimal separator', () => {
    // ProofModal hard-coded toFixed(2), so German uploads read "342.17 KB".
    expect(formatFileSize('de', 350382)).toContain(',');
    expect(formatFileSize('en', 350382)).toContain('.');
  });
});

describe('formatPercent', () => {
  it('formats a fraction as a locale-correct percentage', () => {
    expect(formatPercent('en', 0.42)).toBe('42%');
    // Several locales insert a (non-breaking) space before the sign.
    expect(formatPercent('fr', 0.42)).toMatch(/42\s*%/u);
  });
});

describe('memoization', () => {
  it('repeated calls agree with a freshly constructed formatter', () => {
    // The cache is keyed on locale + options; a collision would silently return
    // the wrong formatter, which is worse than no cache at all.
    const a = formatNumber('de', 9876.5, { minimumFractionDigits: 2 });
    const b = formatNumber('de', 9876.5, { minimumFractionDigits: 2 });
    const direct = new Intl.NumberFormat('de', { minimumFractionDigits: 2 }).format(9876.5);
    expect(a).toBe(b);
    expect(a).toBe(direct);
  });

  it('does not confuse different options for the same locale', () => {
    const plain = formatNumber('en', 1234.567);
    const twoDp = formatNumber('en', 1234.567, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(plain).not.toBe(twoDp);
  });

  it('does not confuse different locales for the same options', () => {
    expect(formatNumber('en', 1000)).not.toBe(formatNumber('de', 1000));
  });
});
