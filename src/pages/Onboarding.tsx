// src/pages/Onboarding.tsx
// P2: First-Time Experience wizard - guides new users through setup
// R35: Streamlined to 3 steps: Choose Mode → Invite Friend → Learn How to Create Missions
// Removed "Create First Reward" step (requires friends) and "Create First Mission" (self-assign is confusing)

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeId } from '../theme/theme.types';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { PageBody } from '../components/layout/PageBody';
import { Check } from 'lucide-react';

// Step components
import OnboardingStep1Mode from '../components/onboarding/OnboardingStep1Mode';
import OnboardingStep2Invite from '../components/onboarding/OnboardingStep3Invite'; // Renamed import
import OnboardingStep3Explainer from '../components/onboarding/OnboardingStep4Mission'; // Will be converted to explainer

type OnboardingStep = 1 | 2 | 3;

interface OnboardingState {
  themeId: ThemeId | null;
  invitedUserId: string | null;
}

export default function Onboarding() {
  // ALL HOOKS AT TOP LEVEL - NO HOOKS BELOW THIS LINE
  const {
    profile,
    authLoading,
    hasSession,
  } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [state, setState] = useState<OnboardingState>({
    themeId: null,
    invitedUserId: null,
  });

  // NO HOOKS BELOW THIS LINE - only conditional returns and handlers

  // 1. While auth is still initializing, show a generic loading state
  if (authLoading) {
    return (
      <PageContainer>
        <PageBody>
          <div className="min-h-screen flex items-center justify-center">
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 border-2 border-t-teal-500 border-white/10 rounded-full animate-spin mx-auto mb-4"></div>
              <p>Checking your session...</p>
            </div>
          </div>
        </PageBody>
      </PageContainer>
    );
  }

  // 2. No session → go to login
  if (!hasSession) {
    return <Navigate to="/login" replace />;
  }

  // Step handlers
  const handleStep1Complete = (themeId: ThemeId) => {
    setState(prev => ({ ...prev, themeId }));
    setCurrentStep(2);
  };

  const handleStep2Complete = (invitedUserId: string | null) => {
    setState(prev => ({ ...prev, invitedUserId }));
    setCurrentStep(3);
  };

  const handleStep3Complete = () => {
    // Mark onboarding as completed
    localStorage.setItem('bounty_onboarding_completed', 'true');
    // Navigate to Mission Inbox (Dashboard)
    navigate('/', { replace: true });
  };

  const handleSkipAll = () => {
    // Skip all steps - mark onboarding complete and go to dashboard
    localStorage.setItem('bounty_onboarding_completed', 'true');
    navigate('/', { replace: true });
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as OnboardingStep);
    }
  };

  // Step titles and descriptions - R35: Updated for 3-step flow
  const stepTitles = [
    'Choose Your World',
    'Invite Someone (Optional)',
    'How Missions Work',
  ];

  const stepDescriptions = [
    'Select a theme that matches how you\'ll use Bounty Hunter.',
    'Invite a friend, family member, or partner to share missions with.',
    'Here\'s how you\'ll create and assign missions.',
  ];

  // Render onboarding wizard
  const profileThemeId = (profile as unknown as { theme?: ThemeId } | null | undefined)?.theme;

  return (
    <PageContainer>
      <PageHeader
        title={stepTitles[currentStep - 1]}
        subtitle={stepDescriptions[currentStep - 1]}
      />

      {/* Progress indicator - R35: Now only 3 steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step < currentStep
                    ? 'bg-teal-500 text-white'
                    : step === currentStep
                    ? 'bg-teal-400 text-white ring-2 ring-teal-400 ring-offset-2 ring-offset-gray-900'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {step < currentStep ? <Check size={20} /> : step}
              </div>
              {step < 3 && (
                <div
                  className={`w-12 h-1 mx-1 transition-all ${
                    step < currentStep ? 'bg-teal-500' : 'bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <PageBody>
        {/* Skip all option */}
        <div className="mb-4 text-center">
          <button
            onClick={handleSkipAll}
            className="text-meta text-white/50 hover:text-white/70 underline"
          >
            Skip setup, I'll explore on my own
          </button>
        </div>

        {/* Step content */}
        {currentStep === 1 && (
          <OnboardingStep1Mode
            currentThemeId={state.themeId || profileThemeId || null}
            onComplete={handleStep1Complete}
          />
        )}

        {currentStep === 2 && (
          <OnboardingStep2Invite
            onComplete={handleStep2Complete}
            onSkip={() => handleStep2Complete(null)}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && (
          <OnboardingStep3Explainer
            onComplete={handleStep3Complete}
            onBack={handleBack}
          />
        )}
      </PageBody>
    </PageContainer>
  );
}
