// src/components/coin/DoubleCoinValue.tsx
// A component that renders two stacked spinning coins with the credit value printed on the front coin
// No medallion frames or badges - just clean stacked coins

import React from 'react';
import Coin from './Coin';

interface DoubleCoinValueProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}

const DoubleCoinValue: React.FC<DoubleCoinValueProps> = ({ value, size = 'md' }) => {
  return (
    <div
      className="relative inline-flex items-center justify-center"
      data-testid="double-coin"
      aria-label={`Cost: ${value} credits`}
    >
      {/* Back coin - offset and slightly smaller */}
      <div className="absolute">
        <Coin
          value={value}
          size={size}
          spin={true}
          stackOffset={true}
          data-testid="coin-back"
        />
      </div>

      {/* Front coin - full size, centered, credit number visible */}
      <div className="relative z-10">
        <Coin
          value={value}
          size={size}
          spin={true}
          stackOffset={false}
          data-testid="coin-front"
        />
      </div>
    </div>
  );
};

export default DoubleCoinValue;
