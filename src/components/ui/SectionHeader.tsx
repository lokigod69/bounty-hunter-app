// src/components/ui/SectionHeader.tsx
// Section heading with optional count chip and right-aligned action.

import React from 'react';
import { cn } from '../../lib/utils';

type SectionAccent = 'default' | 'warning' | 'success';

interface SectionHeaderProps {
  title: string;
  count?: number;
  accent?: SectionAccent;
  action?: React.ReactNode;
  className?: string;
}

const chipAccent: Record<SectionAccent, string> = {
  default: 'bg-[var(--mode-accent-soft)] text-[var(--mode-accent)]',
  warning: 'bg-yellow-500/15 text-yellow-300',
  success: 'bg-green-500/15 text-green-300',
};

export function SectionHeader({ title, count, accent = 'default', action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h2 className="text-subtitle text-white font-semibold flex items-center gap-2">
        {title}
        {count !== undefined && count > 0 && (
          <span className={cn('text-xs font-bold rounded-full px-2 py-0.5', chipAccent[accent])}>
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}

export default SectionHeader;
