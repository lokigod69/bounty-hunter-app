// src/components/layout/PageHeader.tsx
// Phase 1: Standardized page header with title, optional subtitle, and action buttons.

import React from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string | React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
}

/**
 * Standard page header component.
 * - Title uses app-title typography class
 * - Subtitle uses text-meta for secondary text
 * - Optional actions slot for buttons/controls
 */
export function PageHeader({ title, subtitle, actions, className, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'text-center mb-8',
        className
      )}
      {...props}
    >
      <h1 className="text-display app-title mb-2">{title}</h1>
      {subtitle && (
        <p className="text-meta text-white/60">{subtitle}</p>
      )}
      {actions && (
        <div className="mt-4 flex justify-center gap-4">
          {actions}
        </div>
      )}
    </div>
  );
}

