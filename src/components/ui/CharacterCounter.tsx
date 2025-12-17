// src/components/ui/CharacterCounter.tsx
// R27: Reusable character counter component for form inputs
// Shows current/max count and changes color when approaching/exceeding limit

import React from 'react';
import { formatCharCount } from '../../config/textLimits';

interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({
  current,
  max,
  className = '',
}) => {
  const remaining = max - current;
  const isOverLimit = remaining < 0;
  const isNearLimit = remaining <= 10 && remaining >= 0;

  return (
    <span
      className={`text-xs ${
        isOverLimit
          ? 'text-red-400 font-semibold'
          : isNearLimit
          ? 'text-amber-400'
          : 'text-white/40'
      } ${className}`}
    >
      {formatCharCount(current, max)}
    </span>
  );
};

export default CharacterCounter;
