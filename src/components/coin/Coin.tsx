// src/components/coin/Coin.tsx
// A reusable coin component with spinning animation and printed value
// The credit number is printed directly on the coin face

import React from 'react';

interface CoinProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  spin?: boolean;
  stackOffset?: boolean; // For back coin in double-coin stack
  'data-testid'?: string;
}

const Coin: React.FC<CoinProps> = ({
  value,
  size = 'md',
  spin = true,
  stackOffset = false,
  'data-testid': dataTestId,
}) => {
  const sizeMap = {
    sm: { dimension: 48, fontSize: 14, strokeWidth: 2 },
    md: { dimension: 64, fontSize: 18, strokeWidth: 2.5 },
    lg: { dimension: 80, fontSize: 22, strokeWidth: 3 },
  };

  const { dimension, fontSize, strokeWidth } = sizeMap[size];
  const radius = (dimension / 2) - strokeWidth * 2;
  const centerX = dimension / 2;
  const centerY = dimension / 2;

  // Determine if number needs scaling for large values
  const numDigits = value.toString().length;
  const textFontSize = numDigits > 3 ? fontSize * (3 / numDigits) : fontSize;

  return (
    <div
      className={`
        inline-block
        ${stackOffset ? 'translate-x-1 translate-y-1 scale-90 opacity-75' : ''}
        ${spin ? 'animate-[spin_3s_linear_infinite] motion-reduce:animate-none' : ''}
        will-change-transform
      `}
      data-testid={dataTestId}
      style={{
        width: `${dimension}px`,
        height: `${dimension}px`,
      }}
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        {/* Outer circle (coin edge) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="url(#coinGradient)"
          stroke="#D97706"
          strokeWidth={strokeWidth}
        />

        {/* Inner ring for depth */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.85}
          fill="none"
          stroke="#FCD34D"
          strokeWidth={strokeWidth * 0.8}
          opacity="0.4"
        />

        {/* Credit number printed on coin */}
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={textFontSize}
          fontWeight="bold"
          fill="#92400E"
          stroke="#FBBF24"
          strokeWidth="0.5"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            paintOrder: 'stroke fill',
          }}
        >
          {value}
        </text>

        {/* Gradient definition */}
        <defs>
          <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default Coin;
