// src/theme/modalTheme.ts
// R9: Modal theming configuration for MissionModalShell.
// Wave B: Rejected work has its own truthful orange "sent back" state.

import { ThemeId } from './theme.types';
import { MODE_ACCENT_HEX, MODE_ACCENT_RGB } from './modeAccents';

// ============================================================================
// Types
// ============================================================================

export type ModalRole = 'assignee' | 'creator' | 'store';
export type ModalState = 'pending' | 'in_progress' | 'review' | 'rejected' | 'completed' | 'overdue' | 'archived';

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

// Accent hex/RGB come from the single source of truth in modeAccents.ts;
// the soft/muted rgba shades are derived from the RGB triplet here.
export const modeColors: Record<ThemeId, ModeColors> = {
  guild: {
    accent: MODE_ACCENT_HEX.guild,
    accentRgb: MODE_ACCENT_RGB.guild,
    accentSoft: `rgba(${MODE_ACCENT_RGB.guild}, 0.12)`,
    accentMuted: `rgba(${MODE_ACCENT_RGB.guild}, 0.5)`,
    icon: 'Shield',
  },
  family: {
    accent: MODE_ACCENT_HEX.family,
    accentRgb: MODE_ACCENT_RGB.family,
    accentSoft: `rgba(${MODE_ACCENT_RGB.family}, 0.12)`,
    accentMuted: `rgba(${MODE_ACCENT_RGB.family}, 0.5)`,
    icon: 'Home',
  },
  couple: {
    accent: MODE_ACCENT_HEX.couple,
    accentRgb: MODE_ACCENT_RGB.couple,
    accentSoft: `rgba(${MODE_ACCENT_RGB.couple}, 0.12)`,
    accentMuted: `rgba(${MODE_ACCENT_RGB.couple}, 0.5)`,
    icon: 'Heart',
  },
};

// ============================================================================
// Role Configuration - Mode-aware role labels (R10)
// ============================================================================

export interface RoleConfig {
  headerLabel: string;
  headerIcon: 'Target' | 'Stamp' | 'Coins' | 'ListChecks' | 'ClipboardList' | 'Heart' | 'PenSquare' | 'Gift';
}

// Relationship and appearance do not change the meaning of a mission.
export const roleConfig: Record<ModalRole, RoleConfig> = {
  assignee: { headerLabel: 'workflow.forYou', headerIcon: 'Target' },
  creator: { headerLabel: 'workflow.sentByYou', headerIcon: 'Stamp' },
  store: { headerLabel: 'product.storeTitle', headerIcon: 'Gift' },
};

// ============================================================================
// State Configuration
// ============================================================================

export interface StateConfig {
  labelKey: string;
  icon: 'Clock' | 'Eye' | 'Check' | 'AlertTriangle' | 'Archive';
  color: string;
  colorRgb: string;
  hasBorderAccent: boolean;
}

export const stateConfig: Record<ModalState, StateConfig> = {
  pending: {
    labelKey: 'taskStatus.pending',
    icon: 'Clock',
    color: '#f59e0b',
    colorRgb: '245, 158, 11',
    hasBorderAccent: false,
  },
  in_progress: {
    labelKey: 'taskStatus.inProgress', icon: 'Clock', color: '#f59e0b', colorRgb: '245, 158, 11', hasBorderAccent: false,
  },
  review: {
    labelKey: 'taskStatus.review',
    icon: 'Eye',
    color: '#8b5cf6',
    colorRgb: '139, 92, 246',
    hasBorderAccent: true,
  },
  rejected: {
    labelKey: 'taskStatus.rejected',
    icon: 'AlertTriangle',
    color: '#f97316',
    colorRgb: '249, 115, 22',
    hasBorderAccent: true,
  },
  completed: {
    labelKey: 'taskStatus.completed',
    icon: 'Check',
    color: '#22c55e',
    colorRgb: '34, 197, 94',
    hasBorderAccent: true,
  },
  overdue: {
    labelKey: 'taskStatus.overdue',
    icon: 'AlertTriangle',
    color: '#ef4444',
    colorRgb: '239, 68, 68',
    hasBorderAccent: true,
  },
  archived: {
    labelKey: 'taskStatus.archived',
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
      return 'pending';
    case 'in_progress':
      return 'in_progress';
    case 'review':
      return 'review';
    case 'completed':
      return 'completed';
    case 'rejected':
      return 'rejected';
    default:
      return 'pending';
  }
}
