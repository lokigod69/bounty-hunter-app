// src/theme/accentVariants.ts
// R27: Per-card accent variants for visual differentiation
// Deterministic (same card always gets same accent) based on stable hash of ID

import { ThemeId } from './theme.types';

// ============================================================================
// Types
// ============================================================================

export interface AccentVariant {
  /** Background gradient (subtle) */
  backgroundGradient: string;
  /** Border color with low opacity */
  borderColor: string;
  /** Glow color for hover/focus states */
  glowColor: string;
  /** CSS class name for this variant */
  className: string;
}

// ============================================================================
// Variant Palettes per Mode
// ============================================================================

// Guild Mode: cyan/teal/navy variants (cool, sci-fi feel)
const guildVariants: AccentVariant[] = [
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(32, 249, 210, 0.08) 0%, rgba(6, 182, 212, 0.04) 100%)',
    borderColor: 'rgba(32, 249, 210, 0.2)',
    glowColor: 'rgba(32, 249, 210, 0.15)',
    className: 'accent-guild-0',
  },
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(34, 211, 238, 0.08) 0%, rgba(20, 184, 166, 0.04) 100%)',
    borderColor: 'rgba(34, 211, 238, 0.2)',
    glowColor: 'rgba(34, 211, 238, 0.15)',
    className: 'accent-guild-1',
  },
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(14, 165, 233, 0.04) 100%)',
    borderColor: 'rgba(56, 189, 248, 0.2)',
    glowColor: 'rgba(56, 189, 248, 0.15)',
    className: 'accent-guild-2',
  },
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(79, 70, 229, 0.04) 100%)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
    glowColor: 'rgba(99, 102, 241, 0.15)',
    className: 'accent-guild-3',
  },
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(45, 212, 191, 0.08) 0%, rgba(20, 184, 166, 0.04) 100%)',
    borderColor: 'rgba(45, 212, 191, 0.2)',
    glowColor: 'rgba(45, 212, 191, 0.15)',
    className: 'accent-guild-4',
  },
];

// Family Mode: amber/gold/warm variants
const familyVariants: AccentVariant[] = [
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(245, 215, 110, 0.08) 0%, rgba(251, 191, 36, 0.04) 100%)',
    borderColor: 'rgba(245, 215, 110, 0.2)',
    glowColor: 'rgba(245, 215, 110, 0.15)',
    className: 'accent-family-0',
  },
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%)',
    borderColor: 'rgba(251, 191, 36, 0.2)',
    glowColor: 'rgba(251, 191, 36, 0.15)',
    className: 'accent-family-1',
  },
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(252, 211, 77, 0.08) 0%, rgba(234, 179, 8, 0.04) 100%)',
    borderColor: 'rgba(252, 211, 77, 0.2)',
    glowColor: 'rgba(252, 211, 77, 0.15)',
    className: 'accent-family-2',
  },
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(253, 186, 116, 0.08) 0%, rgba(249, 115, 22, 0.04) 100%)',
    borderColor: 'rgba(253, 186, 116, 0.2)',
    glowColor: 'rgba(253, 186, 116, 0.15)',
    className: 'accent-family-3',
  },
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(254, 215, 170, 0.08) 0%, rgba(251, 146, 60, 0.04) 100%)',
    borderColor: 'rgba(254, 215, 170, 0.2)',
    glowColor: 'rgba(254, 215, 170, 0.15)',
    className: 'accent-family-4',
  },
];

// Couple Mode: pink/magenta/purple variants
const coupleVariants: AccentVariant[] = [
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(255, 111, 174, 0.08) 0%, rgba(236, 72, 153, 0.04) 100%)',
    borderColor: 'rgba(255, 111, 174, 0.2)',
    glowColor: 'rgba(255, 111, 174, 0.15)',
    className: 'accent-couple-0',
  },
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(244, 114, 182, 0.08) 0%, rgba(219, 39, 119, 0.04) 100%)',
    borderColor: 'rgba(244, 114, 182, 0.2)',
    glowColor: 'rgba(244, 114, 182, 0.15)',
    className: 'accent-couple-1',
  },
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(232, 121, 249, 0.08) 0%, rgba(192, 38, 211, 0.04) 100%)',
    borderColor: 'rgba(232, 121, 249, 0.2)',
    glowColor: 'rgba(232, 121, 249, 0.15)',
    className: 'accent-couple-2',
  },
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(251, 113, 133, 0.08) 0%, rgba(244, 63, 94, 0.04) 100%)',
    borderColor: 'rgba(251, 113, 133, 0.2)',
    glowColor: 'rgba(251, 113, 133, 0.15)',
    className: 'accent-couple-3',
  },
  {
    backgroundGradient: 'linear-gradient(135deg, rgba(196, 181, 253, 0.08) 0%, rgba(167, 139, 250, 0.04) 100%)',
    borderColor: 'rgba(196, 181, 253, 0.2)',
    glowColor: 'rgba(196, 181, 253, 0.15)',
    className: 'accent-couple-4',
  },
];

const variantsByMode: Record<ThemeId, AccentVariant[]> = {
  guild: guildVariants,
  family: familyVariants,
  couple: coupleVariants,
};

// ============================================================================
// Stable Hash Function
// ============================================================================

/**
 * Simple string hash function for stable, deterministic results
 * Same ID always produces same hash
 */
function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get a deterministic accent variant for a card based on its ID and current mode
 * @param mode Current theme mode (guild/family/couple)
 * @param id Card ID (mission/reward/contract ID)
 * @returns AccentVariant with styling properties
 */
export function getAccentVariant(mode: ThemeId, id: string): AccentVariant {
  const variants = variantsByMode[mode];
  const index = stableHash(id) % variants.length;
  return variants[index];
}

/**
 * Get the variant index for a card (0-4)
 * Useful if you need just the index for CSS class selection
 */
export function getAccentVariantIndex(mode: ThemeId, id: string): number {
  const variants = variantsByMode[mode];
  return stableHash(id) % variants.length;
}

/**
 * Get inline styles for applying accent variant to a card
 */
export function getAccentVariantStyles(
  mode: ThemeId,
  id: string
): React.CSSProperties {
  const variant = getAccentVariant(mode, id);
  return {
    background: variant.backgroundGradient,
    borderColor: variant.borderColor,
    boxShadow: `0 0 20px ${variant.glowColor}`,
  };
}

/**
 * Get just the background gradient style (for overlay usage)
 */
export function getAccentGradientOverlay(
  mode: ThemeId,
  id: string
): string {
  const variant = getAccentVariant(mode, id);
  return variant.backgroundGradient;
}
