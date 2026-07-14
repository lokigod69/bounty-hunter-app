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
  // ALL HOOKS AT TOP LEVEL
  const { user, profile, profileLoading, profileError } = useAuth();
  const location = useLocation();
  const { ready, shouldRedirectToOnboarding } = useFTXGateLogic(
    user?.id ?? null,
    profileLoading,
    profile?.onboarding_completed,
  );

  // NO HOOKS BELOW THIS LINE - only conditional returns

  // Wait for gate check to complete
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-6 text-center">
          <div className="w-12 h-12 border-2 border-t-teal-500 border-white/10 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // A failed profile bootstrap (for example, offline) must never route an existing user into onboarding.
  // If user needs onboarding and not already on /onboarding, redirect there
  if (shouldRedirectToOnboarding && profileError === null && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // User has completed onboarding or doesn't need it - render children
  return <>{children}</>;
}
