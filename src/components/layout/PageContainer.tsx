// src/components/layout/PageContainer.tsx
// Phase 1: Standardized page container for consistent layout across all pages.
// Provides consistent max-width, horizontal centering, padding, and vertical spacing.

import React from 'react';
import { cn } from '../../lib/utils';

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Standard page container that provides consistent layout structure.
 * - Max width: 5xl (1280px) for optimal reading width
 * - Horizontal padding: responsive (px-4 sm:px-6 lg:px-8)
 * - Vertical padding: responsive (py-4 sm:py-6 lg:py-8)
 * - Centers content horizontally
 */
export function PageContainer({ children, className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

