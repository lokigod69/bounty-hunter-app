// src/components/layout/PageHeader.tsx
// Phase 1: Standardized page header with title, optional subtitle, and action buttons.

import React from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
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
        'flex flex-wrap items-start justify-between gap-3 mb-6',
        className
      )}
      {...props}
    >
      <div className="min-w-0 flex-1"><h1 className="page-heading">{title}</h1>
      {subtitle && (
        <p className="text-meta text-white/60">{subtitle}</p>
      )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}

