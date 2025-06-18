// src/components/Layout.tsx
// Added 'app-title' class to header text for MandaloreTitle font styling.
// Removed unused 'Gift' import.
// Main layout component with navigation, app name changed to 'Bounty Hunter'.
// Changed desktop user menu to click-to-toggle for better UX.
// Integrated useClickOutside hook to close desktop user menu on outside click.
// Changed main app logo icon from Bell to DollarSign.
// Applied new galactic theme styling to navigation items.
// Added 'NEW CONTRACT' button to the header navigation area with cyan holographic style.
// Phase 6 Part B: Added CursorTrail component for laser cursor effect.
// Phase 8: Integrated UserCredits display widget. Added 'Bounty Store', and 'My Bounties' to navigation. Removed 'Daily Contracts' and associated icon import.
// Added scroll effect to header, disabled when mobile menu is open.
// Added 'NEW CONTRACT' button to the mobile navigation menu.
// Added 'Issued' navigation link. Updated 'NEW CONTRACT' button to point to '/issued'.
// Added 'Rewards' placeholder navigation link.
// Renamed 'Dashboard' navigation label to 'Contracts'.

import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Menu, X, Home, Users, UserCog, Plus, ShoppingCart, Sparkles, Send } from 'lucide-react'; // Added ShoppingCart, Sparkles, Send // Added UserCog, Plus, removed DollarSign, removed Briefcase, removed Gift
import logo from '../assets/logo5.png'; // Added logo
import useClickOutside from '../hooks/useClickOutside';
import CursorTrail from './CursorTrail'; // Import the new component
import UserCredits from './UserCredits'; // Phase 8: Import UserCredits widget

export default function Layout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false); // State for desktop user menu
  const [isCursorTrailEnabled, setIsCursorTrailEnabled] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const closeUserMenu = () => {
    setUserMenuOpen(false);
  };

  // Close user menu when clicking outside
    useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useClickOutside(userMenuRef, () => {
    if (userMenuOpen) {
      closeUserMenu();
    }
  });

  // Navigation items
  const navItems = [
    { name: 'Contracts', path: '/', icon: <Home size={20} /> },
    { name: 'Issued', path: '/issued', icon: <Send size={20} /> },
    { name: 'Bounty Store', path: '/rewards-store', icon: <ShoppingCart size={20} /> }, // Corrected path to rewards-store
    { name: 'My Rewards', path: '/my-rewards', icon: <Sparkles size={20} /> }, // Corrected path and name to my-rewards
    { name: 'Friends', path: '/friends', icon: <Users size={20} /> },
  ];

  const userMenuItems = [
    { name: 'Edit Profile', path: '/profile/edit', icon: <UserCog size={20} /> }
  ];

  if (!user) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {isCursorTrailEnabled && <CursorTrail />} {/* Conditionally render the cursor trail */}
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled && !mobileMenuOpen ? 'bg-indigo-950/80 backdrop-blur-lg border-b border-white/10' : 'bg-transparent'}`}>

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
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item-galactic flex items-center space-x-1 ${
                  location.pathname === item.path
                    ? 'nav-item-galactic-active'
                    : ''
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User Profile & Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <UserCredits />
            {/* New Contract Button */}
            <Link
              to="/issued"
              state={{ openNewContractForm: true }}
              className="btn-primary flex items-center"
            >
              <Plus size={18} className="mr-2" />
              NEW CONTRACT
            </Link>

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
                Toggle Cursor Trail
              </div>
            </div>

            <div className="relative"> {/* Removed 'group' class */} 
              <div onClick={toggleUserMenu} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white/5">
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
              {/* Desktop User Dropdown Menu */}
              {userMenuOpen && (
                <div ref={userMenuRef} className="absolute right-0 mt-1 w-48 glass-card rounded-md shadow-lg py-1">
                <Link
                  to="/profile/edit"
                  onClick={closeUserMenu} // Close menu on click
                  className="flex items-center space-x-2 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <UserCog size={16} />
                  <span>Edit Profile</span>
                </Link>
                <button
                  onClick={() => { handleSignOut(); closeUserMenu(); }} // Close menu on click
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                  aria-label="Sign out"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
              )}
            </div>

          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-card fixed inset-0 z-40 pt-16 bg-indigo-950/95 backdrop-blur-lg">
          <div className="container mx-auto px-4 py-6 flex flex-col h-full">
            {/* New Contract Button for Mobile */}
            <Link
              to="/issued"
              state={{ openNewContractForm: true }}
              onClick={closeMobileMenu}
              className="btn-primary flex items-center justify-center mb-6"
            >
              <Plus size={20} className="mr-2" />
              NEW CONTRACT
            </Link>

            {/* User Profile */}
            <div className="flex items-center space-x-3 p-4 mb-6 glass-card">
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
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col space-y-2 mb-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item-galactic flex items-center space-x-3 px-4 py-3 rounded-xl ${
                    location.pathname === item.path
                      ? 'nav-item-galactic-active'
                      : ''
                  }`}
                  onClick={closeMobileMenu}
                >
                  {item.icon}
                  <span className="text-lg">{item.name}</span>
                </Link>
              ))}
            </nav>

            {/* User Menu Links - Mobile */}
            <div className="border-t border-white/10 pt-4 mt-4">
              <p className="px-4 pb-2 text-xs uppercase text-white/50">Account</p>
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

            {/* Sign Out Button */}
            <div className="mt-auto">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 glass-card hover:bg-white/10 transition-colors rounded-xl"
              >
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}