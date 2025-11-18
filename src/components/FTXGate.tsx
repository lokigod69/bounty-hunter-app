// src/components/FTXGate.tsx
// P2: First-Time Experience gate component - checks if user should see onboarding
// Gate that sends fresh users to /onboarding, everyone else just passes through.

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useFTXGateLogic } from '../lib/ftxGate';

interface FTXGateProps {
  children: ReactNode;
}

export default function FTXGate({ children }: FTXGateProps) {
  const location = useLocation();
  const { user, session, profile, profileLoading, profileError } = useAuth();

  // Gate on a real loaded flag - don't proceed until profile is loaded or error is shown
  if (!session) {
    // Not logged in - let routes handle redirect to login
    return <>{children}</>;
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-6 text-center">
          <div className="w-12 h-12 border-2 border-t-teal-500 border-white/10 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  // If there's an error, show an error UI instead of infinite spinner
  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-6 text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Profile Error</h3>
          <p className="text-white/70 mb-4">{profileError.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // From here on, profile is either existing or newly created
  // This hook encapsulates: 
  // - ready (still checking missions/rewards)
  // - shouldRedirectToOnboarding (true/false)
  const { ready, shouldRedirectToOnboarding } = useFTXGateLogic(user?.id, profileLoading);

  // While we're still checking onboarding state, render nothing.
  if (!ready) {
    return null;
  }

  const onOnboardingRoute = location.pathname === '/onboarding';

  // If they should be on onboarding and aren't already there, redirect declaratively.
  if (shouldRedirectToOnboarding && !onOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  // Otherwise, let the app render normally.
  return <>{children}</>;
}
