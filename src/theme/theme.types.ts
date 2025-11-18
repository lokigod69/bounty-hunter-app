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
  // P3: Mission Inbox section titles
  sectionDoNowTitle: string; // e.g. "Do this now", "Today's chores", "Do this for your partner"
  sectionWaitingApprovalTitle: string; // e.g. "Waiting for approval"
  sectionCompletedTitle: string; // e.g. "Recently completed"
  sectionIssuedSummaryTitle: string; // e.g. "Missions you've issued"
  // P4: Reward Store labels
  storeSubtitle: string; // Short description under title
  storeCreditsLabel: string; // e.g. "Your Credits", "Your Stars", "Your Tokens"
  storeCanAffordLabel: string; // e.g. "You can afford", "Within reach"
  storeCantAffordLabel: string; // e.g. "Out of reach", "Keep earning"
  storeEmptyTitle: string; // e.g. "No rewards yet"
  storeEmptyBody: string; // Short empty state copy
  // P5: Daily missions labels
  dailyLabel: string; // e.g. "Daily mission", "Daily chore", "Daily moment"
  streakLabel: string; // e.g. "streak", "streak", "streak" (can be same across themes)
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

