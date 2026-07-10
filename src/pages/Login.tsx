// src/pages/Login.tsx
// Redesigned to center the login form, add the application logo and title, and use the custom Mandalore font.
// Fixed auth callback handling to prevent blank screens for new users.
// R31: Added email + password auth alongside Google OAuth.

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, MailCheck } from 'lucide-react';
import { getAuthRedirectTo } from '../lib/authRedirect';
import { AppButton, Spinner } from '../components/ui';
import logo from '../assets/logo5-small.png';

// Full-screen loading state shared by the auth-initializing and redirecting branches
const AuthLoadingScreen: React.FC<{ message: string }> = ({ message }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <Spinner size="lg" className="mx-auto mb-4" />
      <p className="text-white">{message}</p>
    </div>
  </div>
);

const Login: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtherOptions, setShowOtherOptions] = useState(false);
  // After a signup that requires email confirmation, swap the form for a
  // dedicated "check your email" view (a toast alone reads like nothing happened).
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  // Redirect authenticated users away from /login
  useEffect(() => {
    // Redirect if auth is done loading AND user exists
    // Note: We check for user alone (not session) because OAuth callbacks
    // may briefly have a user before the session object is fully populated
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Email + Password Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const redirectTo = getAuthRedirectTo();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        toast.error(error.message);
      } else if (data.user && !data.session) {
        // User created but needs email confirmation
        setConfirmationSentTo(email.trim().toLowerCase());
      } else if (data.session) {
        // Auto-confirmed (email confirmations disabled in Supabase)
        toast.success('Account created successfully!');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Email + Password Log In
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        toast.error(error.message);
      }
      // If successful, auth state change will trigger redirect
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const redirectTo = getAuthRedirectTo();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
        },
      });

      if (error) {
        toast.error(error.message || 'Failed to sign in with Google');
      }
      // Note: If successful, user will be redirected to Google
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Magic Link (passwordless)
  const handleMagicLink = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const redirectTo = getAuthRedirectTo();

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Check your email for the magic link!');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while Supabase is initializing or processing auth callback
  if (authLoading) {
    return <AuthLoadingScreen message="Loading..." />;
  }

  // If user is authenticated, the useEffect above will handle redirect
  // But show loading state here as well to prevent flash of login form
  if (user) {
    return <AuthLoadingScreen message="Signing you in..." />;
  }

  // Post-signup confirmation screen
  if (confirmationSentTo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
        <img src={logo} alt="Bounty Hunter" className="w-24 h-24 mb-4" />

        <h1 className="text-display app-title text-[var(--mode-accent)] mb-2">BOUNTY HUNTER</h1>
        <p className="text-meta text-white/50 mb-8">Run missions. Earn credits. Claim loot.</p>

        <div className="glass-card w-full max-w-sm p-8 rounded-2xl text-center">
          <MailCheck size={48} className="mx-auto mb-4 text-[var(--mode-accent)]" />
          <h2 className="text-subtitle text-white mb-3">Check your email</h2>
          <p className="text-body text-white/70 mb-1">We sent a confirmation link to</p>
          <p className="text-body text-white font-semibold mb-6 break-all">{confirmationSentTo}</p>
          <p className="text-sm text-white/50 mb-6">
            Click the link in that email to activate your account, then come back here to log in.
            Don't see it? Check your spam folder.
          </p>
          <AppButton
            variant="secondary"
            fullWidth
            onClick={() => setConfirmationSentTo(null)}
          >
            Back to sign in
          </AppButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
      <img src={logo} alt="Bounty Hunter" className="w-24 h-24 mb-4" />

      <h1 className="text-display app-title text-[var(--mode-accent)] mb-2">BOUNTY HUNTER</h1>
      <p className="text-meta text-white/50 mb-8">Run missions. Earn credits. Claim loot.</p>

      <div className="glass-card w-full max-w-sm p-8 rounded-2xl">
        <h2 className="text-subtitle text-white text-center mb-6">Welcome</h2>

        {/* Google OAuth Button - Primary option */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full min-h-[48px] py-3 px-4 mb-4 bg-white hover:bg-gray-100 rounded-xl text-gray-900 font-semibold transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 text-white/50">or use email</span>
          </div>
        </div>

        {/* Email + Password Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field w-full"
              disabled={loading}
            />
          </div>

          {/* Login / Sign Up Buttons */}
          <div className="flex gap-3">
            <AppButton variant="cta" type="submit" loading={loading} fullWidth>Log In</AppButton>
            <AppButton variant="ghost" type="button" onClick={handleSignUp} loading={loading} fullWidth>Sign Up</AppButton>
          </div>
        </form>

        {/* Other Options (Magic Link) - Collapsible */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowOtherOptions(!showOtherOptions)}
            className="w-full flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors"
          >
            Other options
            {showOtherOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showOtherOptions && (
            <div className="mt-4 p-4 rounded-lg border border-white/10">
              <p className="text-sm text-white/50 mb-3">
                Sign in without a password using a magic link sent to your email.
              </p>
              <AppButton
                variant="secondary"
                type="button"
                fullWidth
                loading={loading}
                onClick={handleMagicLink}
                disabled={loading || !email.trim()}
              >
                Send Magic Link
              </AppButton>
              {!email.trim() && (
                <p className="text-xs text-white/40 mt-2 text-center">
                  Enter your email above first
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
