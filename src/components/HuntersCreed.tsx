// src/components/HuntersCreed.tsx
// A component to display the daily quote, styled as the "Hunter's Creed".

import React from 'react';
import { useTranslation } from 'react-i18next';

interface Quote {
  text: string;
  author: string;
}

interface HuntersCreedProps {
  quote: Quote | null;
}

const HuntersCreed: React.FC<HuntersCreedProps> = ({ quote }) => {
  const { t } = useTranslation();

  if (!quote) {
    return null; // Don't render anything if there's no quote
  }

  return (
    <div className="mt-8 p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold text-teal-400 mb-3 tracking-wider uppercase">
        {t('contracts.huntersCreed')}
      </h3>
      <blockquote className="border-l-4 border-teal-500 pl-4">
                <p className="text-base md:text-lg lg:text-xl italic text-white/90">
          "{quote.text}"
        </p>
        <cite className="block text-right mt-2 text-gray-400">
          — {quote.author}
        </cite>
      </blockquote>
    </div>
  );
};

export default HuntersCreed;
