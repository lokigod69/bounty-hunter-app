// src/components/Layout.tsx
// Main layout component with navigation, app name changed to 'Bounty Hunter'.
// Changed desktop user menu to click-to-toggle for better UX.
// Integrated useClickOutside hook to close desktop user menu on outside click.
// Changed main app logo icon from Bell to DollarSign.

import { useState, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Menu, X, Home, Users, DollarSign, UserCog } from 'lucide-react'; // Added UserCog, replaced Bell with DollarSign
import useClickOutside from '../hooks/useClickOutside';

export default function Layout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false); // State for desktop user menu
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
  useClickOutside(userMenuRef, () => {
    if (userMenuOpen) {
      closeUserMenu();
    }
  });

  // Navigation items
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <Home size={20} /> },
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
      {/* Header */}
      <header className="glass-card bg-indigo-900/50 border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-2 rounded-lg">
              <DollarSign size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold gradient-text">Bounty Hunter</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'text-teal-400 bg-white/10'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User Profile & Actions */}
          <div className="hidden md:flex items-center space-x-4">
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