// src/components/layout/StatsRow.tsx
// Phase 1: Standardized stats row component for displaying summary statistics.

import React from 'react';
import { cn } from '../../lib/utils';

interface StatItem {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  iconColor?: string;
}

interface StatsRowProps extends React.HTMLAttributes<HTMLDivElement> {
  stats: StatItem[];
}

/**
 * Standard stats row component for displaying summary statistics.
 * Used consistently across Dashboard, IssuedPage, etc.
 */
export function StatsRow({ stats, className, ...props }: StatsRowProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap justify-around items-center mb-8 py-4 gap-4 sm:gap-8 md:gap-12',
        className
      )}
      {...props}
    >
      {stats.map((stat, index) => (
        <div key={index} className="text-center flex flex-col items-center">
          <div className={cn('mb-2', stat.iconColor || 'text-slate-400')}>
            {stat.icon}
          </div>
          <div className="text-title font-bold text-slate-100">{stat.value}</div>
          <div className="text-meta text-slate-400">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

