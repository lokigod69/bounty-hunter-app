// src/components/ui/EmptyState.tsx
// Standard empty-state card: centered mode-accent icon, title, body, optional actions.

import React from 'react';
import { cn } from '../../lib/utils';
import { BaseCard } from './BaseCard';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  children?: React.ReactNode; // action buttons
  className?: string;
}

export function EmptyState({ icon, title, body, children, className }: EmptyStateProps) {
  return (
    <BaseCard className={cn('text-center', className)}>
      <div className="py-8 px-2 flex flex-col items-center">
        {icon && (
          <div className="mb-4 text-[var(--mode-accent)] [&>svg]:w-12 [&>svg]:h-12">{icon}</div>
        )}
        <h3 className="text-subtitle text-white/90 mb-2">{title}</h3>
        {body && <p className="text-body text-white/60 max-w-md mb-2">{body}</p>}
        {children && (
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center w-full sm:w-auto">
            {children}
          </div>
        )}
      </div>
    </BaseCard>
  );
}

export default EmptyState;
