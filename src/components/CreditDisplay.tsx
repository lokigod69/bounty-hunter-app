// src/components/CreditDisplay.tsx
// A reusable component for displaying credits with a sophisticated, dynamic shimmer animation
// Updated to use the new unified shimmer system with content-length-aware duration
// R19: Updated to use unified Coin component instead of emoji

import React from 'react';
import { useCreditShimmerDuration } from '../hooks/useShimmerDuration';
import { Coin, CoinSize } from './visual/Coin';

interface CreditDisplayProps {
  amount: number;
  size?: 'small' | 'medium' | 'large';
  shimmerType?: 'standard' | 'premium' | 'credit';
}

const CreditDisplay: React.FC<CreditDisplayProps> = ({
  amount,
  size = 'medium',
  shimmerType = 'credit'
}) => {
  const { shimmerStyle, setElementRef } = useCreditShimmerDuration(amount);

  const sizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl',
  };

  // R19: Map display sizes to Coin sizes
  const coinSizeMap: Record<'small' | 'medium' | 'large', CoinSize> = {
    small: 'sm',
    medium: 'md',
    large: 'lg',
  };

  // Dynamic shimmer class based on type
  const shimmerClasses = {
    standard: 'animate-shimmer',
    premium: 'animate-shimmer-premium',
    credit: 'animate-shimmer-credit',
  };

  // Gradient fallback for browsers that don't support background-clip: text
  const fallbackGradient = 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600';

  return (
    <div className="flex items-center font-bold">
      <span
        ref={setElementRef}
        className={`${shimmerClasses[shimmerType]} ${sizeClasses[size]} ${fallbackGradient} bg-clip-text text-transparent`}
        style={shimmerStyle}
        title={`${amount} credits`}
      >
        {amount}
      </span>
      <Coin size={coinSizeMap[size]} variant="subtle-spin" showValue={false} className="ml-2" />
    </div>
  );
};

export default CreditDisplay;
