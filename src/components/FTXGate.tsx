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
  const { user, loading } = useAuth();

  // This hook encapsulates: 
  // - ready (still checking missions/rewards)
  // - shouldRedirectToOnboarding (true/false)
  const { ready, shouldRedirectToOnboarding } = useFTXGateLogic(user?.id, loading);

  // While we don't yet know whether to gate or not, render loading state.
  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-6 text-center">
          <div className="w-12 h-12 border-2 border-t-teal-500 border-white/10 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If they should be on onboarding and aren't already there, redirect declaratively.
  if (
    shouldRedirectToOnboarding &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  // Otherwise, let the app render normally.
  return <>{children}</>;
}
