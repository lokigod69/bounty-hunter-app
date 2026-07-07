// src/components/visual/Coin.tsx
// R19: Unified coin component with consistent styling and animation variants
// R26: Coins with values/labels use 2D rotation (rotateZ) to prevent text mirroring
// R33: Coin face is premium raster art (coin-face.webp); value/label overlaid as live text
// Single source of truth for all coin visuals in the app

import React from 'react';
import coinFace from '../../assets/generated/coin-face.webp';

export type CoinVariant = 'static' | 'subtle-spin' | 'flip-loop';
export type CoinSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface CoinProps {
  /** Optional value to display on the coin face */
  value?: number;
  /** Size preset */
  size?: CoinSize;
  /** Animation variant */
  variant?: CoinVariant;
  /** Optional label/emblem in center (overrides value display) */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show value on coin face (default true if value provided) */
  showValue?: boolean;
}

// Size configurations
const sizeConfig: Record<CoinSize, { dimension: number; fontSize: number; emblemSize: number }> = {
  xs: { dimension: 24, fontSize: 8, emblemSize: 10 },
  sm: { dimension: 32, fontSize: 10, emblemSize: 12 },
  md: { dimension: 48, fontSize: 14, emblemSize: 16 },
  lg: { dimension: 64, fontSize: 18, emblemSize: 20 },
  xl: { dimension: 80, fontSize: 22, emblemSize: 24 },
};

// Animation class mapping for 3D animations (decorative coins without values)
const animationClasses3D: Record<CoinVariant, string> = {
  'static': '',
  'subtle-spin': 'animate-coin-subtle-spin',
  'flip-loop': 'animate-coin-flip',
};

// R26: 2D-safe animation for coins with text content (never mirrors)
const animationClasses2D: Record<CoinVariant, string> = {
  'static': '',
  'subtle-spin': 'animate-coin-spin-2d',
  'flip-loop': 'animate-coin-spin-2d', // Force 2D for flip-loop when showing values
};

/**
 * Unified Coin component for displaying credit/reward values
 *
 * Usage:
 * - <Coin value={10} /> - Shows coin with "10" on face
 * - <Coin size="sm" variant="subtle-spin" /> - Small spinning coin without value
 * - <Coin label="B" size="lg" /> - Large coin with "B" emblem
 */
const Coin: React.FC<CoinProps> = ({
  value,
  size = 'md',
  variant = 'subtle-spin',
  label,
  className = '',
  showValue = true,
}) => {
  const { dimension, fontSize, emblemSize } = sizeConfig[size];

  // Determine what to display on coin face
  const displayText = label ?? (showValue && value !== undefined ? String(value) : 'B');

  // R26: Coins showing a value or custom label should use 2D animation to prevent mirroring
  // Decorative coins (just "B" emblem) can use 3D animations
  const hasTextContent = label !== undefined || (showValue && value !== undefined);
  const animationClasses = hasTextContent ? animationClasses2D : animationClasses3D;

  // Adjust font size for longer numbers
  const numChars = displayText.length;
  const adjustedFontSize = numChars > 3 ? fontSize * (3 / numChars) : fontSize;

  return (
    <div
      className={`
        relative inline-flex items-center justify-center
        ${animationClasses[variant]}
        will-change-transform
        ${className}
      `.trim()}
      style={{
        width: dimension,
        height: dimension,
      }}
    >
      {/* Premium raster coin face; decorative — value/label carried by the text below */}
      <img
        src={coinFace}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={dimension}
        height={dimension}
        className="block select-none pointer-events-none"
        style={{
          width: dimension,
          height: dimension,
          // CSS drop-shadow (replaces SVG feDropShadow) so the coin lifts off dark surfaces
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35)) drop-shadow(0 1px 1px rgba(146,64,14,0.4))',
        }}
      />

      {/* Live value/label overlay — never baked into the art; readable by screen readers */}
      <span
        className="absolute inset-0 flex items-center justify-center font-bold leading-none select-none"
        style={{
          fontSize: label ? emblemSize : adjustedFontSize,
          color: '#4A2E08',
          textShadow: '0 1px 2px rgba(255,240,200,0.55), 0 0 1px rgba(255,244,214,0.9)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {displayText}
      </span>
    </div>
  );
};

export default Coin;

// Re-export for convenience
export { Coin };
