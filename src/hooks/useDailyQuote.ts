// src/hooks/useDailyQuote.ts
// Custom hook to manage and cycle through daily quotes.
// Changes:
// - Fixed lint error: removed unnecessary 'unknown' constraint for generic type T in fisherYatesShuffle.

import { useState, useEffect } from 'react';
import { allQuotes, Quote } from '../lib/quotes';

// Fisher-Yates Shuffle Algorithm
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
  SHUFFLED_QUOTES: 'dailyQuote_shuffledQuotes_v1',
  CURRENT_INDEX: 'dailyQuote_currentIndex_v1',
  LAST_DATE: 'dailyQuote_lastDate_v1',
};

export const useDailyQuote = (): Quote | null => {
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !allQuotes || allQuotes.length === 0) {
      return; // Don't run on server or if there are no quotes
    }

    const todayStr = getTodayDateString();
    
    let shuffledQuotes: Quote[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SHUFFLED_QUOTES) || 'null') || [];
    let currentIndex: number = parseInt(localStorage.getItem(STORAGE_KEYS.CURRENT_INDEX) || '-1', 10);
    const lastQuoteDate: string | null = localStorage.getItem(STORAGE_KEYS.LAST_DATE);

    if (lastQuoteDate !== todayStr || shuffledQuotes.length === 0 || currentIndex === -1) {
      // It's a new day, or no quotes stored, or first ever run for this version of storage
      currentIndex++; // Move to next quote index

      if (currentIndex >= shuffledQuotes.length || shuffledQuotes.length === 0) {
        // Need to reshuffle: either end of list reached, or no list existed, or list was from an old version
        shuffledQuotes = fisherYatesShuffle([...allQuotes]);
        currentIndex = 0; // Start from the beginning of the new shuffled list
      }
      
      localStorage.setItem(STORAGE_KEYS.SHUFFLED_QUOTES, JSON.stringify(shuffledQuotes));
      localStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, currentIndex.toString());
      localStorage.setItem(STORAGE_KEYS.LAST_DATE, todayStr);
    }

    // Set the current quote for display
    if (shuffledQuotes.length > 0 && currentIndex >= 0 && currentIndex < shuffledQuotes.length) {
      setCurrentQuote(shuffledQuotes[currentIndex]);
    } else if (allQuotes.length > 0) {
      // Fallback if something went wrong (e.g. localStorage cleared manually mid-cycle but not date)
      // or it's the very first load and allQuotes is not empty but initial setup failed.
      const freshShuffle = fisherYatesShuffle([...allQuotes]);
      if (freshShuffle.length > 0) {
        setCurrentQuote(freshShuffle[0]);
        localStorage.setItem(STORAGE_KEYS.SHUFFLED_QUOTES, JSON.stringify(freshShuffle));
        localStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, '0');
        localStorage.setItem(STORAGE_KEYS.LAST_DATE, todayStr);
      }
    }
  }, []); // Effect runs once on mount

  return currentQuote;
};
