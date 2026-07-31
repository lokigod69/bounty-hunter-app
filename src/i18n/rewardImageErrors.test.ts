// src/i18n/rewardImageErrors.test.ts
// Pins the reward-image code -> copy contract, and the rule that made the two
// keys it covers dead in the first place.
//
// `validateRewardImage` used to return an English sentence, so the modals wrote
// `validation.error || t('rewards.imageField.invalidFile')` — the left side was
// always truthy, the key was never reached, and no test noticed because the key
// existed in all twelve locales. Copy that nothing renders is worse than a
// missing key: it looks translated.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import en from './locales/en/translation.json';
import de from './locales/de/translation.json';
import { rewardImageAllowedFormats, translateRewardImageError } from './rewardImageErrors';
import { validateRewardImage, REWARD_IMAGE_MAX_SIZE } from '../lib/rewardImageUpload';
import type { Translator } from './taskLifecycleErrors';

const SRC = join(__dirname, '..');

function lookup(bundle: unknown, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((acc, seg) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[seg];
    return undefined;
  }, bundle);
  return typeof value === 'string' ? value : undefined;
}

const translatorFor = (bundle: unknown): Translator => (key, options) => {
  const raw = lookup(bundle, key);
  if (raw === undefined) return key;
  if (!options) return raw;
  return raw.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, name: string) =>
    name in options ? String(options[name]) : whole
  );
};

/** Minimal File stand-in: validateRewardImage only reads .type and .size. */
function fakeFile(type: string, size: number): File {
  return { type, size } as File;
}

describe('reward image validation reports codes, not copy', () => {
  it('rejects a wrong MIME type with a code', () => {
    expect(validateRewardImage(fakeFile('application/zip', 1024))).toEqual({
      valid: false,
      errorCode: 'invalid_type',
    });
  });

  it('rejects an oversized file with a different code', () => {
    expect(validateRewardImage(fakeFile('image/png', REWARD_IMAGE_MAX_SIZE + 1))).toEqual({
      valid: false,
      errorCode: 'file_too_large',
    });
  });

  it('accepts a valid file', () => {
    expect(validateRewardImage(fakeFile('image/png', 1024))).toEqual({ valid: true });
  });

  it('returns no English sentence a caller could be tempted to render', () => {
    const result = validateRewardImage(fakeFile('application/zip', 1024)) as unknown as Record<string, unknown>;
    expect(result.error).toBeUndefined();
  });
});

describe('translateRewardImageError', () => {
  it('names the allowed formats for a wrong MIME type', () => {
    expect(translateRewardImageError('invalid_type', translatorFor(en)))
      .toBe('Invalid file type. Allowed formats: JPG, JPEG, PNG, GIF, WEBP.');
  });

  it('names the size cap for an oversized file', () => {
    expect(translateRewardImageError('file_too_large', translatorFor(en)))
      .toBe('File is too large. Maximum size is 5MB.');
  });

  it('gives the two failures different sentences', () => {
    const t = translatorFor(en);
    expect(translateRewardImageError('invalid_type', t))
      .not.toBe(translateRewardImageError('file_too_large', t));
  });

  it('falls back to the generic upload failure', () => {
    expect(translateRewardImageError('upload_failed', translatorFor(en))).toBe('Upload failed');
    expect(translateRewardImageError(undefined, translatorFor(en))).toBe('Upload failed');
  });

  it('translates, and interpolates, in German', () => {
    expect(translateRewardImageError('invalid_type', translatorFor(de)))
      .toBe('Ungültiger Dateityp. Erlaubte Formate: JPG, JPEG, PNG, GIF, WEBP.');
    expect(translateRewardImageError('file_too_large', translatorFor(de)))
      .toBe('Die Datei ist zu groß. Maximale Größe: 5 MB.');
  });

  it('never leaves a {{placeholder}} unresolved in any locale', () => {
    const dir = join(__dirname, 'locales');
    for (const code of readdirSync(dir)) {
      const file = join(dir, code, 'translation.json');
      const bundle = JSON.parse(readFileSync(file, 'utf-8'));
      const t = translatorFor(bundle);
      for (const errorCode of ['invalid_type', 'file_too_large', 'upload_failed', undefined] as const) {
        const message = translateRewardImageError(errorCode, t);
        expect(message, `${code}/${errorCode}`).not.toMatch(/\{\{/);
        expect(message, `${code}/${errorCode}`).not.toMatch(/^rewards\./);
      }
    }
  });

  it('shows the same format list the file hint promises', () => {
    expect(rewardImageAllowedFormats()).toBe('JPG, JPEG, PNG, GIF, WEBP');
  });
});

describe('no dead keys under rewards.imageField', () => {
  // A key nobody references is copy twelve translators paid for and no user
  // will ever see. CI is the only place this is visible.
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        return entry === 'locales' ? [] : walk(full);
      }
      if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) return [];
      return [full];
    });
  }

  const sources = walk(SRC).map((file) => readFileSync(file, 'utf-8')).join('\n');
  const keys = Object.keys((en as { rewards: { imageField: Record<string, string> } }).rewards.imageField);

  it('has keys to check', () => {
    expect(keys.length).toBeGreaterThan(5);
  });

  it.each(keys)('rewards.imageField.%s is referenced in src/', (key) => {
    expect(sources).toContain(`rewards.imageField.${key}`);
  });
});
