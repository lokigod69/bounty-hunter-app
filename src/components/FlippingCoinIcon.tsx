// This file was created by Cascade to implement a single, flipping coin animation.
// This component renders a coin emoji and applies a 3D flipping animation.

import React from 'react';

interface FlippingCoinIconProps {
  className?: string;
}

const FlippingCoinIcon: React.FC<FlippingCoinIconProps> = ({ className = '' }) => {
  return (
    <span 
      className={`inline-block animate-proper-spin ${className}`.trim()}
      role="img"
      aria-label="Flipping coin"
    >
      🪙
    </span>
  );
};

export default FlippingCoinIcon;
