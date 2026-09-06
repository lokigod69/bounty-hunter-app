// src/components/ui/AppButton.tsx
// Unified button with a clear visual hierarchy across the app.
// - cta: reflected crystal rim and accent tint, the primary action
// - secondary: quieter glass rim
// - ghost: quiet silver outline
// - danger: destructive actions
// Styling is delegated to the existing CSS button classes so the look stays consistent.

import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { feedback } from '../../utils/feedback';

export type AppButtonVariant = 'cta' | 'secondary' | 'ghost' | 'danger';

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClass: Record<AppButtonVariant, string> = {
  cta: 'btn-cta',
  secondary: 'btn-primary',
  ghost: 'btn-secondary',
  danger: 'btn-danger-galactic',
};

export function AppButton({
  variant = 'cta',
  loading = false,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  onClick,
  ...props
}: AppButtonProps) {
  const [pressCount, setPressCount] = useState(0);
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2',
        variantClass[variant],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      onClick={(e) => {
        setPressCount((count) => count + 1);
        feedback.tap();
        onClick?.(e);
      }}
      {...props}
    >
      <span key={pressCount} className="button-glint" data-pressed={pressCount > 0 || undefined} aria-hidden="true" />
      {loading ? (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

export default AppButton;
