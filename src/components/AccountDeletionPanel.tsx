import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  deleteOwnAccount, getAccountDeletionOperation, reauthenticateAccountForDeletion,
  type AccountDeletionCode,
} from '../lib/accountDeletion';
import { AppButton } from './ui/AppButton';

interface Props {
  userId: string;
  onDeleted: () => Promise<void> | void;
  onBusyChange: (busy: boolean) => void;
}

/** Deliberately hidden by the parent until the deletion backend is verified. */
export function AccountDeletionPanel({ userId, onDeleted, onBusyChange }: Props) {
  const { t } = useTranslation();
  const [acknowledged, setAcknowledged] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  // A fresh Google or email session already qualifies. The server decides;
  // ask for a password only when it requires a new email/password session.
  const [needsPassword, setNeedsPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Ref guards rapid duplicate submissions before React commits the busy state.
  const inFlight = useRef(false);
  const operation = useRef<string>();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!acknowledged || inFlight.current || (needsPassword && !password)) return;
    inFlight.current = true;
    setBusy(true);
    onBusyChange(true);
    setMessage(null);
    try {
      if (needsPassword) {
        const secret = password;
        setPassword('');
        if (!await reauthenticateAccountForDeletion(secret)) {
          setMessage('passwordError');
          return;
        }
        setNeedsPassword(false);
      }
      operation.current ??= getAccountDeletionOperation(userId);
      setStarted(true);
      const result: AccountDeletionCode = await deleteOwnAccount(operation.current);
      if (result === 'deleted') {
        await onDeleted();
        return;
      }
      if (result === 'reauth_required') setNeedsPassword(true);
      setMessage(result);
    } catch {
      setMessage('retry_required');
    } finally {
      inFlight.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <details className="optional-details mt-5" open={started || undefined}>
      <summary className="text-red-300">{t('accountDeletion.title')}</summary>
      <form onSubmit={submit} className="space-y-4 pt-4" aria-busy={busy}>
        <p className="text-sm text-white/80">{t('accountDeletion.description')}</p>
        <p className="text-sm text-white/70">{t('accountDeletion.sharedData')}</p>
        <label className="flex gap-3 items-start text-sm min-h-[44px] py-2">
          <input type="checkbox" checked={acknowledged} disabled={busy || started}
            onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 accent-red-400" />
          <span>{t('accountDeletion.acknowledge')}</span>
        </label>
        {needsPassword && (
          <label className="block text-sm">
            <span className="block mb-2">{t('accountDeletion.password')}</span>
            <input type="password" value={password} autoComplete="current-password" required
              disabled={busy} onChange={(event) => setPassword(event.target.value)}
              className="input-field w-full" />
          </label>
        )}
        {message && <p role="alert" className="text-sm text-red-200">{t(`accountDeletion.${message}`)}</p>}
        <AppButton type="submit" variant="danger" fullWidth loading={busy}
          disabled={!acknowledged || (needsPassword && !password)}>
          {t(busy ? 'accountDeletion.deleting' : started ? 'accountDeletion.retry' : 'accountDeletion.confirm')}
        </AppButton>
      </form>
    </details>
  );
}
