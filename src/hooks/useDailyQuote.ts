// src/hooks/useDailyQuote.ts
// Custom hook to manage and cycle through daily quotes using i18next.
// The hook now pulls translated quotes from the 'quotes' namespace.

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface Quote {
  text: string;
  author: string;
}

const fisherYatesShuffle = <T>(array: T[]): T[] => {
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
  SHUFFLED_QUOTE_KEYS: 'dailyQuote_shuffledQuoteKeys_v2',
  CURRENT_INDEX: 'dailyQuote_currentIndex_v2',
  LAST_DATE: 'dailyQuote_lastDate_v2',
};

export const useDailyQuote = (): Quote | null => {
  const { t, i18n } = useTranslation('quotes');
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Get all quote keys from the 'quotes' namespace for the current language
        const allQuoteKeys = Object.keys(i18n.getResourceBundle(i18n.language, 'quotes') || {});

    if (allQuoteKeys.length === 0) return;

    const todayStr = getTodayDateString();
    
    let shuffledKeys: string[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SHUFFLED_QUOTE_KEYS) || 'null') || [];
    let currentIndex: number = parseInt(localStorage.getItem(STORAGE_KEYS.CURRENT_INDEX) || '-1', 10);
    const lastQuoteDate: string | null = localStorage.getItem(STORAGE_KEYS.LAST_DATE);

    if (lastQuoteDate !== todayStr || shuffledKeys.length === 0 || currentIndex === -1) {
      currentIndex++;

      if (currentIndex >= shuffledKeys.length || shuffledKeys.length === 0) {
        shuffledKeys = fisherYatesShuffle(allQuoteKeys);
        currentIndex = 0;
      }
      
      localStorage.setItem(STORAGE_KEYS.SHUFFLED_QUOTE_KEYS, JSON.stringify(shuffledKeys));
      localStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, currentIndex.toString());
      localStorage.setItem(STORAGE_KEYS.LAST_DATE, todayStr);
    }

    if (shuffledKeys.length > 0 && currentIndex < shuffledKeys.length) {
      const currentKey = shuffledKeys[currentIndex];
      // Use the 't' function to get the translated quote object
      const quoteObject = t(currentKey, { returnObjects: true }) as Quote;
      setCurrentQuote(quoteObject);

    }

  }, [i18n.language, t, i18n]); // Rerun effect if language changes

  return currentQuote;
};