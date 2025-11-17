// src/components/layout/PageBody.tsx
// Phase 1: Standardized page body wrapper for main content areas.

import React from 'react';
import { cn } from '../../lib/utils';

interface PageBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Standard page body wrapper.
 * Provides consistent spacing and layout for main content.
 */
export function PageBody({ children, className, ...props }: PageBodyProps) {
  return (
    <div
      className={cn(
        'space-y-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

