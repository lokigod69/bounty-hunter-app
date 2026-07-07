// src/components/onboarding/OnboardingStep1Mode.tsx
// P2: Onboarding Step 1 - Theme/Mode Selection

import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { themesById } from '../../theme/themes';
import { ThemeId } from '../../theme/theme.types';
import { MODE_ACCENT_HEX } from '../../theme/modeAccents';
import { BaseCard } from '../ui/BaseCard';
import { AppButton } from '../ui';
import { Check, ArrowRight, ScrollText, Home, Heart } from 'lucide-react';
import heroGuild from '../../assets/generated/hero-guild.webp';
import heroFamily from '../../assets/generated/hero-family.webp';
import heroCouple from '../../assets/generated/hero-couple.webp';

const PUBLIC_ONBOARDING_THEME_IDS: ThemeId[] = ['guild'];

// VISUAL: Per-mode icon used to preview each mode's identity. Accent hex comes
// from theme/modeAccents.ts (single source of truth).
const MODE_ICON: Record<ThemeId, typeof ScrollText> = {
  guild: ScrollText,
  family: Home,
  couple: Heart,
};

// VISUAL: Per-mode hero key art shown as a banner at the top of each mode card.
const MODE_HERO: Record<ThemeId, string> = {
  guild: heroGuild,
  family: heroFamily,
  couple: heroCouple,
};

interface OnboardingStep1ModeProps {
  currentThemeId: ThemeId | null;
  onComplete: (themeId: ThemeId) => void;
}

function getPublicThemeId(themeId: ThemeId | null | undefined): ThemeId {
  return themeId && PUBLIC_ONBOARDING_THEME_IDS.includes(themeId) ? themeId : 'guild';
}

export default function OnboardingStep1Mode({
  currentThemeId,
  onComplete,
}: OnboardingStep1ModeProps) {
  const { themeId: currentTheme, setThemeId } = useTheme();
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId | null>(
    getPublicThemeId(currentThemeId || currentTheme)
  );

  // Update selected theme when current theme changes
  useEffect(() => {
    setSelectedThemeId(getPublicThemeId(currentThemeId || currentTheme));
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
          {/* Temporary V1 public gating: Family/Couple stay in code for internal/dev testing. */}
          {PUBLIC_ONBOARDING_THEME_IDS.map((themeId) => {
            const theme = themesById[themeId];
            const accent = MODE_ACCENT_HEX[theme.id];
            const ModeIcon = MODE_ICON[theme.id];
            const isSelected = selectedThemeId === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                style={
                  isSelected
                    ? {
                        borderColor: accent,
                        boxShadow: `0 0 16px ${accent}40`,
                        backgroundColor: `${accent}14`,
                      }
                    : undefined
                }
                className={`w-full text-left rounded-lg border-2 overflow-hidden transition-all ${
                  isSelected
                    ? ''
                    : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'
                }`}
              >
                <div className="relative h-28 w-full">
                  <img
                    src={MODE_HERO[theme.id]}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="h-full w-full object-cover object-center"
                  />
                  {/* Bottom-up fade so the art melts into the dark card surface. */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-gray-950/90 via-gray-950/30 to-transparent" />
                </div>
                <div className="flex items-start gap-3 p-4">
                  <span
                    className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-lg bg-white/5"
                    style={{ color: accent }}
                  >
                    <ModeIcon size={24} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-subtitle text-white font-semibold">{theme.label}</h3>
                      {theme.id === 'guild' && (
                        <span className="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 bg-[var(--mode-accent-soft)] text-[var(--mode-accent)]">
                          Popular
                        </span>
                      )}
                      {isSelected && (
                        <Check size={20} className="ml-auto flex-shrink-0" style={{ color: accent }} />
                      )}
                    </div>
                    <p className="text-body text-white/70 text-sm">{theme.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <AppButton
            variant="cta"
            onClick={handleNext}
            disabled={!selectedThemeId}
            icon={<ArrowRight size={20} />}
          >
            Next
          </AppButton>
        </div>
      </BaseCard>
    </div>
  );
}

