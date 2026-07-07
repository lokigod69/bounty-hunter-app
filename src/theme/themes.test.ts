import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import en from '../i18n/locales/en/translation.json';
import de from '../i18n/locales/de/translation.json';
import { themesById } from './themes';
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
] as const;

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
          [...requiredThemeStringKeys].sort()
        );
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
