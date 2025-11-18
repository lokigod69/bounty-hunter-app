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
    friendsTitle: 'Guild Roster',
    storeTitle: 'Loot Vault',
    contractsLabel: 'Contracts',
    missionsLabel: 'Missions',
    historyLabel: 'History',
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
    friendsTitle: 'Your Family',
    storeTitle: 'Reward Store',
    contractsLabel: 'Chores',
    missionsLabel: 'Tasks',
    historyLabel: 'History',
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
    friendsTitle: 'Your Partner',
    storeTitle: 'Gift Store',
    contractsLabel: 'Requests',
    missionsLabel: 'Moments',
    historyLabel: 'History',
  },
};

export const themesById: Record<ThemeId, ThemeDefinition> = {
  guild: guildTheme,
  family: familyTheme,
  couple: coupleTheme,
};

export const DEFAULT_THEME_ID: ThemeId = 'guild';

