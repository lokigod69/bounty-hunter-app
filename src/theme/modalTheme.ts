// src/theme/modalTheme.ts
// R9: Modal theming configuration for MissionModalShell
// Defines mode colors, role configurations, and state indicators

import { ThemeId } from './theme.types';

// ============================================================================
// Types
// ============================================================================

export type ModalRole = 'assignee' | 'creator' | 'store';
export type ModalState = 'pending' | 'review' | 'completed' | 'overdue' | 'archived';

// ============================================================================
// Mode Colors
// ============================================================================

export interface ModeColors {
  accent: string;
  accentRgb: string;
  accentSoft: string;
  accentMuted: string;
  icon: 'Shield' | 'Home' | 'Heart';
}

export const modeColors: Record<ThemeId, ModeColors> = {
  guild: {
    accent: '#20F9D2',
    accentRgb: '32, 249, 210',
    accentSoft: 'rgba(32, 249, 210, 0.12)',
    accentMuted: 'rgba(32, 249, 210, 0.5)',
    icon: 'Shield',
  },
  family: {
    accent: '#F5D76E',
    accentRgb: '245, 215, 110',
    accentSoft: 'rgba(245, 215, 110, 0.12)',
    accentMuted: 'rgba(245, 215, 110, 0.5)',
    icon: 'Home',
  },
  couple: {
    accent: '#FF6FAE',
    accentRgb: '255, 111, 174',
    accentSoft: 'rgba(255, 111, 174, 0.12)',
    accentMuted: 'rgba(255, 111, 174, 0.5)',
    icon: 'Heart',
  },
};

// ============================================================================
// Role Configuration
// ============================================================================

export interface RoleConfig {
  headerLabel: string;
  headerIcon: 'Target' | 'Stamp' | 'Coins';
}

export const roleConfig: Record<ModalRole, RoleConfig> = {
  assignee: {
    headerLabel: 'Assigned to you',
    headerIcon: 'Target',
  },
  creator: {
    headerLabel: 'You created this',
    headerIcon: 'Stamp',
  },
  store: {
    headerLabel: 'Reward',
    headerIcon: 'Coins',
  },
};

// ============================================================================
// State Configuration
// ============================================================================

export interface StateConfig {
  label: string;
  icon: 'Clock' | 'Eye' | 'Check' | 'AlertTriangle' | 'Archive';
  color: string;
  colorRgb: string;
  hasBorderAccent: boolean;
}

export const stateConfig: Record<ModalState, StateConfig> = {
  pending: {
    label: 'Open',
    icon: 'Clock',
    color: '#f59e0b',
    colorRgb: '245, 158, 11',
    hasBorderAccent: false,
  },
  review: {
    label: 'In Review',
    icon: 'Eye',
    color: '#8b5cf6',
    colorRgb: '139, 92, 246',
    hasBorderAccent: true,
  },
  completed: {
    label: 'Done',
    icon: 'Check',
    color: '#22c55e',
    colorRgb: '34, 197, 94',
    hasBorderAccent: true,
  },
  overdue: {
    label: 'Overdue',
    icon: 'AlertTriangle',
    color: '#ef4444',
    colorRgb: '239, 68, 68',
    hasBorderAccent: true,
  },
  archived: {
    label: 'Archived',
    icon: 'Archive',
    color: '#64748b',
    colorRgb: '100, 116, 139',
    hasBorderAccent: false,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the CSS custom properties object for a given mode
 */
export function getModeStyleVars(mode: ThemeId): React.CSSProperties {
  const colors = modeColors[mode];
  return {
    '--mode-accent': colors.accent,
    '--mode-accent-rgb': colors.accentRgb,
    '--mode-accent-soft': colors.accentSoft,
    '--mode-accent-muted': colors.accentMuted,
  } as React.CSSProperties;
}

/**
 * Map task status to modal state
 */
export function mapTaskStatusToModalState(
  status: string,
  isArchived?: boolean,
  deadline?: string | null
): ModalState {
  if (isArchived) return 'archived';

  // Check for overdue (pending with past deadline)
  if ((status === 'pending' || status === 'in_progress') && deadline) {
    const deadlineDate = new Date(deadline);
    if (deadlineDate < new Date()) {
      return 'overdue';
    }
  }

  switch (status) {
    case 'pending':
    case 'in_progress':
      return 'pending';
    case 'review':
      return 'review';
    case 'completed':
      return 'completed';
    case 'rejected':
      return 'overdue'; // Treat rejected as overdue for visual purposes
    default:
      return 'pending';
  }
}
