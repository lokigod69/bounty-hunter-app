// src/components/onboarding/OnboardingStep4Mission.tsx
// R35: Converted to educational explainer - shows how missions work without creating one
// Redesign 2026-07-10: workflow-first. The 4-step lifecycle is the hero; hovering
// (desktop) or tapping (touch) a step reveals only that step's form fields below,
// instead of dumping all six field cards at once.

import { useState } from 'react';
import type { ReactNode } from 'react';
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
  const { strings } = useThemeStrings();
  const [activeStep, setActiveStep] = useState(0);

  const missionTitle =
    strings.missionSingular.charAt(0).toUpperCase() + strings.missionSingular.slice(1);
  const tokenTitle =
    strings.tokenSingular.charAt(0).toUpperCase() + strings.tokenSingular.slice(1);

  // The lifecycle is the primary structure; each step owns the form fields that
  // matter at that moment, so nothing is shown out of context.
  const workflowSteps: WorkflowStep[] = [
    {
      icon: PenLine,
      title: `You create a ${strings.missionSingular}`,
      fields: [
        {
          icon: <FileText size={20} className="text-[var(--mode-accent)]" />,
          label: `${missionTitle} Title`,
          example: '"Clean the kitchen" or "Finish homework"',
          explanation: `Give your ${strings.missionSingular} a clear, descriptive name so the assignee knows exactly what to do.`,
        },
        {
          icon: <Info size={20} className="text-blue-400" />,
          label: 'Description',
          example: '"Wash dishes, wipe counters, take out trash"',
          explanation: 'Add extra details, steps, or requirements. Optional, but helpful for complex tasks.',
        },
      ],
    },
    {
      icon: Users,
      title: 'Assignee completes it',
      fields: [
        {
          icon: <Users size={20} className="text-purple-400" />,
          label: 'Assign To',
          example: 'Select a friend or family member',
          explanation: `Choose who should complete this ${strings.missionSingular}. You can only assign to people in your ${strings.friendsTitle}.`,
        },
        {
          icon: <Clock size={20} className="text-orange-400" />,
          label: 'Deadline',
          example: 'Tomorrow at 5:00 PM',
          explanation: `Set when the ${strings.missionSingular} should be completed. Optional, but helps with priority.`,
        },
      ],
    },
    {
      icon: CheckCheck,
      title: 'You approve the work',
      fields: [
        {
          icon: <Camera size={20} className="text-pink-400" />,
          label: 'Proof Required',
          example: 'Photo of completed task',
          explanation: `When enabled, the assignee must submit a photo or note as proof before the ${strings.missionSingular} can be approved.`,
        },
      ],
    },
    {
      icon: Trophy,
      title: `They earn ${strings.tokenPlural}!`,
      fields: [
        {
          icon: <Coins size={20} className="text-yellow-400" />,
          label: `${tokenTitle} Reward`,
          example: `10 ${strings.tokenPlural}`,
          explanation: `How many ${strings.tokenPlural} the assignee earns when they complete this ${strings.missionSingular}. They spend them in the ${strings.storeTitle}.`,
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
          Creating {strings.missionPlural} is easy
        </h3>
        <p className="text-body text-white/70">
          Every {strings.missionSingular} moves through four steps. Hover or tap a step to see
          what you'll fill in.
        </p>
      </BaseCard>

      {/* Workflow: the four lifecycle steps, interactive */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="tablist" aria-label="Mission workflow steps">
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
          Back
        </AppButton>
        <AppButton
          variant="cta"
          type="button"
          icon={<Home size={20} />}
          className="flex-1"
          onClick={onComplete}
        >
          Enter Dashboard
        </AppButton>
      </div>
    </div>
  );
}
