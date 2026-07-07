// src/components/visual/TypeEmblem.tsx
// R35: Contract-type emblem for gift/text rewards — mode-tinted ornate gold medallion.
// Dumb & decorative: renders the CURRENT MODE's gift emblem (maps themeId → webp).
// Sibling of Coin — same drop-shadow so it lifts off dark surfaces at matching weight.

import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeId } from '../../theme/theme.types';

import emblemGiftGuild from '../../assets/generated/emblem-gift-guild.webp';
import emblemGiftFamily from '../../assets/generated/emblem-gift-family.webp';
import emblemGiftCouple from '../../assets/generated/emblem-gift-couple.webp';

const giftEmblemByMode: Record<ThemeId, string> = {
  guild: emblemGiftGuild,
  family: emblemGiftFamily,
  couple: emblemGiftCouple,
};

export interface TypeEmblemProps {
  /** Rendered dimension in px (square). Default 32 to match Coin sm. */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Decorative gift emblem for the current mode.
 * Usage: <TypeEmblem size={32} /> as a reward-type indicator.
 */
const TypeEmblem: React.FC<TypeEmblemProps> = ({ size = 32, className = '' }) => {
  const { themeId } = useTheme();
  const src = giftEmblemByMode[themeId];

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={size}
      height={size}
      className={`block select-none pointer-events-none ${className}`.trim()}
      style={{
        width: size,
        height: size,
        // Match Coin's lift off dark surfaces
        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))',
      }}
    />
  );
};

export default TypeEmblem;

// Re-export for convenience
export { TypeEmblem };
