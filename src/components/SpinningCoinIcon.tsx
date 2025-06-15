// src/components/SpinningCoinIcon.tsx
// A reusable spinning coin icon component for consistent currency representation.
// Addresses lint issue: Uses specific props (LucideProps) from lucide-react.

import React from 'react';
import { Coins, LucideProps } from 'lucide-react';

interface SpinningCoinIconProps extends LucideProps {
  // Additional custom props can be defined here if needed
}

const SpinningCoinIcon: React.FC<SpinningCoinIconProps> = ({ 
  size = 16, 
  className = '', 
  color, // Will default to currentColor if not set, which text-amber-400 will provide via className
  ...rest 
}) => {
  return (
    <Coins
      size={size}
      className={`animate-spin-slow text-amber-400 ${className}`.trim()} // text-amber-400 sets currentColor
      color={color} // If color prop is passed, it overrides the currentColor set by className
      {...rest}
    />
  );
};

export default SpinningCoinIcon;
