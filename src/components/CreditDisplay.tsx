// src/components/CreditDisplay.tsx
// A reusable component for displaying credits with a shiny, animated style.

import React from 'react';
interface CreditDisplayProps {
  amount: number;
  size?: 'small' | 'medium' | 'large';
}

const CreditDisplay: React.FC<CreditDisplayProps> = ({ amount, size = 'medium' }) => {
  const sizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl',
  };

  const coinSizeClasses = {
    small: 'text-2xl',
    medium: 'text-3xl',
    large: 'text-4xl',
  }

  return (
    <div className="flex items-center font-bold">
      <span className={`bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent animate-shimmer ${sizeClasses[size]}`}>
        {amount}
      </span>
      <span className={`${coinSizeClasses[size]} animate-proper-spin ml-2`}>🪙</span>
    </div>
  );
};

export default CreditDisplay;
