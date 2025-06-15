// src/utils/dateUtils.ts
// Utility functions for date calculations.

/**
 * Calculates the start of the week (Sunday or Monday, depending on locale or definition) for a given date.
 * This implementation considers Sunday as the first day of the week (0).
 * @param date The date for which to find the start of the week.
 * @returns A new Date object representing the start of the week (at 00:00:00 hours).
 */
export const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
  // If dayOfWeek is 0 (Sunday), we want to go back 0 days from Sunday to get Sunday.
  // If dayOfWeek is 1 (Monday), we want to go back 1 day from Monday to get Sunday.
  // etc.
  // However, some locales/definitions consider Monday the start. For consistency with typical US calendar (Sunday start):
  const diff = d.getDate() - dayOfWeek;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Calculates the end of the week (Saturday) for a given date.
 * Assumes Sunday is the start of the week.
 * @param date The date for which to find the end of the week.
 * @returns A new Date object representing the end of the week (at 23:59:59.999 hours).
 */
export const getEndOfWeek = (date: Date): Date => {
  const d = getStartOfWeek(date); // Get the Sunday of that week
  d.setDate(d.getDate() + 6);    // Add 6 days to get to Saturday
  d.setHours(23, 59, 59, 999);
  return d;
};
