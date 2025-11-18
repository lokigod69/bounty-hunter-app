// src/components/FTXGate.tsx
// P2: First-Time Experience gate component - checks if user should see onboarding

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { checkFTXGate } from '../lib/ftxGate';

interface FTXGateProps {
  children: React.ReactNode;
}

export default function FTXGate({ children }: FTXGateProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkOnboarding() {
      if (loading) return;

      if (!user) {
        setChecking(false);
        return;
      }

      const result = await checkFTXGate(user.id);

      if (result.shouldShowOnboarding) {
        navigate('/onboarding', { replace: true });
      } else {
        setChecking(false);
      }
    }

    checkOnboarding();
  }, [user, loading, navigate]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-6 text-center">
          <div className="w-12 h-12 border-2 border-t-teal-500 border-white/10 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

