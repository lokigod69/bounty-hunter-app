// src/pages/Onboarding.tsx
// P2: First-Time Experience wizard - guides new users through setup

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { ThemeId } from '../theme/theme.types';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { PageBody } from '../components/layout/PageBody';
import { BaseCard } from '../components/ui/BaseCard';
import { markOnboardingCompleted } from '../lib/ftxGate';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';

// Step components will be imported
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [state, setState] = useState<OnboardingState>({
    themeId: null,
    firstRewardId: null,
    invitedUserId: null,
    assigneeChoice: null,
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

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
    setState(prev => ({ ...prev, invitedUserId, assigneeChoice: invitedUserId ? 'invited' : 'self' }));
    setCurrentStep(4);
  };

  const handleStep4Complete = () => {
    // P6: Always mark onboarding as completed, even if steps were skipped
    markOnboardingCompleted();
    navigate('/');
  };

  // P6: Add a "Skip All" option that marks onboarding complete and navigates away
  const handleSkipAll = () => {
    markOnboardingCompleted();
    navigate('/');
  };

  const handleSkipStep3 = () => {
    handleStep3Complete(null);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as OnboardingStep);
    }
  };

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

  if (!user) {
    return null; // Will redirect via useEffect
  }

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
        {/* P6: Skip all option */}
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
            onSkip={handleSkipStep3}
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

