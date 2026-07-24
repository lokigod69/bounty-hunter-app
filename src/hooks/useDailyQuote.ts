// src/hooks/useDailyQuote.ts
// Custom hook to cycle only the seven localized, in-world creed lines.

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

const STORAGE_KEYS = {
  SHUFFLED_QUOTES: 'dailyQuote_shuffledCreedIds_v4',
  CURRENT_INDEX: 'dailyQuote_currentCreedIndex_v4',
  LAST_DATE: 'dailyQuote_lastCreedDate_v4',
};

export const useDailyQuote = (): Quote | null => {
  const { t } = useTranslation('quotes');
  const [currentQuoteId, setCurrentQuoteId] = useState<QuoteId | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const todayStr = getTodayDateString();
    let shuffledQuoteIds: QuoteId[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SHUFFLED_QUOTES) || '[]');
      if (
        Array.isArray(stored) &&
        stored.length === QUOTE_IDS.length &&
        stored.every((id): id is QuoteId => QUOTE_IDS.includes(id))
      ) {
        shuffledQuoteIds = stored;
      }
    } catch {
      shuffledQuoteIds = [];
    }

    let currentIndex = parseInt(localStorage.getItem(STORAGE_KEYS.CURRENT_INDEX) || '-1', 10);
    const lastQuoteDate: string | null = localStorage.getItem(STORAGE_KEYS.LAST_DATE);

    if (todayStr !== lastQuoteDate || shuffledQuoteIds.length === 0) {
      if (currentIndex >= shuffledQuoteIds.length - 1 || shuffledQuoteIds.length === 0) {
        shuffledQuoteIds = fisherYatesShuffle(QUOTE_IDS);
        currentIndex = 0;
        localStorage.setItem(STORAGE_KEYS.SHUFFLED_QUOTES, JSON.stringify(shuffledQuoteIds));
      } else {
        currentIndex++;
      }
      
      localStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, String(currentIndex));
      localStorage.setItem(STORAGE_KEYS.LAST_DATE, todayStr);
    }

    if (currentIndex < 0 || currentIndex >= shuffledQuoteIds.length) {
      shuffledQuoteIds = fisherYatesShuffle(QUOTE_IDS);
      currentIndex = 0;
      localStorage.setItem(STORAGE_KEYS.SHUFFLED_QUOTES, JSON.stringify(shuffledQuoteIds));
      localStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, String(currentIndex));
      localStorage.setItem(STORAGE_KEYS.LAST_DATE, todayStr);
    }

    setCurrentQuoteId(shuffledQuoteIds[currentIndex]);
  }, []);

  if (!currentQuoteId) return null;
  return {
    text: t(`${currentQuoteId}.text`),
    author: t(`${currentQuoteId}.author`),
  };
};
