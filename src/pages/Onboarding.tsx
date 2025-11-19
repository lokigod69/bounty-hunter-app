// src/pages/Onboarding.tsx
// P2: First-Time Experience wizard - guides new users through setup
// Rebuilt with proper hook order - all hooks at top level

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { ThemeId } from '../theme/theme.types';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { PageBody } from '../components/layout/PageBody';
import { Check } from 'lucide-react';

// Step components
import OnboardingStep1Mode from '../components/onboarding/OnboardingStep1Mode';
import OnboardingStep2Reward from '../components/onboarding/OnboardingStep2Reward';
import OnboardingStep3Invite from '../components/onboarding/OnboardingStep3Invite';
import OnboardingStep4Mission from '../components/onboarding/OnboardingStep4Mission';

type OnboardingStep = 1 | 2 | 3 | 4;

interface OnboardingState {
  themeId: ThemeId | null;
  firstRewardId: string | null;
  invitedUserId: string | null;
  assigneeChoice: 'self' | 'invited' | null;
}

export default function Onboarding() {
  // ALL HOOKS AT TOP LEVEL - NO HOOKS BELOW THIS LINE
  const { session, profile, profileLoading, profileError, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [state, setState] = useState<OnboardingState>({
    themeId: null,
    firstRewardId: null,
    invitedUserId: null,
    assigneeChoice: null,
  });

  // DEBUG: Log state on every render (keep for debugging)
  console.log('[Onboarding DEBUG]', {
    hasSession: !!session,
    profileLoading,
    hasProfile: !!profile,
    profileError: profileError ? String(profileError) : null,
  });

  // NO HOOKS BELOW THIS LINE - only conditional returns and handlers

  // Auth guard - redirect if not logged in
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Profile loading state
  if (profileLoading) {
    return (
      <PageContainer>
        <PageBody>
          <div className="min-h-screen flex items-center justify-center">
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 border-2 border-t-teal-500 border-white/10 rounded-full animate-spin mx-auto mb-4"></div>
              <p>Loading profile...</p>
            </div>
          </div>
        </PageBody>
      </PageContainer>
    );
  }

  // Profile error state
  if (profileError) {
    return (
      <PageContainer>
        <PageBody>
          <div className="min-h-screen flex items-center justify-center">
            <div className="glass-card p-6 text-center max-w-md">
              <div className="text-red-500 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">We couldn't load your profile</h3>
              <p className="text-white/70 mb-4">Try again. If it keeps failing, contact support.</p>
              <button
                onClick={() => refreshProfile()}
                className="btn-primary"
              >
                Retry
              </button>
            </div>
          </div>
        </PageBody>
      </PageContainer>
    );
  }

  // Failsafe: if profile is null but loading is false, show error
  if (!profile) {
    return (
      <PageContainer>
        <PageBody>
          <div className="min-h-screen flex items-center justify-center">
            <div className="glass-card p-6 text-center max-w-md">
              <div className="text-red-500 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No profile found</h3>
              <p className="text-white/70 mb-4">We couldn't create your profile. Try again.</p>
              <button
                onClick={() => refreshProfile()}
                className="btn-primary"
              >
                Retry
              </button>
            </div>
          </div>
        </PageBody>
      </PageContainer>
    );
  }

  // Step handlers
  const handleStep1Complete = (themeId: ThemeId) => {
    setState(prev => ({ ...prev, themeId }));
    setCurrentStep(2);
  };

  const handleStep2Complete = (rewardId: string) => {
    // rewardId can be empty string if user skipped
    setState(prev => ({ ...prev, firstRewardId: rewardId || null }));
    setCurrentStep(3);
  };

  const handleStep3Complete = (invitedUserId: string | null) => {
    setState(prev => ({ 
      ...prev, 
      invitedUserId, 
      assigneeChoice: invitedUserId ? 'invited' : 'self' 
    }));
    setCurrentStep(4);
  };

  const handleStep4Complete = () => {
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

  // Step titles and descriptions
  const stepTitles = [
    'Choose Your World',
    'Create Your First Reward',
    'Invite Someone (Optional)',
    'Create Your First Mission',
  ];

  const stepDescriptions = [
    'Select a theme that matches how you\'ll use Bounty Hunter.',
    'Set up a reward that missions can earn towards.',
    'Invite a friend, family member, or partner to share missions with.',
    'Create your first mission to get started.',
  ];

  // Render onboarding wizard
  return (
    <PageContainer>
      <PageHeader
        title={stepTitles[currentStep - 1]}
        subtitle={stepDescriptions[currentStep - 1]}
      />

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((step) => (
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
              {step < 4 && (
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
            currentThemeId={state.themeId}
            onComplete={handleStep1Complete}
          />
        )}

        {currentStep === 2 && (
          <OnboardingStep2Reward
            onComplete={handleStep2Complete}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && (
          <OnboardingStep3Invite
            onComplete={handleStep3Complete}
            onSkip={() => handleStep3Complete(null)}
            onBack={handleBack}
          />
        )}

        {currentStep === 4 && (
          <OnboardingStep4Mission
            firstRewardId={state.firstRewardId}
            invitedUserId={state.invitedUserId}
            assigneeChoice={state.assigneeChoice}
            onComplete={handleStep4Complete}
            onBack={handleBack}
          />
        )}
      </PageBody>
    </PageContainer>
  );
}
