// src/components/layout/PageQuote.tsx
// R11: Unified quote/creed component for consistent placement across pages

import React from 'react';

interface PageQuoteProps {
  text: string;
  author?: string;
}

export function PageQuote({ text, author }: PageQuoteProps) {
  return (
    <div className="mt-8 text-center text-sm text-white/60">
      <p className="italic">"{text}"</p>
      {author && <p className="mt-1 text-xs text-white/40">– {author}</p>}
    </div>
  );
}

export default PageQuote;
