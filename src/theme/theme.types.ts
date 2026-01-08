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
  inboxSubtitle: string; // R21: e.g. "Contracts assigned to you for completion."
  friendsTitle: string; // e.g. "Guild", "Family", "Partner"
  friendsSubtitle: string; // R24: Mode-aware description for Friends page
  friendsTabLabel: string; // R24: Tab label e.g. "Guild Members", "Family Members", "Partner"
  storeTitle: string; // e.g. "Rewards", "Loot Vault", "Gifts"
  contractsLabel: string; // Navigation label for contracts/missions inbox (Tab 1)
  missionsLabel: string; // Navigation label for issued missions (Tab 2) - always "Missions"
  historyLabel: string; // Navigation label for archive/history
  // R21: IssuedPage (Tab 2 destination) titles
  issuedPageTitle: string; // e.g. "My Missions"
  issuedPageSubtitle: string; // e.g. "Missions you've created for others to complete."
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
  storeCreateFirstButton: string; // e.g. "Create first bounty"
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

