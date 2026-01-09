// src/components/EmojiPicker.tsx
// A visual grid component for selecting an emoji icon.

import React from 'react';

const BOUNTY_ICONS = [
  { emoji: '🎁', label: 'Gift' },
  { emoji: '✈️', label: 'Travel' },
  { emoji: '🍔', label: 'Food' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '💆', label: 'Spa' },
  { emoji: '🎓', label: 'Learning' },
  { emoji: '🏆', label: 'Achievement' },
  { emoji: '💰', label: 'Money' },
  { emoji: '🎨', label: 'Art' },
  { emoji: '🏠', label: 'Home' },
  { emoji: '🎭', label: 'Entertainment' },
  { emoji: '🏖️', label: 'Vacation' },
  { emoji: '🛍️', label: 'Shopping' },
  { emoji: '📚', label: 'Books' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '⚽', label: 'Sports' },
  { emoji: '🍷', label: 'Drinks' },
  { emoji: '💎', label: 'Jewelry' },
  { emoji: '🚗', label: 'Car' },
  { emoji: '❤️', label: 'Love' }
];

interface EmojiPickerProps {
  selectedEmoji: string | null;
  onSelect: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ selectedEmoji, onSelect }) => {
  return (
    <div className="p-2 bg-gray-800/50 rounded-lg border border-gray-700">
      {/* No max-height/overflow here - let parent scroll container handle scrolling (iOS Safari fix) */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 gap-2">
        {BOUNTY_ICONS.map(({ emoji, label }) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className={`aspect-square flex items-center justify-center rounded-lg border-2 transition-all hover:scale-110 
              ${selectedEmoji === emoji 
                ? 'border-teal-500 bg-teal-500/20' 
                : 'border-gray-600 hover:border-gray-400'}`}
            title={label}
          >
            <span className="text-2xl md:text-3xl">{emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
