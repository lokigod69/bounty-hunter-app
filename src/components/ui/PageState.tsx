// src/components/ui/PageState.tsx
// Standard loading / error states, consistent across pages.
// Wrap inside a PageContainer/PageBody at the call site.

import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BaseCard } from './BaseCard';
import { AppButton } from './AppButton';
import { Spinner } from './Spinner';

interface PageStateProps {
  state: 'loading' | 'error';
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function PageState({ state, message, onRetry, retryLabel }: PageStateProps) {
  const { t } = useTranslation();

  if (state === 'loading') {
    return (
      <BaseCard>
        <div className="text-center py-12">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-body text-white/70">{message ?? t('common.loading')}</p>
        </div>
      </BaseCard>
    );
  }

  return (
    <BaseCard className="border-red-500/30 bg-red-900/10">
      <div className="text-center py-10 flex flex-col items-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-subtitle text-white font-semibold mb-2">{t('common.somethingWentWrong')}</h3>
        {message && <p className="text-body text-white/70 mb-4 max-w-md">{message}</p>}
        {onRetry && (
          <AppButton variant="secondary" onClick={onRetry}>
            {retryLabel ?? t('common.tryAgain')}
          </AppButton>
        )}
      </div>
    </BaseCard>
  );
}

export default PageState;
