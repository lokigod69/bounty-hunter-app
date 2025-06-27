// src/components/RewardCard.tsx
// A component to display a single reward or bounty item.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import type { Database } from '../types/database';
import CreditDisplay from './CreditDisplay';

export type Reward = Database['public']['Tables']['rewards_store']['Row'];

interface RewardCardProps {
  reward: Reward;
  view: 'available' | 'created' | 'collected';
  onAction?: (rewardId: string) => void;
  onEdit?: (reward: Reward) => void;
  onDelete?: (rewardId: string) => void;
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, view, onAction, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const { id, name, description, image_url, credit_cost } = reward;
  const [imageError, setImageError] = useState(false);

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
        <img 
          src={image_url!} 
          alt={name} 
          className="w-full h-32 md:h-40 object-cover"
          onError={() => setImageError(true)}
        />
      );
    }
    
    return (
      <div className="w-full h-32 md:h-40 flex items-center justify-center bg-gray-700/50">
        <span className="text-4xl md:text-5xl">{displayUrl ? defaultEmoji : image_url || defaultEmoji}</span>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg flex flex-col h-full">
      {renderImageOrEmoji()}
      <div className="p-3 md:p-4 flex-grow">
        <h3 className="text-lg md:text-xl font-bold text-white mb-2 truncate" title={name}>{name}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </div>
      <div className="p-3 md:p-4 border-t border-gray-700/50 flex justify-between items-center">
        <CreditDisplay amount={credit_cost || 0} />
        {view === 'created' ? (
          <div className="flex space-x-1">
            <button 
              onClick={() => onEdit?.(reward)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title={t('rewards.rewardCard.editButton')}
            >
              <Pencil size={18} />
            </button>
            <button 
              onClick={() => onDelete?.(id)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title={t('rewards.rewardCard.deleteButton')}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => onAction?.(id)}
            className="px-4 py-2 text-sm md:text-base bg-teal-500 text-black font-bold rounded-lg hover:bg-teal-600 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
            disabled={view !== 'available' || !onAction}
          >
            {view === 'available' ? t('rewards.rewardCard.claimButton') : t('rewards.rewardCard.viewButton')}
          </button>
        )}
      </div>
    </div>
  );
};

export default RewardCard;
