// src/lib/debounce.ts
// Small dependency-free trailing debounce. Used to coalesce bursts of
// realtime events (e.g. several rows changing in one transaction) into a
// single downstream call instead of one per event.

export interface Debounced<Args extends unknown[]> {
  (...args: Args): void;
  /** Cancels any pending invocation without firing it. */
  cancel: () => void;
}

/**
 * Returns a debounced wrapper around `fn`: each call resets a `waitMs`
 * timer, and `fn` only actually runs once the timer elapses without a
 * further call (a "trailing" debounce). Call `.cancel()` to drop any
 * pending invocation, e.g. on unmount.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number
): Debounced<Args> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  }) as Debounced<Args>;

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return debounced;
}
