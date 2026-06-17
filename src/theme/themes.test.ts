import { describe, expect, it } from 'vitest';
import en from '../i18n/locales/en/translation.json';
import de from '../i18n/locales/de/translation.json';
import { themesById } from './themes';
import type { ThemeId } from './theme.types';

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
