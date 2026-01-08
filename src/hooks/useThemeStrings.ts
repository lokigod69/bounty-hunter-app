// src/hooks/useThemeStrings.ts
// Hook to get translated theme strings based on current theme and language.
// Combines ThemeContext (mode: guild/family/couple) with i18n (language: en/de).

import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import type { ThemeStrings } from '../theme/theme.types';

/**
 * Returns theme strings translated to the current language.
 *
 * Usage:
 *   const { strings } = useThemeStrings();
 *   <h1>{strings.inboxTitle}</h1>
 *
 * The strings are based on the current theme (guild/family/couple) and
 * automatically translated to the user's selected language.
 */
export function useThemeStrings(): { strings: ThemeStrings; themeId: string } {
  const { t } = useTranslation();
  const { themeId } = useTheme();

  // Build translated strings object from i18n
  const strings: ThemeStrings = {
    appName: t(`theme.${themeId}.appName`),
    missionSingular: t(`theme.${themeId}.missionSingular`),
    missionPlural: t(`theme.${themeId}.missionPlural`),
    crewLabel: t(`theme.${themeId}.crewLabel`),
    rewardSingular: t(`theme.${themeId}.rewardSingular`),
    rewardPlural: t(`theme.${themeId}.rewardPlural`),
    tokenSingular: t(`theme.${themeId}.tokenSingular`),
    tokenPlural: t(`theme.${themeId}.tokenPlural`),
    inboxTitle: t(`theme.${themeId}.inboxTitle`),
    inboxSubtitle: t(`theme.${themeId}.inboxSubtitle`),
    friendsTitle: t(`theme.${themeId}.friendsTitle`),
    friendsSubtitle: t(`theme.${themeId}.friendsSubtitle`),
    friendsTabLabel: t(`theme.${themeId}.friendsTabLabel`),
    storeTitle: t(`theme.${themeId}.storeTitle`),
    contractsLabel: t(`theme.${themeId}.contractsLabel`),
    missionsLabel: t(`theme.${themeId}.missionsLabel`),
    historyLabel: t(`theme.${themeId}.historyLabel`),
    issuedPageTitle: t(`theme.${themeId}.issuedPageTitle`),
    issuedPageSubtitle: t(`theme.${themeId}.issuedPageSubtitle`),
    sectionDoNowTitle: t(`theme.${themeId}.sectionDoNowTitle`),
    sectionWaitingApprovalTitle: t(`theme.${themeId}.sectionWaitingApprovalTitle`),
    sectionCompletedTitle: t(`theme.${themeId}.sectionCompletedTitle`),
    sectionIssuedSummaryTitle: t(`theme.${themeId}.sectionIssuedSummaryTitle`),
    storeSubtitle: t(`theme.${themeId}.storeSubtitle`),
    storeCreditsLabel: t(`theme.${themeId}.storeCreditsLabel`),
    storeCanAffordLabel: t(`theme.${themeId}.storeCanAffordLabel`),
    storeCantAffordLabel: t(`theme.${themeId}.storeCantAffordLabel`),
    storeEmptyTitle: t(`theme.${themeId}.storeEmptyTitle`),
    storeEmptyBody: t(`theme.${themeId}.storeEmptyBody`),
    storeCreateFirstButton: t(`theme.${themeId}.storeCreateFirstButton`),
  };

  return { strings, themeId };
}

export default useThemeStrings;
