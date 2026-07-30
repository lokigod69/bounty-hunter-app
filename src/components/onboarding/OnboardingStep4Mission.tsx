// src/components/onboarding/OnboardingStep4Mission.tsx
// R35: Converted to educational explainer - shows how missions work without creating one
// Redesign 2026-07-10: workflow-first. The 4-step lifecycle is the hero; hovering
// (desktop) or tapping (touch) a step reveals only that step's form fields below,
// instead of dumping all six field cards at once.

import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStrings } from '../../hooks/useThemeStrings';
import { BaseCard } from '../ui/BaseCard';
import { AppButton } from '../ui';
import {
  ArrowLeft,
  Home,
  Target,
  Users,
  FileText,
  Clock,
  Coins,
  Camera,
  Info,
  PenLine,
  CheckCheck,
  Trophy,
} from 'lucide-react';

interface OnboardingStep4MissionProps {
  // R35: Simplified props - no longer needs reward/invite state
  firstRewardId?: string | null;
  invitedUserId?: string | null;
  assigneeChoice?: 'self' | 'invited' | null;
  onComplete: () => void;
  onBack: () => void;
}

interface FieldExplanation {
  icon: ReactNode;
  label: string;
  example: string;
  explanation: string;
}

interface WorkflowStep {
  icon: typeof PenLine;
  title: string;
  fields: FieldExplanation[];
}

export default function OnboardingStep4Mission({
  onComplete,
  onBack,
}: OnboardingStep4MissionProps) {
  const { t } = useTranslation();
  const { strings } = useThemeStrings();
  const [activeStep, setActiveStep] = useState(0);

  const missionTitle =
    strings.missionSingular.charAt(0).toUpperCase() + strings.missionSingular.slice(1);
  const tokenTitle =
    strings.tokenSingular.charAt(0).toUpperCase() + strings.tokenSingular.slice(1);

  // Every string in this step used to be an English template literal. The mode
  // nouns still come from ThemeStrings — they are per-mode, not per-language —
  // so they are passed in as interpolation values rather than concatenated.
  const vars = {
    mission: strings.missionSingular,
    missionPlural: strings.missionPlural,
    missionTitle,
    tokenTitle,
    tokenPlural: strings.tokenPlural,
    crew: strings.friendsTitle,
    store: strings.storeTitle,
  };
  const f = (key: string) => t(`onboarding.explainer.fields.${key}`, vars);

  // The lifecycle is the primary structure; each step owns the form fields that
  // matter at that moment, so nothing is shown out of context.
  const workflowSteps: WorkflowStep[] = [
    {
      icon: PenLine,
      title: t('onboarding.explainer.step1Title', vars),
      fields: [
        {
          icon: <FileText size={20} className="text-[var(--mode-accent)]" />,
          label: f('titleLabel'),
          example: f('titleExample'),
          explanation: f('titleExplanation'),
        },
        {
          icon: <Info size={20} className="text-blue-400" />,
          label: f('descriptionLabel'),
          example: f('descriptionExample'),
          explanation: f('descriptionExplanation'),
        },
      ],
    },
    {
      icon: Users,
      title: t('onboarding.explainer.step2Title', vars),
      fields: [
        {
          icon: <Users size={20} className="text-purple-400" />,
          label: f('assignToLabel'),
          example: f('assignToExample'),
          explanation: f('assignToExplanation'),
        },
        {
          icon: <Clock size={20} className="text-orange-400" />,
          label: f('deadlineLabel'),
          example: f('deadlineExample'),
          explanation: f('deadlineExplanation'),
        },
      ],
    },
    {
      icon: CheckCheck,
      title: t('onboarding.explainer.step3Title', vars),
      fields: [
        {
          icon: <Camera size={20} className="text-pink-400" />,
          label: f('proofLabel'),
          example: f('proofExample'),
          explanation: f('proofExplanation'),
        },
      ],
    },
    {
      icon: Trophy,
      title: t('onboarding.explainer.step4Title', vars),
      fields: [
        {
          icon: <Coins size={20} className="text-yellow-400" />,
          label: f('rewardLabel'),
          example: f('rewardExample'),
          explanation: f('rewardExplanation'),
        },
      ],
    },
  ];

  const active = workflowSteps[activeStep];

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <BaseCard className="text-center">
        <Target size={40} className="mx-auto mb-3 text-[var(--mode-accent)]" />
        <h3 className="text-subtitle text-white font-semibold mb-2">
          {t('onboarding.explainer.heroTitle', vars)}
        </h3>
        <p className="text-body text-white/70">
          {t('onboarding.explainer.heroBody', vars)}
        </p>
      </BaseCard>

      {/* Workflow: the four lifecycle steps, interactive */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        role="tablist"
        aria-label={t('onboarding.explainer.tablistLabel')}
      >
        {workflowSteps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === activeStep;
          return (
            <button
              key={step.title}
              type="button"
              role="tab"
              aria-selected={isActive}
              onMouseEnter={() => setActiveStep(index)}
              onFocus={() => setActiveStep(index)}
              onClick={() => setActiveStep(index)}
              className={`rounded-xl border-2 p-4 text-center transition-all duration-200 ${
                isActive
                  ? 'border-[var(--mode-accent)] bg-[var(--mode-accent-soft)] shadow-[0_0_16px_rgba(var(--mode-accent-rgb),0.25)]'
                  : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'
              }`}
            >
              <div
                className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full font-bold transition-colors ${
                  isActive
                    ? 'bg-[var(--mode-accent)] text-gray-950'
                    : 'bg-gray-700/60 text-white/70'
                }`}
              >
                {index + 1}
              </div>
              <StepIcon
                size={18}
                className={`mx-auto mb-2 transition-colors ${
                  isActive ? 'text-[var(--mode-accent)]' : 'text-white/50'
                }`}
              />
              <p className={`text-meta leading-snug ${isActive ? 'text-white' : 'text-white/60'}`}>
                {step.title}
              </p>
            </button>
          );
        })}
      </div>

      {/* Detail panel: only the active step's fields */}
      <BaseCard
        key={activeStep}
        className="bg-gray-800/30 border-gray-700/50 animate-fade-in motion-reduce:animate-none"
      >
        <div className="space-y-4">
          {active.fields.map((field) => (
            <div key={field.label} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
                {field.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-body text-white font-semibold mb-1">{field.label}</h4>
                <p className="text-meta text-white/50 italic mb-1">{field.example}</p>
                <p className="text-meta text-white/70">{field.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </BaseCard>

      {/* Navigation buttons */}
      <div className="flex gap-4">
        <AppButton
          variant="ghost"
          type="button"
          icon={<ArrowLeft size={20} />}
          className="flex-1"
          onClick={onBack}
        >
          {t('common.back')}
        </AppButton>
        <AppButton
          variant="cta"
          type="button"
          icon={<Home size={20} />}
          className="flex-1"
          onClick={onComplete}
        >
          {t('onboarding.explainer.enterDashboard')}
        </AppButton>
      </div>
    </div>
  );
}
