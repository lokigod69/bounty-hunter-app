// src/components/ui/AppButton.tsx
// Unified button with a clear visual hierarchy across the app.
// - cta: solid mode-accent fill, the single primary action on a screen
// - secondary: glowing ghost (legacy .btn-primary look)
// - ghost: quiet silver ghost (legacy .btn-secondary look)
// - danger: destructive actions
// Styling is delegated to the existing CSS button classes so the look stays consistent.

import React from 'react';
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
        feedback.tap();
        onClick?.(e);
      }}
      {...props}
    >
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
