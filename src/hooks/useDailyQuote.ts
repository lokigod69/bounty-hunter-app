// src/hooks/useDailyQuote.ts
// Custom hook to cycle only the seven localized, in-world creed lines.
// Design V2 Wave 2 (THE REGISTER §4.9): the creed follows your rank — a
// standing band unlocks a growing pool of lines, so the line at the foot of
// the board changes because *you* changed. Pass Standing.unlockedCreedLines;
// while standing is still loading pass undefined and the hook stays silent
// (PageQuote call sites already guard on null).

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface Quote {
  text: string;
  author: string;
}

const QUOTE_IDS = [
  'quote1',
  'quote2',
  'quote3',
  'quote4',
  'quote5',
  'quote6',
  'quote7',
] as const;
type QuoteId = (typeof QUOTE_IDS)[number];

const fisherYatesShuffle = <T>(array: readonly T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const getTodayDateString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

// v5: the deck is now scoped to the standing band's unlocked pool.
const STORAGE_KEYS = {
  SHUFFLED_QUOTES: 'dailyQuote_shuffledCreedIds_v5',
  CURRENT_INDEX: 'dailyQuote_currentCreedIndex_v5',
  LAST_DATE: 'dailyQuote_lastCreedDate_v5',
  POOL_SIZE: 'dailyQuote_creedPoolSize_v5',
};

export const useDailyQuote = (unlockedCreedLines?: number): Quote | null => {
  const { t } = useTranslation('quotes');
  const [currentQuoteId, setCurrentQuoteId] = useState<QuoteId | null>(null);

  const poolSize =
    typeof unlockedCreedLines === 'number'
      ? Math.min(QUOTE_IDS.length, Math.max(1, Math.floor(unlockedCreedLines)))
      : null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Standing not known yet — render nothing rather than draw from the wrong
    // pool and reshuffle a moment later.
    if (poolSize === null) return;

    const pool = QUOTE_IDS.slice(0, poolSize);
    const todayStr = getTodayDateString();

    let shuffledQuoteIds: QuoteId[] = [];
    let storedPoolSize = -1;
    try {
      storedPoolSize = parseInt(localStorage.getItem(STORAGE_KEYS.POOL_SIZE) || '-1', 10);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SHUFFLED_QUOTES) || '[]');
      if (
        Array.isArray(stored) &&
        stored.length === pool.length &&
        stored.every((id): id is QuoteId => pool.includes(id))
      ) {
        shuffledQuoteIds = stored;
      }
    } catch {
      shuffledQuoteIds = [];
    }

    let currentIndex = parseInt(localStorage.getItem(STORAGE_KEYS.CURRENT_INDEX) || '-1', 10);
    const lastQuoteDate: string | null = localStorage.getItem(STORAGE_KEYS.LAST_DATE);

    // Rank changed → the pool changed → deal a fresh deck from the new pool.
    const poolChanged = storedPoolSize !== poolSize || shuffledQuoteIds.length === 0;

    if (poolChanged) {
      shuffledQuoteIds = fisherYatesShuffle(pool);
      currentIndex = 0;
      localStorage.setItem(STORAGE_KEYS.SHUFFLED_QUOTES, JSON.stringify(shuffledQuoteIds));
      localStorage.setItem(STORAGE_KEYS.POOL_SIZE, String(poolSize));
      localStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, String(currentIndex));
      localStorage.setItem(STORAGE_KEYS.LAST_DATE, todayStr);
    } else if (todayStr !== lastQuoteDate) {
      if (currentIndex >= shuffledQuoteIds.length - 1) {
        shuffledQuoteIds = fisherYatesShuffle(pool);
        currentIndex = 0;
        localStorage.setItem(STORAGE_KEYS.SHUFFLED_QUOTES, JSON.stringify(shuffledQuoteIds));
      } else {
        currentIndex++;
      }
      localStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, String(currentIndex));
      localStorage.setItem(STORAGE_KEYS.LAST_DATE, todayStr);
    }

    if (currentIndex < 0 || currentIndex >= shuffledQuoteIds.length) {
      shuffledQuoteIds = fisherYatesShuffle(pool);
      currentIndex = 0;
      localStorage.setItem(STORAGE_KEYS.SHUFFLED_QUOTES, JSON.stringify(shuffledQuoteIds));
      localStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, String(currentIndex));
      localStorage.setItem(STORAGE_KEYS.LAST_DATE, todayStr);
    }

    setCurrentQuoteId(shuffledQuoteIds[currentIndex]);
  }, [poolSize]);

  if (!currentQuoteId || poolSize === null) return null;
  return {
    text: t(`${currentQuoteId}.text`),
    author: t(`${currentQuoteId}.author`),
  };
};
