// src/hooks/useDailyQuote.ts
// Custom hook to cycle only the seven localized, in-world creed lines.
// Design V2 Wave 2 (THE REGISTER §4.9): the creed follows your rank — a
// standing band unlocks a growing pool of lines, so the line at the foot of
// the board changes because *you* changed. Pass Standing.unlockedCreedLines;
// while standing is still loading pass undefined and the hook stays silent
// (PageQuote call sites already guard on null).
//
// Codex session review hardening: every storage access goes through safe
// helpers (a disabled/full localStorage must never take down the board for a
// cosmetic footer line — the effect used to throw into the ErrorBoundary);
// deck state is namespaced per user so two accounts on one device don't
// clobber each other's rotation; stored indices and decks are validated for
// integer bounds and uniqueness.

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

// v5: deck scoped to the standing band's unlocked pool AND to the user.
const storageKeys = (scope: string) => ({
  SHUFFLED_QUOTES: `dailyQuote_shuffledCreedIds_v5:${scope}`,
  CURRENT_INDEX: `dailyQuote_currentCreedIndex_v5:${scope}`,
  LAST_DATE: `dailyQuote_lastCreedDate_v5:${scope}`,
  POOL_SIZE: `dailyQuote_creedPoolSize_v5:${scope}`,
});

// localStorage may throw (SecurityError when disabled, QuotaExceededError on
// write). A footer quote must degrade to in-memory, never crash the page.
const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* rotation simply won't persist */
  }
};

export const useDailyQuote = (
  unlockedCreedLines?: number,
  userId?: string | null
): Quote | null => {
  const { t } = useTranslation('quotes');
  const [currentQuoteId, setCurrentQuoteId] = useState<QuoteId | null>(null);

  const poolSize =
    typeof unlockedCreedLines === 'number'
      ? Math.min(QUOTE_IDS.length, Math.max(1, Math.floor(unlockedCreedLines)))
      : null;
  const scope = userId ?? 'anon';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Standing not known yet — render nothing rather than draw from the wrong
    // pool and reshuffle a moment later.
    if (poolSize === null) return;

    const KEYS = storageKeys(scope);
    const pool = QUOTE_IDS.slice(0, poolSize);
    const todayStr = getTodayDateString();

    let shuffledQuoteIds: QuoteId[] = [];
    let storedPoolSize = -1;
    try {
      storedPoolSize = parseInt(readStorage(KEYS.POOL_SIZE) || '-1', 10);
      const stored = JSON.parse(readStorage(KEYS.SHUFFLED_QUOTES) || '[]');
      if (
        Array.isArray(stored) &&
        stored.length === pool.length &&
        stored.every((id): id is QuoteId => pool.includes(id)) &&
        new Set(stored).size === pool.length
      ) {
        shuffledQuoteIds = stored;
      }
    } catch {
      shuffledQuoteIds = [];
    }

    let currentIndex = parseInt(readStorage(KEYS.CURRENT_INDEX) || '-1', 10);
    if (!Number.isInteger(currentIndex)) currentIndex = -1;
    const lastQuoteDate: string | null = readStorage(KEYS.LAST_DATE);

    // Rank changed → the pool changed → deal a fresh deck from the new pool.
    const poolChanged = storedPoolSize !== poolSize || shuffledQuoteIds.length === 0;

    if (poolChanged) {
      shuffledQuoteIds = fisherYatesShuffle(pool);
      currentIndex = 0;
      writeStorage(KEYS.SHUFFLED_QUOTES, JSON.stringify(shuffledQuoteIds));
      writeStorage(KEYS.POOL_SIZE, String(poolSize));
      writeStorage(KEYS.CURRENT_INDEX, String(currentIndex));
      writeStorage(KEYS.LAST_DATE, todayStr);
    } else if (todayStr !== lastQuoteDate) {
      if (currentIndex >= shuffledQuoteIds.length - 1) {
        shuffledQuoteIds = fisherYatesShuffle(pool);
        currentIndex = 0;
        writeStorage(KEYS.SHUFFLED_QUOTES, JSON.stringify(shuffledQuoteIds));
      } else {
        currentIndex++;
      }
      writeStorage(KEYS.CURRENT_INDEX, String(currentIndex));
      writeStorage(KEYS.LAST_DATE, todayStr);
    }

    if (currentIndex < 0 || currentIndex >= shuffledQuoteIds.length) {
      shuffledQuoteIds = fisherYatesShuffle(pool);
      currentIndex = 0;
      writeStorage(KEYS.SHUFFLED_QUOTES, JSON.stringify(shuffledQuoteIds));
      writeStorage(KEYS.CURRENT_INDEX, String(currentIndex));
      writeStorage(KEYS.LAST_DATE, todayStr);
    }

    setCurrentQuoteId(shuffledQuoteIds[currentIndex]);
  }, [poolSize, scope]);

  if (!currentQuoteId || poolSize === null) return null;
  return {
    text: t(`${currentQuoteId}.text`),
    author: t(`${currentQuoteId}.author`),
  };
};
