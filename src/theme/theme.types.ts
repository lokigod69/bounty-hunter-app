// src/theme/theme.types.ts
// P1: Theme System - Type definitions for theme modes (Guild, Family, Couple)

export type ThemeId = 'guild' | 'family' | 'couple';

export interface ThemeStrings {
  appName: string;
  missionSingular: string;
  missionPlural: string;
  crewLabel: string;
  rewardSingular: string;
  rewardPlural: string;
  tokenSingular: string;
  tokenPlural: string;
  inboxTitle: string; // e.g. "Mission Inbox", "Chore Inbox"
  friendsTitle: string; // e.g. "Your Crew", "Your Family", "Your Partner"
  storeTitle: string; // e.g. "Reward Store", "Loot Vault"
  contractsLabel: string; // Navigation label for contracts/missions inbox
  missionsLabel: string; // Navigation label for issued missions
  historyLabel: string; // Navigation label for archive/history
}

export interface ThemeDefinition {
  id: ThemeId;
  label: string;       // Human-friendly name for selector ("Guild Mode", "Family Mode", etc.)
  description: string; // Short description for selector UI
  strings: ThemeStrings;
  // Palette hooks for later:
  primaryColor?: string; 
  accentColor?: string;
}

