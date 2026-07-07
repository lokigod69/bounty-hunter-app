// src/components/ui/PageState.tsx
// Standard loading / error states, consistent across pages.
// Wrap inside a PageContainer/PageBody at the call site.

import { AlertTriangle } from 'lucide-react';
import { BaseCard } from './BaseCard';
import { AppButton } from './AppButton';

interface PageStateProps {
  state: 'loading' | 'error';
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function PageState({ state, message, onRetry, retryLabel = 'Try again' }: PageStateProps) {
  if (state === 'loading') {
    return (
      <BaseCard>
        <div className="text-center py-12">
          <div className="w-12 h-12 border-2 border-t-[var(--mode-accent)] border-white/10 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-body text-white/70">{message ?? 'Loading…'}</p>
        </div>
      </BaseCard>
    );
  }

  return (
    <BaseCard className="border-red-500/30 bg-red-900/10">
      <div className="text-center py-10 flex flex-col items-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-subtitle text-white font-semibold mb-2">Something went wrong</h3>
        {message && <p className="text-body text-white/70 mb-4 max-w-md">{message}</p>}
        {onRetry && (
          <AppButton variant="secondary" onClick={onRetry}>
            {retryLabel}
          </AppButton>
        )}
      </div>
    </BaseCard>
  );
}

export default PageState;
