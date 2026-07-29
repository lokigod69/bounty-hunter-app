// src/i18n/languages.test.ts
// Locks the language-registry invariants. The picker must never offer a
// language the app cannot actually render, and the fallback must always exist —
// both are silent failures in the browser, so they are pinned here instead.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  FALLBACK_LANGUAGE,
  toSupportedLanguage,
} from './languages';

const LOCALES_DIR = join(__dirname, 'locales');

function localeFile(code: string, ns: 'translation' | 'quotes'): string {
  return join(LOCALES_DIR, code, `${ns}.json`);
}

function leafKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    leafKeys(v, prefix ? `${prefix}.${k}` : k)
  );
}

function readLocale(code: string, ns: 'translation' | 'quotes'): Record<string, unknown> {
  return JSON.parse(readFileSync(localeFile(code, ns), 'utf-8'));
}

describe('language registry', () => {
  it('has unique codes', () => {
    expect(SUPPORTED_LANGUAGE_CODES).toHaveLength(new Set(SUPPORTED_LANGUAGE_CODES).size);
  });

  it('includes the fallback language', () => {
    expect(SUPPORTED_LANGUAGE_CODES).toContain(FALLBACK_LANGUAGE);
  });

  it('gives every language a native name and a flag', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang.nativeName.trim(), `${lang.code} nativeName`).not.toBe('');
      expect(lang.flag.trim(), `${lang.code} flag`).not.toBe('');
    }
  });

  it('always ships the fallback locale files', () => {
    expect(existsSync(localeFile(FALLBACK_LANGUAGE, 'translation'))).toBe(true);
    expect(existsSync(localeFile(FALLBACK_LANGUAGE, 'quotes'))).toBe(true);
  });
});

describe('toSupportedLanguage', () => {
  it('passes through supported codes', () => {
    expect(toSupportedLanguage('de')).toBe('de');
  });

  it('strips region subtags to the primary language', () => {
    // The old i18next LanguageDetector cached values like this, so existing
    // devices must keep the language they already chose.
    expect(toSupportedLanguage('de-DE')).toBe('de');
    expect(toSupportedLanguage('pt-BR')).toBe('pt');
    expect(toSupportedLanguage('en-GB')).toBe('en');
  });

  it('is case insensitive', () => {
    expect(toSupportedLanguage('DE')).toBe('de');
  });

  it('falls back for unknown, empty, and missing input', () => {
    expect(toSupportedLanguage('kl')).toBe(FALLBACK_LANGUAGE);
    expect(toSupportedLanguage('')).toBe(FALLBACK_LANGUAGE);
    expect(toSupportedLanguage(null)).toBe(FALLBACK_LANGUAGE);
    expect(toSupportedLanguage(undefined)).toBe(FALLBACK_LANGUAGE);
  });
});

describe('locale files that exist are complete', () => {
  // Every locale directory present on disk is checked against English. A locale
  // is allowed to be ABSENT (it is then simply not offered in the picker), but
  // a locale that exists and is missing keys renders English mid-sentence.
  const present = SUPPORTED_LANGUAGE_CODES.filter((code) =>
    existsSync(localeFile(code, 'translation'))
  );

  it('at least English and German are present', () => {
    expect(present).toContain('en');
    expect(present).toContain('de');
  });

  const enTranslationKeys = leafKeys(readLocale('en', 'translation')).sort();
  const enQuotesKeys = leafKeys(readLocale('en', 'quotes')).sort();

  for (const code of present) {
    if (code === 'en') continue;

    it(`${code}: translation keys match English exactly`, () => {
      const keys = leafKeys(readLocale(code, 'translation')).sort();
      const missing = enTranslationKeys.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !enTranslationKeys.includes(k));
      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    });

    it(`${code}: quotes keys match English exactly`, () => {
      expect(existsSync(localeFile(code, 'quotes'))).toBe(true);
      const keys = leafKeys(readLocale(code, 'quotes')).sort();
      const missing = enQuotesKeys.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !enQuotesKeys.includes(k));
      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    });

    it(`${code}: interpolation placeholders match English`, () => {
      // A dropped {{count}} is invisible in review and renders a broken
      // sentence in production.
      const en = readLocale('en', 'translation');
      const other = readLocale(code, 'translation');
      const placeholders = (s: unknown) =>
        typeof s === 'string' ? (s.match(/\{\{\s*[\w.]+\s*\}\}/g) ?? []).sort() : [];
      const get = (obj: unknown, path: string): unknown =>
        path.split('.').reduce<unknown>((acc, seg) => {
          if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[seg];
          return undefined;
        }, obj);

      const mismatched = enTranslationKeys
        .map((key) => ({
          key,
          en: placeholders(get(en, key)),
          other: placeholders(get(other, key)),
        }))
        .filter((r) => JSON.stringify(r.en) !== JSON.stringify(r.other));

      expect(mismatched).toEqual([]);
    });

    it(`${code}: rank words fit the header slot`, () => {
      // The rank word renders in a fixed slot in the header next to the sigil.
      // German UNGESCHWOREN (12) already forced the word to be hidden below the
      // xl breakpoint; .standing-rank ellipsises past 14ch, so anything longer
      // would silently truncate in the one place standing is displayed.
      const t = readLocale(code, 'translation') as {
        theme?: Record<string, Record<string, string>>;
      };
      const tooLong: Array<{ mode: string; key: string; word: string; len: number }> = [];
      for (const [mode, strings] of Object.entries(t.theme ?? {})) {
        for (let band = 0; band <= 4; band++) {
          const key = `rankBand${band}`;
          const word = strings?.[key];
          if (typeof word === 'string' && word.length > 14) {
            tooLong.push({ mode, key, word, len: word.length });
          }
        }
      }
      expect(tooLong).toEqual([]);
    });

    it(`${code}: no leaf value is an empty string`, () => {
      const other = readLocale(code, 'translation');
      const empties: string[] = [];
      const walk = (obj: unknown, prefix = '') => {
        if (typeof obj === 'string') {
          if (obj.trim() === '') empties.push(prefix);
          return;
        }
        if (obj && typeof obj === 'object') {
          for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
            walk(v, prefix ? `${prefix}.${k}` : k);
          }
        }
      };
      walk(other);
      expect(empties).toEqual([]);
    });
  }
});

describe('locale files are structurally sound', () => {
  const present = SUPPORTED_LANGUAGE_CODES.filter((code) =>
    existsSync(localeFile(code, 'translation'))
  );

  for (const code of present) {
    it(`${code}: has no duplicate keys`, () => {
      // JSON.parse silently keeps the LAST duplicate, so a shadowed key is
      // invisible to every other check. en/de both carried a duplicate
      // contracts.reject until 2026-07-29 — this stops it recurring.
      for (const ns of ['translation', 'quotes'] as const) {
        if (!existsSync(localeFile(code, ns))) continue;
        const raw = readFileSync(localeFile(code, ns), 'utf-8');
        const dupes: string[] = [];
        const stack: Array<Set<string>> = [];
        // Minimal scanner: track object depth and keys seen at each level.
        let inString = false;
        let escaped = false;
        let current = '';
        let lastKey: string | null = null;
        let expectingKey = false;
        for (let i = 0; i < raw.length; i++) {
          const ch = raw[i];
          if (inString) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === '"') {
              inString = false;
              if (expectingKey) lastKey = current;
            } else current += ch;
            continue;
          }
          if (ch === '"') {
            inString = true;
            current = '';
            continue;
          }
          if (ch === '{') {
            stack.push(new Set());
            expectingKey = true;
            continue;
          }
          if (ch === '}') {
            stack.pop();
            continue;
          }
          if (ch === ':') {
            const level = stack[stack.length - 1];
            if (level && lastKey !== null) {
              if (level.has(lastKey)) dupes.push(`${ns}:${lastKey}`);
              level.add(lastKey);
            }
            expectingKey = false;
            lastKey = null;
            continue;
          }
          if (ch === ',') {
            expectingKey = true;
            continue;
          }
        }
        expect(dupes, `${code}/${ns}`).toEqual([]);
      }
    });

    it(`${code}: is UTF-8 without a BOM and free of replacement chars`, () => {
      for (const ns of ['translation', 'quotes'] as const) {
        if (!existsSync(localeFile(code, ns))) continue;
        const buf = readFileSync(localeFile(code, ns));
        expect(buf.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), `${code}/${ns} BOM`).toBe(false);
        // U+FFFD means an encoding round-trip already destroyed characters.
        expect(buf.includes(Buffer.from([0xef, 0xbf, 0xbd])), `${code}/${ns} U+FFFD`).toBe(false);
      }
    });
  }
});
