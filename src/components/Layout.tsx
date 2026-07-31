// src/components/Layout.tsx
// HEADER REFACTOR: Removed nav-bar scrolling and moved UserCredits to profile modal.
// DESKTOP HEADER FIX: Aligned profile and logout buttons horizontally.
// MOBILE MENU FIX: Added a dedicated, visible close (X) button to the mobile menu.
// Added 'app-title' class to header text for MandaloreTitle font styling.
// Removed unused 'Gift' import.
// Main layout component with navigation, app name changed to 'Bounty Hunter'.
// Changed desktop user menu to click-to-toggle for better UX.
// Integrated useClickOutside hook to close desktop user menu on outside click.
// Changed main app logo icon from Bell to DollarSign.
// Applied new galactic theme styling to navigation items.
// Added 'NEW CONTRACT' button to the header navigation area with cyan holographic style.
// Phase 6 Part B: Added CursorTrail component for laser cursor effect.
// Phase 8: Integrated UserCredits display widget. Added 'Bounties', and 'My Bounties' to navigation. Removed 'Daily Contracts' and associated icon import.
// Added scroll effect to header, disabled when mobile menu is open.
// Added 'NEW CONTRACT' button to the mobile navigation menu.
// Added 'Issued' navigation link. Updated 'NEW CONTRACT' button to point to '/issued'.
// Added 'Rewards' placeholder navigation link.
// Renamed 'Dashboard' navigation label to 'Contracts'.
// STATE SYNC FIX: Added navigation-based mobile menu closure to prevent modal conflicts.
// P1: Updated navigation labels to use theme strings from ThemeContext.

import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
// R31: Removed useNavigate - using window.location.assign for reliable logout
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useFriends } from '../hooks/useFriends';
import { useRedeemPendingInvite } from '../hooks/useInvite';
import { useActionCounts } from '../hooks/useActionCounts';
import { useTranslation } from 'react-i18next';
import { useUI } from '../context/UIContext';
import { useTheme } from '../context/ThemeContext';
import { useThemeStrings } from '../hooks/useThemeStrings';
import {
  Home,
  Send,
  ShoppingCart,
  Sparkles,
  Book,
  LogOut,
  Menu,
  X,
  Users,
  // R20: Mode-specific icons
  ScrollText,
  Heart,
} from 'lucide-react'; 
import logo from '../assets/logo5-small.png'; 
import CursorTrail from './CursorTrail';
import UserCredits from './UserCredits'; 

import ProfileEditModal from './ProfileEditModal';

import { feedback } from '../utils/feedback';
import type { SoundKey } from '../utils/soundManager';
import { avatarFallback } from '../lib/avatar';
import { usePayoutWatcher } from '../hooks/usePayoutWatcher';
import { useStanding, useRankUpWatcher } from '../hooks/useStanding';
import { SealLayer } from './visual/Seal';
import { PayoutCeremony } from './visual/PayoutCeremony';
import { RankUpCeremony } from './visual/RankUpCeremony';
import { StandingBlock } from './StandingBlock';

export default function Layout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { strings } = useThemeStrings();
  const { user, profile } = useAuth();
  usePayoutWatcher(user?.id);
  // Wave 2: one standing fetch for the whole chassis; both header instances
  // and the rank-up watcher share it so nothing races. The watcher keys off
  // the user the DATA belongs to, not the session user — airtight on swaps.
  const { standing, known: standingKnown, forUserId: standingUserId } = useStanding();
  useRankUpWatcher(standingUserId, standing, standingKnown);
  const { pendingRequests } = useFriends(user?.id);
  const { reviewCount, rejectedCount } = useActionCounts();
  // Phase 2.5: redeem an invite token stashed before login, once per session.
  useRedeemPendingInvite();
  const { isMobileMenuOpen, toggleMenu, closeMenu } = useUI();
  const location = useLocation();

  // Unified identity values - single source of truth for current user display
  // This ensures consistent display across header, mobile menu, and all identity surfaces
  const displayName =
    profile?.display_name ??
    (user?.user_metadata as Record<string, unknown> | undefined)?.full_name as string | undefined ??
    user?.email?.split('@')[0] ??
    t('layout.unknownUser');

  // avatarUrlBase: The actual DB value (null if user hasn't set one)
  // avatarUrl: For rendering - uses placeholder when avatarUrlBase is null
  const avatarUrlBase = profile?.avatar_url ?? null; // DB VALUE - may be null
  const profileUpdatedAt = (profile as { updated_at?: string } | null | undefined)?.updated_at;
  const avatarCacheBuster = profileUpdatedAt ? `?v=${encodeURIComponent(profileUpdatedAt)}` : '';
  const avatarUrl = avatarUrlBase
    ? `${avatarUrlBase}${avatarCacheBuster}`
    : avatarFallback(displayName); // RENDER FALLBACK ONLY (network-free initials)

  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isCursorTrailEnabled, setIsCursorTrailEnabled] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);

  // Phase 2: Scroll locking is now handled by UIContext via activeLayer
  // Removed manual scroll lock management here

  // Phase UX-2: Route change behavior - only close menu on actual navigation, not on same render
  const previousPathname = useRef(location.pathname);
  useEffect(() => {
    // Only close if pathname actually changed AND menu is open
    if (previousPathname.current !== location.pathname && isMobileMenuOpen) {
      closeMenu(); // Use closeMenu instead of clearLayer for menu-specific close
      previousPathname.current = location.pathname;
    } else if (previousPathname.current !== location.pathname) {
      // Path changed but menu wasn't open - just update ref
      previousPathname.current = location.pathname;
    }
  }, [location.pathname, isMobileMenuOpen, closeMenu]);

  // R31: Brute-force logout - always redirect regardless of errors
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // Redirect below remains the final logout fallback.
        }
      }
    } finally {
      // Hard reset client state - this ensures we always redirect
      window.location.assign('/login');
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // R20: Mode-specific icons for navigation
  const getContractsIcon = () => {
    switch (theme.id) {
      case 'guild': return <ScrollText size={20} />;
      case 'couple': return <Heart size={20} />;
      case 'family':
      default: return <Home size={20} />;
    }
  };

  // R21: Tab 2 is always "Missions" now, so use Send icon for all modes
  const getMissionsIcon = () => {
    return <Send size={20} />;
  };

  // Navigation items - using translated theme strings and mode-specific icons.
  // sound is typed as SoundKey so an unregistered key is a compile error
  // (click1e was silently mute for months before the registry was typed).
  const navItems: { name: string; path: string; icon: JSX.Element; sound: SoundKey }[] = [
    { name: strings.contractsLabel, path: '/', icon: getContractsIcon(), sound: 'click1a' },
    { name: strings.missionsLabel, path: '/issued', icon: getMissionsIcon(), sound: 'click1b' },
    { name: strings.friendsTitle, path: '/friends', icon: <Users size={20} />, sound: 'click1c' },
    { name: strings.storeTitle, path: '/rewards-store', icon: <ShoppingCart size={20} />, sound: 'click1d' },
    { name: strings.historyLabel, path: '/archive', icon: <Book size={20} />, sound: 'click1e' },
  ];

  const navItemsDesktop = navItems;
  const navItemsMobile = navItems;

  const userMenuItems: { name: string; path: string; icon: JSX.Element }[] = [];

  if (!user) {
    return <Outlet />;
  }

  return (
    // No background on this wrapper: the body's starfield gradient (index.css)
    // is the app's sky. An opaque bg-indigo-950 here painted over it on every
    // signed-in screen for months.
    <div className="h-app flex flex-col">

      <SealLayer />
      <PayoutCeremony />
      <RankUpCeremony />
      {isCursorTrailEnabled && <CursorTrail />} {/* Conditionally render the cursor trail */}
      {/* Header */}
      <header className={`sticky top-0 z-header safe-top transition-all duration-300 ${scrolled && !isMobileMenuOpen ? 'bg-indigo-950/80 backdrop-blur-lg border-b border-white/10' : 'bg-transparent'}`}>

        <div className="container mx-auto px-4 py-3 flex items-center">
          {/* Left side: Logo and Nav.
              min-w-0 matters: without it neither header group can shrink (nav
              items and the rank word are both white-space:nowrap), so instead
              of laying out tighter they overlapped — the German rank word
              UNGESCHWOREN landed on top of the Verlauf nav item. */}
          <div className="flex-grow min-w-0 flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
              <img 
                src={logo} 
                alt={t('layout.logoAlt')}
                className="h-10 w-10"
              />
              <span className="app-title text-2xl text-white">{strings.appName}</span>
            </Link>

            {/* Desktop Navigation. `nav:` not `md:` — see tailwind.config.js:
                a landscape phone is wider than 768px and was getting this. */}
            <nav className="hidden nav:flex items-center space-x-4">
              {navItemsDesktop.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => feedback.tap(item.sound)}
                  className={`relative nav-item-galactic flex items-center space-x-1 ${
                    location.pathname === item.path
                      ? 'nav-item-galactic-active'
                      : ''
                  }`}
                >
                  {item.icon}
                  <span className="nav-text-spacing">{item.name}</span>
                  {item.path === '/friends' && pendingRequests && pendingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {pendingRequests.length}
                    </span>
                  )}
                  {item.path === '/issued' && reviewCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {reviewCount}
                    </span>
                  )}
                  {item.path === '/' && rejectedCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {rejectedCount}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side: User Profile & Actions */}
          <div className="flex-shrink-0 flex items-center">
            <div className="hidden nav:flex items-center space-x-4 min-w-0">
              {/* Wave 2: standing — the second number (what you are).
                  The rank word is a translated noun, and its length is not ours
                  to control: English UNSWORN is 7 characters, German
                  UNGESCHWOREN is 12, and the Romance locales run longer again.
                  So the word is only shown where the header has room for it
                  (xl and up) and the sigil carries standing alone below that —
                  the sigil IS the identity, the word is only its label. This
                  keeps the header safe for every locale we add rather than for
                  the one that happened to break. */}
              <div className="hidden xl:flex min-w-0">
                <StandingBlock standing={standing} known={standingKnown} />
              </div>
              <div className="flex xl:hidden">
                <StandingBlock standing={standing} known={standingKnown} compact />
              </div>
              {/* Desktop credit balance - clickable to Loot Vault */}
              <Link
                to="/rewards-store"
                data-credit-anchor="desktop"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                aria-label={t('layout.balanceAria', { store: strings.storeTitle })}
              >
                <UserCredits />
              </Link>
              <div className="relative group">
                <button
                  onClick={() => setIsCursorTrailEnabled(!isCursorTrailEnabled)}
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                  aria-label={t('profile.toggleCursorTrail')}
                >
                  <Sparkles
                    size={20}
                    className={isCursorTrailEnabled ? 'text-cyan-400' : 'text-gray-500'}
                  />
                </button>
                <div className="absolute top-full right-0 mt-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-tooltip">
                  {t('profile.toggleCursorTrail')}
                </div>
              </div>

              <div className="relative flex items-center space-x-2">
                <div onClick={() => setProfileModalOpen(true)} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white/5">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-teal-500/50">
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className={`text-sm font-medium${standingKnown && standing.band === 4 ? ' the-named' : ''}`}>
                    {displayName}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-gray-800/50 hover:bg-red-500/50 transition-colors"
                  aria-label={t('auth.signOut')}
                >
                  <LogOut size={20} className="text-gray-400 hover:text-white" />
                </button>
              </div>
            </div>

            {/* Mobile: always-visible credit pill + menu button */}
            <div className="nav:hidden ml-4 flex items-center gap-2">
              <StandingBlock standing={standing} known={standingKnown} compact />
              <Link
                to="/rewards-store"
                data-credit-anchor="mobile"
                className="flex items-center rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors px-2.5 min-h-[44px]"
                aria-label={t('layout.balanceAria', { store: strings.storeTitle })}
              >
                <UserCredits />
              </Link>
              <button
                type="button"
                onClick={() => {
                  toggleMenu();
                }}
                className="text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={isMobileMenuOpen ? t('layout.closeMenu') : t('layout.openMenu')}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {/* 
       * MOBILE MENU BACKDROP & STACKING:
       * - Backdrop uses z-index: 35 (--z-mobile-menu) - below modals (10000+)
       * - Backdrop click handler explicitly calls closeMenu() - no global handlers
       * - Menu panel uses stopPropagation() to prevent backdrop clicks when interacting inside
       * - Close button and nav links explicitly call closeMenu() for deterministic behavior
       * - When modal opens, it renders above menu (modals use z-index: 10000+)
       * - See UIContext.tsx and index.css for complete documentation
       */}
      {isMobileMenuOpen && (
        <div 
          className="nav:hidden fixed inset-0 z-[var(--z-mobile-menu)]"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'var(--modal-scrim)' }}
            onClick={() => {
              closeMenu();
            }}
          />
          {/* Menu Content.
              `pt-16 safe-top` did not add up: .safe-top is unlayered CSS and
              beat the pt-16 utility outright, so this panel cleared the notch
              but not the header. safe-top-under-header feeds the 4rem through
              --safe-top-extra, which .safe-top adds to the inset. */}
          <div
            className="glass-card fixed inset-0 safe-top safe-top-under-header bg-indigo-950/95 backdrop-blur-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                closeMenu();
              }}
              className="absolute top-3 right-4 text-white min-w-[44px] min-h-[44px] flex items-center justify-center z-mobile-menu-close"
              aria-label={t('layout.closeMenu')}
            >
              <X size={24} />
            </button>
            <div className="container mx-auto px-4 py-6 flex flex-col h-full overflow-y-auto">
                {/* Credits Display - prominent glass card linking to the store */}
                {profile && (
                  <Link
                    to="/rewards-store"
                    onClick={() => closeMenu()}
                    className="glass-card flex items-center justify-between gap-4 rounded-xl px-5 py-4 mb-6 hover:bg-white/10 transition-colors"
                    aria-label={t('layout.balanceAria', { store: strings.storeTitle })}
                  >
                    <span className="text-sm uppercase tracking-wide text-white/60">{strings.storeCreditsLabel}</span>
                    <UserCredits />
                  </Link>
                )}
            {/* 'NEW CONTRACT' button removed from mobile menu. Functionality moved to IssuedPage.tsx FAB. */}

            {/* User Profile */}
            <button
              type="button"
              onClick={() => {
                setProfileModalOpen(true);
                closeMenu();
              }}
              className="w-full flex flex-col items-center glass-card hover:bg-white/10 transition-colors rounded-xl p-6 mb-6"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className={`font-medium text-lg${standingKnown && standing.band === 4 ? ' the-named' : ''}`}>
                  {displayName}
                </p>
                <p className="text-white/70 text-sm">{user.email}</p>
              </div>
            </button>

            {/* Navigation Links */}
            <nav className="flex-grow px-4">
              {navItemsMobile.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative nav-item-galactic flex items-center space-x-3 px-4 py-3 rounded-xl min-h-[44px] ${
                    location.pathname === item.path
                      ? 'nav-item-galactic-active'
                      : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    feedback.tap(item.sound);
                    closeMenu();
                  }}
                >
                  {item.icon}
                  <span className="text-lg nav-text-spacing">{item.name}</span>
                  {item.path === '/friends' && pendingRequests && pendingRequests.length > 0 && (
                    <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
                      {pendingRequests.length}
                    </span>
                  )}
                  {item.path === '/issued' && reviewCount > 0 && (
                    <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
                      {reviewCount}
                    </span>
                  )}
                  {item.path === '/' && rejectedCount > 0 && (
                    <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
                      {rejectedCount}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            {/* User Menu Links - Mobile (hidden until account links exist) */}
            <div className={userMenuItems.length > 0 ? "border-t border-white/10 pt-4 mt-4" : "hidden"}>
              <p className="px-4 pb-2 text-xs uppercase text-white/50">{t('profile.account')}</p>
              {userMenuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${ 
                    location.pathname === item.path 
                      ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-400' 
                      : 'hover:bg-white/5'
                  }`}
                  onClick={() => {
                    closeMenu();
                  }}
                >
                  {item.icon}
                  <span className="text-lg">{item.name}</span>
                </Link>
              ))}
            </div>

            {/* Sign Out Button */}
            <div className="mt-auto">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 glass-card hover:bg-white/10 transition-colors rounded-xl"
              >
                <LogOut size={20} />
                <span>{t('auth.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Main Content.
          No gutter or max-width here on purpose. PageContainer already applies
          `mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8`, and every
          page rendered into this outlet uses it — so `container mx-auto px-4
          py-6` here was a SECOND set of gutters stacked on the first. At 360px
          that left 296px of usable width, which is what pushed the reward grid
          and the stats row into clipping. Verified before removing: Dashboard,
          Friends, ArchivePage, RewardsStorePage and IssuedPage all root in
          PageContainer, including their loading and error branches. */}
      <main ref={mainContentRef} className="flex-1 main-content no-bounce">
        <Outlet />
      </main>

      <ProfileEditModal isOpen={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </div>
  );
}
