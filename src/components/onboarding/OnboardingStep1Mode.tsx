// src/components/onboarding/OnboardingStep1Mode.tsx
// P2: Onboarding Step 1 - Theme/Mode Selection

import { useState, useEffect } from 'react';
import { useTheme, themesById } from '../../context/ThemeContext';
import { ThemeId } from '../../theme/theme.types';
import { BaseCard } from '../ui/BaseCard';
import { Check, ArrowRight } from 'lucide-react';

interface OnboardingStep1ModeProps {
  currentThemeId: ThemeId | null;
  onComplete: (themeId: ThemeId) => void;
}

export default function OnboardingStep1Mode({
  currentThemeId,
  onComplete,
}: OnboardingStep1ModeProps) {
  const { themeId: currentTheme, setThemeId } = useTheme();
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId | null>(
    currentThemeId || currentTheme
  );

  // Update selected theme when current theme changes
  useEffect(() => {
    if (currentThemeId) {
      setSelectedThemeId(currentThemeId);
    } else {
      setSelectedThemeId(currentTheme);
    }
  }, [currentThemeId, currentTheme]);

  const handleSelect = (themeId: ThemeId) => {
    setSelectedThemeId(themeId);
    setThemeId(themeId); // Update global theme immediately
  };

  const handleNext = () => {
    if (selectedThemeId) {
      onComplete(selectedThemeId);
    }
  };

  return (
    <div className="space-y-4">
      <BaseCard>
        <p className="text-body text-white/70 mb-6">
          Choose how Bounty Hunter looks and feels. You can change this anytime in your profile settings.
        </p>

        <div className="space-y-3">
          {Object.values(themesById).map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedThemeId === theme.id
                  ? 'border-teal-400 bg-teal-400/10'
                  : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-subtitle text-white font-semibold">{theme.label}</h3>
                    {selectedThemeId === theme.id && (
                      <Check size={20} className="text-teal-400" />
                    )}
                  </div>
                  <p className="text-body text-white/70 text-sm">{theme.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleNext}
            disabled={!selectedThemeId}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ArrowRight size={20} />
          </button>
        </div>
      </BaseCard>
    </div>
  );
}

