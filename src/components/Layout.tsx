// src/components/Layout.tsx
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

import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../hooks/useFriends';
import { useTranslation } from 'react-i18next';
import { useUI } from '../context/UIContext';
import {
  Home,
  Send,
  ShoppingCart,
  Sparkles,
  Book,
  LogOut,
  Menu,
  X,
  Users
} from 'lucide-react'; 
import logo from '../assets/logo5.png'; 
import useClickOutside from '../hooks/useClickOutside';
import CursorTrail from './CursorTrail'; 
import UserCredits from './UserCredits'; 

import ProfileEditModal from './ProfileEditModal';

import { soundManager } from '../utils/soundManager';

export default function Layout() {
  const { t } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const { pendingRequests } = useFriends(user?.id);
  const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false); // State for desktop user menu
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isCursorTrailEnabled, setIsCursorTrailEnabled] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);

  // Effect to control body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = ''; // Or 'auto'
    }
    // Cleanup function to restore scroll when component unmounts or menu closes
    return () => {
      document.body.style.overflow = ''; // Or 'auto'
    };
  }, [isMobileMenuOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };



  const closeUserMenu = () => setUserMenuOpen(false);

  useClickOutside(userMenuRef, closeUserMenu); // Close user menu when clicking outside

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useClickOutside(userMenuRef, () => {
    if (userMenuOpen) {
      closeUserMenu();
    }
  });

  // Navigation items
  const navItems = [
    { name: t('navigation.contracts'), path: '/', icon: <Home size={20} />, sound: 'click1a' },
    { name: t('navigation.missions'), path: '/issued', icon: <Send size={20} />, sound: 'click1b' },
    { name: t('navigation.guildRoster'), path: '/friends', icon: <Users size={20} />, sound: 'click1c' },
    { name: t('navigation.bounties'), path: '/rewards-store', icon: <ShoppingCart size={20} />, sound: 'click1d' },
    { name: t('navigation.history'), path: '/archive', icon: <Book size={20} />, sound: 'click1e' },
  ];

  const navItemsDesktop = navItems;
  const navItemsMobile = navItems;

  const userMenuItems: { name: string; path: string; icon: JSX.Element }[] = [];

  if (!user) {
    return <Outlet />;
  }

  return (
    <div className="h-screen flex flex-col bg-indigo-950">

      {isCursorTrailEnabled && <CursorTrail />} {/* Conditionally render the cursor trail */}
      {/* Header */}
      <header className={`sticky top-0 z-30 transition-all duration-300 ${scrolled && !isMobileMenuOpen ? 'bg-indigo-950/80 backdrop-blur-lg border-b border-white/10' : 'bg-transparent'}`}>

        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src={logo} 
              alt="Bounty Hunter Logo" 
              className="h-10 w-10"
            />
            <span className="app-title text-2xl font-bold text-white">BOUNTY HUNTER</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2 md:space-x-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
            {navItemsDesktop.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => item.sound && soundManager.play(item.sound)}
                className={`relative nav-item-galactic flex items-center space-x-1 ${
                  location.pathname === item.path
                    ? 'nav-item-galactic-active'
                    : ''
                }`}
              >
                {item.icon}
                                <span className="nav-text-spacing">{item.name}</span>
                {item.name === 'Guild Roster' && pendingRequests && pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {pendingRequests.length}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* User Profile & Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <UserCredits />
            {/* 'NEW CONTRACT' button removed from here. Functionality moved to IssuedPage.tsx FAB. */}
            {/* Cursor Trail Toggle Button */}
            <div className="relative group">
              <button
                onClick={() => setIsCursorTrailEnabled(!isCursorTrailEnabled)}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                aria-label="Toggle cursor trail"
              >
                <Sparkles 
                  size={20} 
                  className={isCursorTrailEnabled ? 'text-cyan-400 animate-pulse' : 'text-gray-500'} 
                />
              </button>
              <div className="absolute top-full right-0 mt-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {t('profile.toggleCursorTrail')}
              </div>
            </div>



            <div className="relative flex items-center space-x-2">
              <div onClick={() => setProfileModalOpen(true)} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white/5">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-teal-500/50">
                  <img
                    src={profile?.avatar_url || 'https://avatar.iran.liara.run/public/boy?username=' + (user.email || 'user')}
                    alt={profile?.display_name || 'User'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm font-medium">
                  {profile?.display_name || user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-red-500/50 transition-colors"
                aria-label="Log out"
              >
                <LogOut size={20} className="text-gray-400 hover:text-white" />
              </button>
              {/* Desktop User Dropdown Menu */}
              {userMenuOpen && (
                <div ref={userMenuRef} className="absolute right-0 mt-1 w-48 glass-card rounded-md shadow-lg py-1">
                <button
                  onClick={() => { handleSignOut(); closeUserMenu(); }} // Close menu on click
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                  aria-label={t('auth.signOut')}
                >
                  <LogOut size={16} />
                  <span>{t('auth.signOut')}</span>
                </button>
              </div>
              )}
            </div>

          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            {!isMobileMenuOpen && (
              <button onClick={toggleMobileMenu} className="text-white" aria-label="Open menu">
                <Menu size={24} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass-card fixed inset-0 z-40 pt-16 bg-indigo-950/95 backdrop-blur-lg">
          <button
            onClick={toggleMobileMenu}
            className="absolute top-3 right-4 text-white p-2 z-50"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
          <div className="container mx-auto px-4 py-6 flex flex-col h-full overflow-y-auto">
                {/* Credits Display - Placed prominently at the top */}
                {profile && (
                  <>
                    {/* Credits Display - Uses UserCredits component for live updates */}
                    <div className="px-4 py-3 mb-4 flex justify-center items-center text-6xl font-bold text-amber-300">
                      <UserCredits />
                    </div>
                  </>
                )}
            {/* 'NEW CONTRACT' button removed from mobile menu. Functionality moved to IssuedPage.tsx FAB. */}

            {/* User Profile */}
            <button
              onClick={() => {
                setProfileModalOpen(true);
                closeMobileMenu();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                setProfileModalOpen(true);
                closeMobileMenu();
              }}
              className="w-full flex items-center space-x-3 p-4 mb-6 glass-card text-left transition-colors hover:bg-white/5"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img
                  src={profile?.avatar_url || 'https://avatar.iran.liara.run/public/boy?username=' + (user?.email || 'defaultUser')}
                  alt={profile?.display_name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-medium text-lg">
                  {profile?.display_name || user.email?.split('@')[0]}
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
                  className={`relative nav-item-galactic flex items-center space-x-3 px-4 py-3 rounded-xl ${
                    location.pathname === item.path
                      ? 'nav-item-galactic-active'
                      : ''
                  }`}
                  onClick={() => {
                    if (item.sound) soundManager.play(item.sound);
                    closeMobileMenu();
                  }}
                >
                  {item.icon}
                  <span className="text-lg nav-text-spacing">{item.name}</span>
                  {item.name === 'Guild Roster' && pendingRequests && pendingRequests.length > 0 && (
                    <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
                      {pendingRequests.length}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            {/* User Menu Links - Mobile */}
            <div className="border-t border-white/10 pt-4 mt-4">
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
                  onClick={closeMobileMenu}
                >
                  {item.icon}
                  <span className="text-lg">{item.name}</span>
                </Link>
              ))}
            </div>

            {/* Language Switcher - Mobile */}
            <div className="mt-6 mb-4 flex justify-center">

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
      )}

      {/* Main Content */}
      <main ref={mainContentRef} className="flex-1 container mx-auto px-4 py-6 main-content no-bounce">
        <Outlet />
      </main>

      <ProfileEditModal isOpen={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </div>
  );
}