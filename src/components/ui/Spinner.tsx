// src/components/ui/Spinner.tsx
// The one loading spinner. Mode-accent colored, three sizes.
// Replaces the five ad-hoc spinner recipes that drifted across pages.

import { clsx } from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-2',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={clsx(
        'border-white/10 border-t-[var(--mode-accent)] rounded-full animate-spin',
        sizeClasses[size],
        className
      )}
    />
  );
}

export default Spinner;
