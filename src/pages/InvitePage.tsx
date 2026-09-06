import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useInvite, PENDING_INVITE_KEY, type RedeemResult } from '../hooks/useInvite';
import { AppButton, Spinner } from '../components/ui';
import logo from '../assets/logo5-small.png';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user, authLoading, profileLoading, hasProfile, profileError, refreshProfile } = useAuth();
  const { redeemInvite } = useInvite();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const request = useRef<{ key: string; promise: Promise<RedeemResult> } | null>(null);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!token) { setResult({ success: false, message: t('invite.page.invalid') }); return; }
    if (!user) {
      localStorage.setItem(PENDING_INVITE_KEY, token);
      navigate('/login', { replace: true });
      return;
    }
    if (!hasProfile) return;
    localStorage.setItem(PENDING_INVITE_KEY, token);
    const key = `${user.id}:${token}:${attempt}`;
    if (request.current?.key !== key) {
      setResult(null);
      request.current = { key, promise: redeemInvite(token) };
    }
    let cancelled = false;
    request.current.promise.then(outcome => {
      if (cancelled) return;
      if (outcome.success && localStorage.getItem(PENDING_INVITE_KEY) === token) {
        localStorage.removeItem(PENDING_INVITE_KEY);
        window.dispatchEvent(new Event('bounty:friendships-changed'));
      }
      setResult(outcome);
    });
    return () => { cancelled = true; };
  }, [authLoading, profileLoading, hasProfile, user, token, attempt, redeemInvite, navigate, t]);

  const continueWithoutInvite = () => {
    if (localStorage.getItem(PENDING_INVITE_KEY) === token) localStorage.removeItem(PENDING_INVITE_KEY);
    navigate('/', { replace: true });
  };
  return <div className="min-h-screen flex flex-col items-center justify-center text-white p-4 safe-top">
    <img src={logo} alt="Bounty Hunter" className="w-16 h-16 mb-6" />
    <div className="glass-card w-full max-w-sm p-6 rounded-2xl text-center">
      {profileError ? <>
        <AlertTriangle size={48} className="mx-auto mb-4 text-amber-400" />
        <p role="alert" className="mb-6">{t('invite.page.error')}</p>
        <AppButton variant="cta" fullWidth onClick={refreshProfile}>{t('common.tryAgain')}</AppButton>
      </> : !result ? <><Spinner size="lg" className="mx-auto mb-4" /><p>{t('invite.page.redeeming')}</p></>
        : result.success ? <>
          <CheckCircle size={48} className="mx-auto mb-4 text-[var(--mode-accent)]" />
          <p role="status" className="mb-6">{result.message}</p>
          <AppButton variant="cta" fullWidth onClick={() => navigate('/friends', { replace: true })}>{t('invite.page.continue')}</AppButton>
        </> : <>
          <AlertTriangle size={48} className="mx-auto mb-4 text-amber-400" />
          <p role="alert" className="mb-6">{result.message}</p>
          <AppButton variant="cta" fullWidth onClick={() => setAttempt(value => value + 1)}>{t('common.tryAgain')}</AppButton>
          <AppButton variant="ghost" fullWidth className="mt-3" onClick={continueWithoutInvite}>{t('invite.page.continue')}</AppButton>
        </>}
    </div>
  </div>;
}
