// src/components/CreditDisplay.tsx
// A reusable component for displaying credits with a sophisticated, dynamic shimmer animation
// Updated to use the new unified shimmer system with content-length-aware duration

import React from 'react';
import { useCreditShimmerDuration } from '../hooks/useShimmerDuration';

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

  const coinSizeClasses = {
    small: 'text-2xl',
    medium: 'text-3xl',
    large: 'text-4xl',
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
      <span className={`${coinSizeClasses[size]} animate-proper-spin ml-2`}>🪙</span>
    </div>
  );
};

export default CreditDisplay;
