// src/components/EmojiPicker.tsx
// A visual grid component for selecting an emoji icon.

import React from 'react';
import { useTranslation } from 'react-i18next';

// The tooltip is a translated noun, so only the i18n key lives here — the
// English word used to be hard-coded next to the emoji and never reached the
// locale files.
const BOUNTY_ICONS: { emoji: string; labelKey: string }[] = [
  { emoji: '🎁', labelKey: 'emojiPicker.gift' },
  { emoji: '✈️', labelKey: 'emojiPicker.travel' },
  { emoji: '🍔', labelKey: 'emojiPicker.food' },
  { emoji: '🎮', labelKey: 'emojiPicker.gaming' },
  { emoji: '💆', labelKey: 'emojiPicker.spa' },
  { emoji: '🎓', labelKey: 'emojiPicker.learning' },
  { emoji: '🏆', labelKey: 'emojiPicker.achievement' },
  { emoji: '💰', labelKey: 'emojiPicker.money' },
  { emoji: '🎨', labelKey: 'emojiPicker.art' },
  { emoji: '🏠', labelKey: 'emojiPicker.home' },
  { emoji: '🎭', labelKey: 'emojiPicker.entertainment' },
  { emoji: '🏖️', labelKey: 'emojiPicker.vacation' },
  { emoji: '🛍️', labelKey: 'emojiPicker.shopping' },
  { emoji: '📚', labelKey: 'emojiPicker.books' },
  { emoji: '🎵', labelKey: 'emojiPicker.music' },
  { emoji: '⚽', labelKey: 'emojiPicker.sports' },
  { emoji: '🍷', labelKey: 'emojiPicker.drinks' },
  { emoji: '💎', labelKey: 'emojiPicker.jewelry' },
  { emoji: '🚗', labelKey: 'emojiPicker.car' },
  { emoji: '❤️', labelKey: 'emojiPicker.love' }
];

interface EmojiPickerProps {
  selectedEmoji: string | null;
  onSelect: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ selectedEmoji, onSelect }) => {
  const { t } = useTranslation();

  return (
    <div className="p-2 bg-gray-800/50 rounded-lg border border-gray-700">
      {/* No max-height/overflow here - let parent scroll container handle scrolling (iOS Safari fix) */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 gap-2">
        {BOUNTY_ICONS.map(({ emoji, labelKey }) => {
          const label = t(labelKey);
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              className={`aspect-square flex items-center justify-center rounded-lg border-2 transition-all hover:scale-110
                ${selectedEmoji === emoji
                  ? 'border-teal-500 bg-teal-500/20'
                  : 'border-gray-600 hover:border-gray-400'}`}
              title={label}
              aria-label={label}
            >
              <span className="text-2xl md:text-3xl">{emoji}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EmojiPicker;
