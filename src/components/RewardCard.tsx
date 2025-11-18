// src/components/RewardCard.tsx
// Phase 1: Updated to use BaseCard for consistent styling.
// P4: Redesigned for aspirational feel with clearer visual hierarchy and affordability hints.
// A component to display a single reward or bounty item.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Pencil, Trash2 } from 'lucide-react';
import type { Database } from '../types/database';
import CreditDisplay from './CreditDisplay';
import { BaseCard } from './ui/BaseCard';

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
  const { theme } = useTheme();
  const { id, name, description, image_url, credit_cost } = reward;
  const [imageError, setImageError] = useState(false);
  
  // P4: Calculate affordability
  const cost = credit_cost || 0;
  const canAfford = currentCredits >= cost;
  const creditsNeeded = Math.max(0, cost - currentCredits);

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
        <div className="w-full h-40 md:h-48 relative overflow-hidden">
          <img 
            src={image_url!} 
            alt={name} 
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          {!canAfford && view === 'available' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white/80 text-sm font-semibold">{theme.strings.storeCantAffordLabel}</span>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className={`w-full h-40 md:h-48 flex items-center justify-center ${canAfford || view !== 'available' ? 'bg-gradient-to-br from-teal-500/20 to-cyan-500/20' : 'bg-gray-700/50'}`}>
        <span className="text-5xl md:text-6xl">{displayUrl ? defaultEmoji : image_url || defaultEmoji}</span>
      </div>
    );
  };

  return (
    <BaseCard variant="solid" className={`overflow-hidden flex flex-col h-full p-0 transition-all duration-200 ${!canAfford && view === 'available' ? 'opacity-75' : 'hover:shadow-lg hover:scale-[1.02]'}`}>
      {/* P4: Top area - Image/emoji */}
      {renderImageOrEmoji()}
      
      {/* P4: Middle - Title and description */}
      <div className="p-4 md:p-5 flex-grow flex flex-col">
        <h3 className="text-title font-bold text-white mb-2 line-clamp-2" title={name}>{name}</h3>
        {description && (
          <p className="text-body text-white/70 text-sm line-clamp-2 flex-grow">{description}</p>
        )}
      </div>
      
      {/* P4: Bottom - Price and action */}
      <div className="p-4 md:p-5 border-t border-gray-700/50 space-y-3">
        {/* Price badge - prominent */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-meta text-white/60">Cost:</span>
            <CreditDisplay amount={cost} size="medium" shimmerType="premium" />
          </div>
          {!canAfford && view === 'available' && creditsNeeded > 0 && (
            <span className="text-xs text-white/50">
              Need {creditsNeeded} more {creditsNeeded === 1 ? theme.strings.tokenSingular : theme.strings.tokenPlural}
            </span>
          )}
        </div>
        
        {/* Action button */}
        {view === 'created' ? (
          <div className="flex space-x-2">
            <button 
              onClick={() => onEdit?.(reward)}
              className="flex-1 px-3 py-2 flex items-center justify-center gap-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-gray-700/50"
              title={t('rewards.rewardCard.editButton')}
            >
              <Pencil size={16} />
              <span className="text-sm">Edit</span>
            </button>
            <button 
              onClick={() => onDelete?.(id)}
              className="flex-1 px-3 py-2 flex items-center justify-center gap-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors border border-gray-700/50"
              title={t('rewards.rewardCard.deleteButton')}
            >
              <Trash2 size={16} />
              <span className="text-sm">Delete</span>
            </button>
          </div>
        ) : (
          <button 
            onClick={() => onAction?.(id)}
            className={`w-full px-4 py-3 text-base font-bold rounded-lg transition-all ${
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
  );
};

export default RewardCard;
