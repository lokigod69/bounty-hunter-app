// src/components/ui/BaseCard.tsx
// Phase 1: Standardized base card component for consistent card styling across the app.
// Provides consistent border radius, background, shadow, padding, and hover transitions.

import React from 'react';
import { cn } from '../../lib/utils';

interface BaseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'glass' | 'solid' | 'bordered';
  hover?: boolean;
}

/**
 * Base card component that provides consistent styling for all cards.
 * 
 * Variants:
 * - 'glass': Uses glass-card styling (default)
 * - 'solid': Solid background with border
 * - 'bordered': Simple border with transparent background
 * 
 * Props:
 * - variant: Card style variant
 * - hover: Enable hover effects (default: true)
 * - className: Additional classes (merged with base classes)
 */
export function BaseCard({ 
  children, 
  variant = 'glass', 
  hover = true,
  className,
  ...props 
}: BaseCardProps) {
  const variantClasses = {
    glass: 'glass-card',
    solid: 'bg-gray-800/90 border border-gray-700/50 rounded-xl',
    bordered: 'bg-transparent border border-gray-700/30 rounded-xl',
  };

  return (
    <div
      className={cn(
        variantClasses[variant],
        'transition-all duration-300 ease-in-out',
        hover && 'hover:shadow-lg',
        'spacing-card',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

