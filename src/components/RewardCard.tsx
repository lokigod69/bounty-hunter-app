// src/components/RewardCard.tsx
// Phase 1: Updated to use BaseCard for consistent styling.
// P4: Redesigned for aspirational feel with clearer visual hierarchy and affordability hints.
// R27: Added per-card accent variants and lightbox for images
// A component to display a single reward or bounty item.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Pencil, Trash2 } from 'lucide-react';
import type { Database } from '../types/database';
import { Coin } from './visual/Coin';
import { BaseCard } from './ui/BaseCard';
import { RewardImageLightbox } from './modals/RewardImageLightbox';
import { getAccentVariant } from '../theme/accentVariants';

export type Reward = Database['public']['Tables']['rewards_store']['Row'];

interface RewardCardProps {
  reward: Reward;
  view: 'available' | 'created' | 'collected';
  onAction?: (rewardId: string) => void;
  onEdit?: (reward: Reward) => void;
  onDelete?: (rewardId: string) => void;
  currentCredits?: number; // P4: Current user credits for affordability checks
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, view, onAction, onEdit, onDelete, currentCredits = 0 }) => {
  const { t } = useTranslation();
  const { theme, themeId } = useTheme();
  const { id, name, description, image_url, credit_cost } = reward;
  const [imageError, setImageError] = useState(false);
  // R27: Lightbox state for full image view
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // P4: Calculate affordability
  const cost = credit_cost || 0;
  const canAfford = currentCredits >= cost;
  const creditsNeeded = Math.max(0, cost - currentCredits);

  // R27: Get per-card accent variant
  const accentVariant = getAccentVariant(themeId, id);

  useEffect(() => {
    setImageError(false);
  }, [reward.id]);

  const isUrl = (str: string | null | undefined): boolean => {
    if (!str) return false;
    return str.startsWith('http') || str.includes('/') || str.includes('.');
  };

  const renderImageOrEmoji = () => {
    const defaultEmoji = '🎁';
    const displayUrl = image_url && isUrl(image_url);

    if (displayUrl && !imageError) {
      return (
        // R27: Clickable image opens lightbox
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="w-full h-full relative overflow-hidden cursor-pointer group"
          aria-label="View full image"
        >
          <img
            src={image_url!}
            alt={name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
          />
          {!canAfford && view === 'available' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white/80 text-xs sm:text-sm font-semibold px-2 text-center">{theme.strings.storeCantAffordLabel}</span>
            </div>
          )}
          {/* R27: Hover overlay for clickable indication */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </button>
      );
    }

    // R27: Emoji fallback with mode-aware accent gradient
    return (
      <div
        className={`w-full h-full flex items-center justify-center ${canAfford || view !== 'available' ? '' : 'bg-gray-700/50'}`}
        style={canAfford || view !== 'available' ? { background: accentVariant.backgroundGradient } : undefined}
      >
        <span className="text-4xl sm:text-5xl md:text-6xl">{displayUrl ? defaultEmoji : image_url || defaultEmoji}</span>
      </div>
    );
  };

  return (
    <>
      {/* R27: Apply subtle accent border glow based on mode */}
      <BaseCard
        variant="solid"
        className={`overflow-hidden flex flex-col h-full p-0 transition-all duration-200 ${!canAfford && view === 'available' ? 'opacity-75' : 'hover:shadow-lg hover:scale-[1.02]'}`}
        style={{
          borderColor: accentVariant.borderColor,
          boxShadow: canAfford || view !== 'available' ? `0 0 12px ${accentVariant.glowColor}` : undefined,
        }}
      >
        {/* R26: Top area - Image/emoji - always square aspect ratio */}
        <div className="aspect-square">
          {renderImageOrEmoji()}
        </div>
      
      {/* Middle - Title and description - mobile optimized padding */}
      <div className="p-3 sm:p-4 md:p-5 flex-grow flex flex-col min-h-0">
        <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 sm:mb-2 line-clamp-2" title={name}>{name}</h3>
        {description && (
          <p className="text-sm text-white/70 line-clamp-2 flex-grow">{description}</p>
        )}
      </div>
      
      {/* Bottom - Price and action - mobile optimized */}
      <div className="p-3 sm:p-4 md:p-5 border-t border-gray-700/50 space-y-2 sm:space-y-3">
        {/* R20: Simplified cost display - static coin + number, no animation */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm text-white/60 whitespace-nowrap">Cost:</span>
            <Coin size="sm" variant="static" value={cost} />
          </div>
          {!canAfford && view === 'available' && creditsNeeded > 0 && (
            <span className="text-xs text-white/50 whitespace-nowrap">
              Need {creditsNeeded} more {creditsNeeded === 1 ? theme.strings.tokenSingular : theme.strings.tokenPlural}
            </span>
          )}
        </div>
        
        {/* Action button - mobile optimized tap target */}
        {view === 'created' ? (
          <div className="flex gap-2">
            <button 
              onClick={() => onEdit?.(reward)}
              className="flex-1 px-3 py-2.5 sm:py-2 min-h-[44px] flex items-center justify-center gap-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-gray-700/50"
              title={t('rewards.rewardCard.editButton')}
            >
              <Pencil size={16} />
              <span className="text-sm">Edit</span>
            </button>
            <button 
              onClick={() => onDelete?.(id)}
              className="flex-1 px-3 py-2.5 sm:py-2 min-h-[44px] flex items-center justify-center gap-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors border border-gray-700/50"
              title={t('rewards.rewardCard.deleteButton')}
            >
              <Trash2 size={16} />
              <span className="text-sm">Delete</span>
            </button>
          </div>
        ) : (
          <button 
            onClick={() => onAction?.(id)}
            className={`w-full px-4 py-3 min-h-[44px] text-sm sm:text-base font-bold rounded-lg transition-all ${
              canAfford && view === 'available'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-black hover:from-teal-600 hover:to-cyan-600 shadow-lg'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
            disabled={view !== 'available' || !onAction || !canAfford}
          >
            {view === 'available' ? (canAfford ? t('rewards.rewardCard.claimButton') : theme.strings.storeCantAffordLabel) : t('rewards.rewardCard.viewButton')}
          </button>
        )}
      </div>
      </BaseCard>

      {/* R27: Lightbox for full image view */}
      {image_url && isUrl(image_url) && (
        <RewardImageLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          imageUrl={image_url}
          alt={name}
        />
      )}
    </>
  );
};

export default RewardCard;
