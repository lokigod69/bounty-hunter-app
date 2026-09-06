import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Gift, Target, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../hooks/useFriends';
import { useActionCounts } from '../hooks/useActionCounts';
import { useThemeStrings } from '../hooks/useThemeStrings';
import { usePayoutWatcher } from '../hooks/usePayoutWatcher';
import { useStanding, useRankUpWatcher } from '../hooks/useStanding';
import { avatarFallback } from '../lib/avatar';
import { feedback } from '../utils/feedback';
import logo from '../assets/logo5-small.png';
import UserCredits from './UserCredits';
import ProfileEditModal from './ProfileEditModal';
import { SealLayer } from './visual/Seal';
import { PayoutCeremony } from './visual/PayoutCeremony';
import { RankUpCeremony } from './visual/RankUpCeremony';

export default function Layout() {
  const { t } = useTranslation();
  const { strings } = useThemeStrings();
  const { user, profile } = useAuth();
  const { pendingRequests } = useFriends(user?.id);
  const { reviewCount, rejectedCount } = useActionCounts();
  const location = useLocation();
  const mainContentRef = useRef<HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  usePayoutWatcher(user?.id);
  const { standing, known, forUserId } = useStanding();
  useRankUpWatcher(forUserId, standing, known);

  useEffect(() => {
    mainContentRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  if (!user) return <Outlet />;

  const displayName = profile?.display_name || user.email?.split('@')[0] || t('layout.unknownUser');
  const navItems = [
    { path: '/', label: strings.missionsLabel, Icon: Target, active: ['/', '/issued', '/archive'].includes(location.pathname), count: reviewCount + rejectedCount },
    { path: '/rewards-store', label: strings.storeTitle, Icon: Gift, active: location.pathname === '/rewards-store', count: 0 },
    { path: '/friends', label: strings.friendsTitle, Icon: Users, active: location.pathname === '/friends', count: pendingRequests.length },
  ];
  const navigation = navItems.map(({ path, label, Icon, active, count }) => (
    <Link key={path} to={path} aria-current={active ? 'page' : undefined}
      onClick={() => feedback.tap()}
      className={`primary-nav-link ${active ? 'primary-nav-link-active' : ''}`}>
      <span className="relative inline-flex"><Icon size={22} aria-hidden="true" />
        {count > 0 && <span className="nav-count">{count}</span>}
      </span>
      <span>{label}</span>
    </Link>
  ));

  return (
    <div className="h-app flex flex-col">
      <SealLayer />
      <PayoutCeremony />
      <RankUpCeremony />
      <header className="flex-shrink-0 z-header safe-top app-header">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 min-w-0 mr-auto">
            <img src={logo} alt={t('layout.logoAlt')} className="h-9 w-9 flex-shrink-0" />
            <span className="app-title text-base text-white hidden sm:inline min-w-0 truncate">{strings.appName}</span>
          </Link>
          <nav aria-label={t('workflow.navigation')} className="hidden nav:flex items-center gap-2">{navigation}</nav>
          <Link to="/rewards-store" data-credit-anchor="header" className="credit-header-link"
            aria-label={t('layout.balanceAria', { store: strings.storeTitle })}>
            <UserCredits />
          </Link>
          <button type="button" onClick={() => setProfileOpen(true)}
            aria-label={t('workflow.profile')} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10">
            <img src={profile?.avatar_url || avatarFallback(displayName)} alt="" className="w-9 h-9 rounded-full object-cover border border-white/20" />
          </button>
        </div>
      </header>
      <main ref={mainContentRef} className="flex-1 min-h-0 main-content no-bounce">
        <Outlet />
      </main>
      <nav aria-label={t('workflow.navigation')} className="nav:hidden bottom-navigation">{navigation}</nav>
      {profileOpen && <ProfileEditModal isOpen onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
