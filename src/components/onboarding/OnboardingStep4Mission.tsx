// src/components/onboarding/OnboardingStep4Mission.tsx
// R35: Converted to educational explainer - shows how missions work without creating one
// Read-only walkthrough of the mission creation form with field explanations

import { useThemeStrings } from '../../hooks/useThemeStrings';
import { BaseCard } from '../ui/BaseCard';
import { ArrowLeft, Home, Target, Users, FileText, Clock, Coins, Camera, Info } from 'lucide-react';

interface OnboardingStep4MissionProps {
  // R35: Simplified props - no longer needs reward/invite state
  firstRewardId?: string | null;
  invitedUserId?: string | null;
  assigneeChoice?: 'self' | 'invited' | null;
  onComplete: () => void;
  onBack: () => void;
}

export default function OnboardingStep4Mission({
  onComplete,
  onBack,
}: OnboardingStep4MissionProps) {
  const { strings } = useThemeStrings();

  // Field explanations for the mission creation form
  const fieldExplanations = [
    {
      icon: <FileText size={20} className="text-teal-400" />,
      label: `${strings.missionSingular.charAt(0).toUpperCase() + strings.missionSingular.slice(1)} Title`,
      example: '"Clean the kitchen" or "Finish homework"',
      explanation: `Give your ${strings.missionSingular} a clear, descriptive name so the assignee knows exactly what to do.`,
    },
    {
      icon: <Info size={20} className="text-blue-400" />,
      label: 'Description',
      example: '"Wash dishes, wipe counters, take out trash"',
      explanation: 'Add extra details, steps, or requirements. This is optional but helpful for complex tasks.',
    },
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
      explanation: `Set when the ${strings.missionSingular} should be completed. This is optional but helps with priority.`,
    },
    {
      icon: <Coins size={20} className="text-yellow-400" />,
      label: `${strings.tokenSingular.charAt(0).toUpperCase() + strings.tokenSingular.slice(1)} Reward`,
      example: '10 tokens',
      explanation: `How many ${strings.tokenPlural} the assignee earns when they complete this ${strings.missionSingular}.`,
    },
    {
      icon: <Camera size={20} className="text-pink-400" />,
      label: 'Proof Required',
      example: 'Photo of completed task',
      explanation: `When enabled, the assignee must submit a photo or note as proof before the ${strings.missionSingular} can be approved.`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <BaseCard className="text-center">
        <Target size={48} className="mx-auto mb-4 text-teal-400" />
        <h3 className="text-subtitle text-white font-semibold mb-2">
          Creating {strings.missionPlural} is Easy!
        </h3>
        <p className="text-body text-white/70">
          Go to the "{strings.missionsLabel}" tab and tap the + button to create a new {strings.missionSingular}.
          Here's what each field means:
        </p>
      </BaseCard>

      {/* Field explanations - displayed as a two-column layout on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fieldExplanations.map((field, index) => (
          <BaseCard key={index} className="bg-gray-800/30 border-gray-700/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
                {field.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-body text-white font-semibold mb-1">
                  {field.label}
                </h4>
                <p className="text-meta text-white/50 italic mb-2">
                  {field.example}
                </p>
                <p className="text-meta text-white/70">
                  {field.explanation}
                </p>
              </div>
            </div>
          </BaseCard>
        ))}
      </div>

      {/* Workflow summary */}
      <BaseCard className="bg-gradient-to-r from-teal-900/20 to-cyan-900/20 border-teal-500/30">
        <h3 className="text-body text-white font-semibold mb-4 flex items-center gap-2">
          <Target size={20} className="text-teal-400" />
          The {strings.missionSingular} Workflow
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center mx-auto">1</div>
            <p className="text-meta text-white/70">You create a {strings.missionSingular}</p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center mx-auto">2</div>
            <p className="text-meta text-white/70">Assignee completes it</p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center mx-auto">3</div>
            <p className="text-meta text-white/70">You approve the work</p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center mx-auto">4</div>
            <p className="text-meta text-white/70">They earn {strings.tokenPlural}!</p>
          </div>
        </div>
      </BaseCard>

      {/* Navigation buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary flex items-center gap-2 flex-1"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="btn-primary flex items-center gap-2 flex-1"
        >
          <Home size={20} />
          Enter Dashboard
        </button>
      </div>
    </div>
  );
}
