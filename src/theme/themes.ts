// src/theme/themes.ts
// P1: Theme System - Theme definitions for Guild, Family, and Couple modes

import { ThemeDefinition, ThemeId } from './theme.types';

export const guildTheme: ThemeDefinition = {
  id: 'guild',
  label: 'Guild Mode',
  description: 'Playful, sci-fi inspired. Perfect for friends, crews, and gaming guilds.',
  strings: {
    appName: 'Bounty Hunter',
    missionSingular: 'mission',
    missionPlural: 'missions',
    crewLabel: 'crew',
    rewardSingular: 'bounty',
    rewardPlural: 'bounties',
    tokenSingular: 'credit',
    tokenPlural: 'credits',
    inboxTitle: 'Mission Inbox',
    inboxSubtitle: 'Contracts assigned to you for completion.',
    friendsTitle: 'Guild',  // R21: Simplified from "Guild Roster"
    storeTitle: 'Loot Vault',
    contractsLabel: 'Contracts',
    missionsLabel: 'Missions',
    historyLabel: 'History',
    issuedPageTitle: 'My Missions',
    issuedPageSubtitle: 'Missions you\'ve created for others to complete.',
    sectionDoNowTitle: 'Do this now',
    sectionWaitingApprovalTitle: 'Waiting for approval',
    sectionCompletedTitle: 'Recently completed',
    sectionIssuedSummaryTitle: 'Missions you\'ve issued',
    storeSubtitle: 'Redeem your credits for epic loot',
    storeCreditsLabel: 'Your Credits',
    storeCanAffordLabel: 'You can afford',
    storeCantAffordLabel: 'Out of reach',
    storeEmptyTitle: 'No bounties yet',
    storeEmptyBody: 'Create your first bounty to get started.',
    dailyLabel: 'Daily mission',
    streakLabel: 'streak',
  },
};

export const familyTheme: ThemeDefinition = {
  id: 'family',
  label: 'Family Mode',
  description: 'Warm and simple. Perfect for families sharing chores and tasks.',
  strings: {
    appName: 'Bounty Hunter',
    missionSingular: 'chore',
    missionPlural: 'chores',
    crewLabel: 'family',
    rewardSingular: 'reward',
    rewardPlural: 'rewards',
    tokenSingular: 'star',
    tokenPlural: 'stars',
    inboxTitle: 'Chore Inbox',
    inboxSubtitle: 'Chores assigned to you for completion.',
    friendsTitle: 'Family',  // R21: Simplified from "Your Family"
    storeTitle: 'Rewards',   // R21: Simplified from "Reward Store"
    contractsLabel: 'Chores',
    missionsLabel: 'Missions',  // R21: Standardized - Tab 2 is always "Missions"
    historyLabel: 'History',
    issuedPageTitle: 'My Missions',
    issuedPageSubtitle: 'Missions you\'ve created for your family to complete.',
    sectionDoNowTitle: 'Today\'s chores',
    sectionWaitingApprovalTitle: 'Waiting for approval',
    sectionCompletedTitle: 'Recently completed',
    sectionIssuedSummaryTitle: 'Chores you\'ve assigned',
    storeSubtitle: 'Exchange stars for rewards',
    storeCreditsLabel: 'Your Stars',
    storeCanAffordLabel: 'Within reach',
    storeCantAffordLabel: 'Keep earning',
    storeEmptyTitle: 'No rewards yet',
    storeEmptyBody: 'Add rewards to motivate your family.',
    dailyLabel: 'Daily chore',
    streakLabel: 'streak',
  },
};

export const coupleTheme: ThemeDefinition = {
  id: 'couple',
  label: 'Couple Mode',
  description: 'Intimate and light. Perfect for couples gamifying care and shared goals.',
  strings: {
    appName: 'Bounty Hunter',
    missionSingular: 'request',
    missionPlural: 'requests',
    crewLabel: 'partner',
    rewardSingular: 'gift',
    rewardPlural: 'gifts',
    tokenSingular: 'token',
    tokenPlural: 'tokens',
    inboxTitle: 'Request Inbox',
    inboxSubtitle: 'Requests your partner has sent you.',
    friendsTitle: 'Partner',  // R21: Simplified from "Your Partner"
    storeTitle: 'Gifts',      // R21: Simplified from "Gift Store"
    contractsLabel: 'Requests',
    missionsLabel: 'Missions',  // R21: Standardized - Tab 2 is always "Missions"
    historyLabel: 'History',
    issuedPageTitle: 'My Missions',
    issuedPageSubtitle: 'Missions you\'ve created for your partner to complete.',
    sectionDoNowTitle: 'Assigned to you',
    sectionWaitingApprovalTitle: 'Waiting for approval',
    sectionCompletedTitle: 'Recently completed',
    sectionIssuedSummaryTitle: 'Requests you\'ve made',
    storeSubtitle: 'Claim gifts with your tokens',
    storeCreditsLabel: 'Your Tokens',
    storeCanAffordLabel: 'You can afford',
    storeCantAffordLabel: 'Keep earning',
    storeEmptyTitle: 'No gifts yet',
    storeEmptyBody: 'Create gifts to celebrate your moments together.',
    dailyLabel: 'Daily moment',
    streakLabel: 'streak',
  },
};

export const themesById: Record<ThemeId, ThemeDefinition> = {
  guild: guildTheme,
  family: familyTheme,
  couple: coupleTheme,
};

export const DEFAULT_THEME_ID: ThemeId = 'guild';

