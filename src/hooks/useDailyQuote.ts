// src/hooks/useDailyQuote.ts
// Custom hook to manage and cycle through daily quotes.
// The hook now pulls quotes directly from the allQuotes array.

import { useState, useEffect } from 'react';
import { allQuotes, Quote } from '../lib/quotes';

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
  SHUFFLED_QUOTES: 'dailyQuote_shuffledQuotes_v3',
  CURRENT_INDEX: 'dailyQuote_currentIndex_v3',
  LAST_DATE: 'dailyQuote_lastDate_v3',
};

export const useDailyQuote = (): Quote | null => {
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || allQuotes.length === 0) return;

    const todayStr = getTodayDateString();
    
    let shuffledQuotes: Quote[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SHUFFLED_QUOTES) || 'null') || [];
    let currentIndex: number = parseInt(localStorage.getItem(STORAGE_KEYS.CURRENT_INDEX) || '-1', 10);
    const lastQuoteDate: string | null = localStorage.getItem(STORAGE_KEYS.LAST_DATE);

    if (todayStr !== lastQuoteDate || shuffledQuotes.length === 0) {
      if (currentIndex >= shuffledQuotes.length - 1 || shuffledQuotes.length === 0) {
        shuffledQuotes = fisherYatesShuffle(allQuotes);
        currentIndex = 0;
        localStorage.setItem(STORAGE_KEYS.SHUFFLED_QUOTES, JSON.stringify(shuffledQuotes));
      } else {
        currentIndex++;
      }
      
      localStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, String(currentIndex));
      localStorage.setItem(STORAGE_KEYS.LAST_DATE, todayStr);
    }

    if (currentIndex < 0 || currentIndex >= shuffledQuotes.length) {
      shuffledQuotes = fisherYatesShuffle(allQuotes);
      currentIndex = 0;
      localStorage.setItem(STORAGE_KEYS.SHUFFLED_QUOTES, JSON.stringify(shuffledQuotes));
      localStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, String(currentIndex));
      localStorage.setItem(STORAGE_KEYS.LAST_DATE, todayStr);
    }
    
    setCurrentQuote(shuffledQuotes[currentIndex]);

  }, []);

  return currentQuote;
};