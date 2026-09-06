import { useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { contactSafetyEnabled, reportPerson, setPersonBlock, type ReportReason } from '../lib/contactSafety';
import { ModalShell } from './ui/ModalShell';
import { AppButton } from './ui/AppButton';

export function PersonSafety({ personId, name, blocked = false }: { personId: string; name: string; blocked?: boolean }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [reason, setReason] = useState<ReportReason>('harassment');
  const [details, setDetails] = useState('');
  const [receipt, setReceipt] = useState(false);
  if (!contactSafetyEnabled() || personId === user?.id) return null;
  const run = async (operation: 'block' | 'report') => {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    try {
      if (operation === 'report') {
        await reportPerson(personId, reason, details);
        setReceipt(true); setDetails('');
      } else {
        await setPersonBlock(personId, !blocked);
        // A fresh document discards every cached list, open modal and pending
        // read together. Never leave blocked content visible in another hook.
        window.location.reload();
      }
    } catch { toast.error(t('safety.failed')); }
    finally { pending.current = false; setBusy(false); }
  };
  return <>
    <button type="button" className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full text-white/70 hover:bg-white/10"
      aria-label={t('safety.person', { name })} title={t('safety.title')} onClick={() => { setOpen(true); setReceipt(false); }}><Shield size={18} /></button>
    <ModalShell isOpen={open} onClose={() => { if (!pending.current) setOpen(false); }} name="PersonSafety" ariaLabel={t('safety.title')}>
      <div className="p-6 space-y-5 min-h-0 overflow-y-auto">
        <h2 className="text-xl font-semibold pr-10">{name}</h2>
        <p className="text-sm text-white/70">{t(blocked ? 'safety.unblockDetails' : 'safety.blockDetails')}</p>
        <AppButton variant="danger" className="w-full" disabled={busy} onClick={() => void run('block')}>{t(blocked ? 'safety.unblock' : 'safety.block')}</AppButton>
        <div className="border-t border-white/10 pt-4 space-y-3">
          <h3 className="font-semibold">{t('safety.report')}</h3>
          {receipt ? <p role="status" className="text-[var(--mode-accent)]">{t('safety.received')}</p> : <>
            <label className="block text-sm">{t('safety.reason')}<select className="input-field w-full mt-1" value={reason} disabled={busy} onChange={e => setReason(e.target.value as ReportReason)}>
              {(['harassment','unsafe_content','spam','other'] as const).map(value => <option key={value} value={value}>{t(`safety.${value}`)}</option>)}
            </select></label>
            <label className="block text-sm">{t('safety.details')}<textarea className="input-field w-full mt-1" rows={3} maxLength={1000} value={details} disabled={busy} onChange={e => setDetails(e.target.value)} /></label>
            <AppButton variant="secondary" className="w-full" disabled={busy} onClick={() => void run('report')}>{t('safety.send')}</AppButton>
          </>}
        </div>
      </div>
    </ModalShell>
  </>;
}
