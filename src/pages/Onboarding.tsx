import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Gift, Send, CheckCircle2, Share2, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../hooks/useFriends';
import { useInvite } from '../hooks/useInvite';
import { markOnboardingCompleted } from '../lib/ftxGate';
import { PageContainer } from '../components/layout/PageContainer';
import { PageBody } from '../components/layout/PageBody';
import { AppButton, PageState } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import heroGuild from '../assets/generated/hero-guild.webp';

export default function Onboarding() {
  const { t } = useTranslation();
  const { user, profile, authLoading, hasSession } = useAuth();
  const { friends, loading } = useFriends(profile ? user?.id : undefined);
  const { shareInviteLink } = useInvite();
  const navigate = useNavigate();
  const [sharing, setSharing] = useState(false);
  if (authLoading) return <PageState state="loading" />;
  if (!hasSession) return <Navigate to="/login" replace />;

  const finish = () => {
    markOnboardingCompleted(user?.id);
    navigate(friends.length ? '/issued?create=1' : '/friends', { replace: true });
  };
  return <PageContainer className="max-w-2xl min-h-screen safe-top">
    <div className="flex justify-end mb-4"><LanguageSwitcher /></div>
    <PageBody>
      <div className="intro-hero"><img src={heroGuild} alt="" /><div /></div>
      <div>
        <p className="text-sm text-[var(--mode-accent)] mb-2">Bounty Hunter</p>
        <h1 className="page-heading mb-3">{t('workflow.introTitle')}</h1>
        <p className="text-white/70 leading-relaxed">{t('workflow.introBody')}</p>
      </div>
      <ol className="space-y-5">
        {[
          { Icon: Send, title: 'sendTitle', body: 'sendBody' },
          { Icon: CheckCircle2, title: 'reviewTitle', body: 'reviewBody' },
          { Icon: Gift, title: 'rewardTitle', body: 'rewardBody' },
        ].map(({ Icon, title, body }, index) => <li key={title} className="flex gap-4">
          <span className="flex-shrink-0 mt-1 text-[var(--mode-accent)]"><Icon size={22} aria-hidden="true" /></span>
          <div><h2 className="font-semibold mb-1">{index + 1}. {t(`workflow.${title}`)}</h2><p className="text-sm text-white/65 leading-relaxed">{t(`workflow.${body}`)}</p></div>
        </li>)}
      </ol>
      <div className="space-y-3 pt-2">
        <AppButton variant="cta" fullWidth icon={<ArrowRight size={18} />} onClick={finish}>{t('workflow.getStarted')}</AppButton>
        {!loading && friends.length === 0 && <AppButton variant="ghost" fullWidth loading={sharing} icon={<Share2 size={18} />}
          onClick={async () => { setSharing(true); try { await shareInviteLink(); } finally { setSharing(false); } }}>{t('invite.inviteSomeone')}</AppButton>}
        <p className="text-center text-xs text-white/50">{t('workflow.customizeLater')}</p>
      </div>
    </PageBody>
  </PageContainer>;
}
