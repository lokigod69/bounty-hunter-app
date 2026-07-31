import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import en from '../i18n/locales/en/translation.json';
import de from '../i18n/locales/de/translation.json';
import {
  themesById,
  DEFAULT_THEME_ID,
  PUBLIC_THEME_IDS,
  isThemeId,
  toPublicThemeId,
} from './themes';
import type { ThemeId } from './theme.types';
import { MODE_ACCENT_HEX, MODE_ACCENT_RGB } from './modeAccents';
import { modeColors } from './modalTheme';

const themeIds = Object.keys(themesById) as ThemeId[];

const requiredThemeStringKeys = [
  'appName',
  'missionSingular',
  'missionPlural',
  'crewLabel',
  'rewardSingular',
  'rewardPlural',
  'tokenSingular',
  'tokenPlural',
  'inboxTitle',
  'inboxSubtitle',
  'friendsTitle',
  'friendsSubtitle',
  'friendsTabLabel',
  'storeTitle',
  'contractsLabel',
  'missionsLabel',
  'historyLabel',
  'issuedPageTitle',
  'issuedPageSubtitle',
  'sectionDoNowTitle',
  'sectionWaitingApprovalTitle',
  'sectionCompletedTitle',
  'sectionIssuedSummaryTitle',
  'storeSubtitle',
  'storeCreditsLabel',
  'storeCanAffordLabel',
  'storeCantAffordLabel',
  'storeEmptyTitle',
  'storeEmptyBody',
  'storeCreateFirstButton',
  'dailyLabel',
  'streakLabel',
  'archiveTitle',
  'archiveSubtitle',
  'archiveEmptyTitle',
  'archiveEmptyBody',
  'rankBand0',
  'rankBand1',
  'rankBand2',
  'rankBand3',
  'rankBand4',
] as const;

// The mode's own name and one-line pitch are not ThemeStrings — they are copy
// for the selector, and they live only in i18n (ThemeDefinition deliberately
// has no label/description field any more). The locale bundle therefore carries
// exactly the theme strings PLUS these two.
const extraLocaleThemeKeys = ['label', 'description'] as const;

describe('theme string contract', () => {
  it('keeps every mode on the same required static string contract', () => {
    for (const themeId of themeIds) {
      expect(Object.keys(themesById[themeId].strings).sort()).toEqual(
        [...requiredThemeStringKeys].sort()
      );
    }
  });

  it('keeps English and German translations aligned with the required theme keys', () => {
    for (const locale of [en, de]) {
      for (const themeId of themeIds) {
        expect(Object.keys(locale.theme[themeId]).sort()).toEqual(
          [...requiredThemeStringKeys, ...extraLocaleThemeKeys].sort()
        );
      }
    }
  });

  it('keeps the mode label and description out of the code and in i18n', () => {
    for (const themeId of themeIds) {
      // Re-adding them to the definition would put user-visible English back
      // in a TypeScript file where no locale can override it.
      expect(themesById[themeId]).not.toHaveProperty('label');
      expect(themesById[themeId]).not.toHaveProperty('description');
      for (const locale of [en, de]) {
        expect(locale.theme[themeId].label.trim()).not.toBe('');
        expect(locale.theme[themeId].description.trim()).not.toBe('');
      }
    }
  });
});

describe('mode accent single source of truth (theme/modeAccents.ts)', () => {
  it('keeps modalTheme.modeColors derived from modeAccents (no drift between the two TS copies)', () => {
    for (const themeId of themeIds) {
      expect(modeColors[themeId].accent).toBe(MODE_ACCENT_HEX[themeId]);
      expect(modeColors[themeId].accentRgb).toBe(MODE_ACCENT_RGB[themeId]);
    }
  });

  it('keeps src/index.css --mode-accent values in sync with modeAccents.ts (CSS is a required duplicate)', () => {
    const cssPath = fileURLToPath(new URL('../index.css', import.meta.url));
    const css = readFileSync(cssPath, 'utf-8');

    // Default :root block ships the Guild accent.
    expect(css).toMatch(new RegExp(`--mode-accent:\\s*${MODE_ACCENT_HEX.guild}\\s*;`, 'i'));

    // Family/Couple are overridden via [data-mode="..."] blocks.
    for (const themeId of ['family', 'couple'] as ThemeId[]) {
      const blockMatch = css.match(
        new RegExp(`\\[data-mode="${themeId}"\\]\\s*\\{([^}]*)\\}`, 's')
      );
      expect(blockMatch, `expected a [data-mode="${themeId}"] block in index.css`).toBeTruthy();
      expect(blockMatch![1]).toMatch(
        new RegExp(`--mode-accent:\\s*${MODE_ACCENT_HEX[themeId]}\\s*;`, 'i')
      );
    }
  });
});

// V1 public gating policy (theme-leak hardening, 2026-07-11): stale device
// state must never surface a non-public theme on public pages or for fresh
// accounts. These guard the shared policy helpers every consumer relies on.
describe('public theme policy', () => {
  it('V1 exposes only guild publicly, and the default is public', () => {
    expect(PUBLIC_THEME_IDS).toEqual(['guild']);
    expect(PUBLIC_THEME_IDS).toContain(DEFAULT_THEME_ID);
  });

  it('isThemeId accepts exactly the known theme ids', () => {
    for (const id of themeIds) expect(isThemeId(id)).toBe(true);
    for (const bad of [null, undefined, '', 'GUILD', 'dark', 42, {}]) {
      expect(isThemeId(bad)).toBe(false);
    }
  });

  it('toPublicThemeId keeps public themes and normalizes everything else to the default', () => {
    expect(toPublicThemeId('guild')).toBe('guild');
    // Gated themes are valid ThemeIds but must not pass through.
    expect(toPublicThemeId('family')).toBe(DEFAULT_THEME_ID);
    expect(toPublicThemeId('couple')).toBe(DEFAULT_THEME_ID);
    // Garbage and absent values fall back to the default.
    expect(toPublicThemeId(null)).toBe(DEFAULT_THEME_ID);
    expect(toPublicThemeId(undefined)).toBe(DEFAULT_THEME_ID);
    expect(toPublicThemeId('not-a-theme')).toBe(DEFAULT_THEME_ID);
  });
});
