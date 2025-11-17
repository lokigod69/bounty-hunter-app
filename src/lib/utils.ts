// src/lib/utils.ts
// Phase 1: Utility functions for className merging (similar to clsx/tailwind-merge pattern).

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names using clsx and tailwind-merge.
 * Useful for conditionally combining Tailwind classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

