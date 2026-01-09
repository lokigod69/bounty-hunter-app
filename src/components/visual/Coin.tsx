// src/components/visual/Coin.tsx
// R19: Unified coin component with consistent styling and animation variants
// R26: Coins with values/labels use 2D rotation (rotateZ) to prevent text mirroring
// Single source of truth for all coin visuals in the app

import React from 'react';

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
const sizeConfig: Record<CoinSize, { dimension: number; fontSize: number; strokeWidth: number; emblemSize: number }> = {
  xs: { dimension: 24, fontSize: 8, strokeWidth: 1, emblemSize: 10 },
  sm: { dimension: 32, fontSize: 10, strokeWidth: 1.5, emblemSize: 12 },
  md: { dimension: 48, fontSize: 14, strokeWidth: 2, emblemSize: 16 },
  lg: { dimension: 64, fontSize: 18, strokeWidth: 2.5, emblemSize: 20 },
  xl: { dimension: 80, fontSize: 22, strokeWidth: 3, emblemSize: 24 },
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
  const config = sizeConfig[size];
  const { dimension, fontSize, strokeWidth, emblemSize } = config;
  const radius = (dimension / 2) - strokeWidth * 2;
  const centerX = dimension / 2;
  const centerY = dimension / 2;

  // Determine what to display on coin face
  const displayText = label ?? (showValue && value !== undefined ? String(value) : 'B');

  // R26: Coins showing a value or custom label should use 2D animation to prevent mirroring
  // Decorative coins (just "B" emblem) can use 3D animations
  const hasTextContent = label !== undefined || (showValue && value !== undefined);
  const animationClasses = hasTextContent ? animationClasses2D : animationClasses3D;

  // Adjust font size for longer numbers
  const numChars = displayText.length;
  const adjustedFontSize = numChars > 3 ? fontSize * (3 / numChars) : fontSize;

  // Unique gradient ID to prevent conflicts when multiple coins render
  const gradientId = `coinGradient-${React.useId()}`;

  return (
    <div
      className={`
        inline-flex items-center justify-center
        ${animationClasses[variant]}
        will-change-transform
        ${className}
      `.trim()}
      style={{
        width: dimension,
        height: dimension,
      }}
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="30%" stopColor="#FBBF24" />
            <stop offset="70%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <filter id={`${gradientId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#92400E" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Outer circle (coin edge) - darker rim */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill={`url(#${gradientId})`}
          stroke="#B45309"
          strokeWidth={strokeWidth}
          filter={`url(#${gradientId}-shadow)`}
        />

        {/* Inner ring for depth effect */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.82}
          fill="none"
          stroke="#FCD34D"
          strokeWidth={strokeWidth * 0.6}
          opacity="0.5"
        />

        {/* Inner disc highlight */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.75}
          fill="none"
          stroke="#FBBF24"
          strokeWidth={strokeWidth * 0.3}
          opacity="0.3"
        />

        {/* Center emblem/value */}
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={label ? emblemSize : adjustedFontSize}
          fontWeight="bold"
          fill="#92400E"
          stroke="#FDE68A"
          strokeWidth="0.5"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            paintOrder: 'stroke fill',
          }}
        >
          {displayText}
        </text>
      </svg>
    </div>
  );
};

export default Coin;

// Re-export for convenience
export { Coin };
