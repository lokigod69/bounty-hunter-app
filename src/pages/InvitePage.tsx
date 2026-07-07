// src/pages/InvitePage.tsx
// Phase 2.5: recipient handler for shareable invite links (/invite/:token).
// PUBLIC route (reachable while logged out, like /login):
// - not authenticated: stash the token and bounce to /login; redemption resumes
//   post-login via useRedeemPendingInvite() in the authenticated Layout.
// - authenticated: redeem the token, show the outcome, then head to /friends.

import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useInvite, PENDING_INVITE_KEY } from '../hooks/useInvite';
import { AppButton, Spinner } from '../components/ui';
import logo from '../assets/logo5-small.png';

type InviteStatus = 'redeeming' | 'success' | 'error';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user, authLoading } = useAuth();
  const { redeemInvite } = useInvite();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const processedRef = useRef(false);
  const [status, setStatus] = useState<InviteStatus>('redeeming');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // Wait for auth to settle before deciding.
    if (authLoading) return;

    if (!token) {
      setStatus('error');
      setMessage(t('invite.page.invalid'));
      return;
    }

    // Logged out: stash the token and send them to sign in.
    if (!user) {
      localStorage.setItem(PENDING_INVITE_KEY, token);
      navigate('/login', { replace: true });
      return;
    }

    // Authenticated: redeem exactly once.
    if (processedRef.current) return;
    processedRef.current = true;

    (async () => {
      const result = await redeemInvite(token);
      // Clear any stash now that we've handled it directly.
      localStorage.removeItem(PENDING_INVITE_KEY);

      if (result.success) {
        setStatus('success');
        setMessage(result.message);
        window.setTimeout(() => navigate('/friends', { replace: true }), 1600);
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    })();
  }, [authLoading, user, token, redeemInvite, navigate, t]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
      <img src={logo} alt="Bounty Hunter" className="w-24 h-24 mb-4" />

      <h1 className="text-display app-title text-[var(--mode-accent)] mb-2">BOUNTY HUNTER</h1>

      <div className="glass-card w-full max-w-sm p-8 rounded-2xl text-center">
        {status === 'redeeming' && (
          <>
            <Spinner size="lg" className="mx-auto mb-4" />
            <p className="text-body text-white/70">{t('invite.page.redeeming')}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} className="mx-auto mb-4 text-[var(--mode-accent)]" />
            <p className="text-body text-white/90 mb-6">{message}</p>
            <AppButton variant="cta" fullWidth onClick={() => navigate('/friends', { replace: true })}>
              {t('invite.page.continue')}
            </AppButton>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
            <p className="text-body text-white/90 mb-6">{message}</p>
            <AppButton variant="secondary" fullWidth onClick={() => navigate('/', { replace: true })}>
              {t('invite.page.continue')}
            </AppButton>
          </>
        )}
      </div>
    </div>
  );
}
