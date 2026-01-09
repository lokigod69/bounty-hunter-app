// src/lib/scrollLock.ts
// Phase 2: Centralized body scroll locking with reference counting.
// Ensures scroll is locked when any overlay is open and unlocked only when all overlays are closed.
// R32: Fixed scroll position preservation to prevent black screen after modal close.

let lockCount = 0;
let savedScrollY = 0;
const originalOverflow = {
  body: '',
  html: '',
};

/**
 * Locks body scroll. Uses reference counting so multiple overlays can request lock
 * and scroll is only unlocked when all overlays release it.
 *
 * R32: Now preserves scroll position by saving scrollY before position:fixed
 * and applying a negative top offset to maintain visual position.
 */
export function lockScroll(): void {
  lockCount++;

  if (lockCount === 1) {
    // First lock: save current scroll position and styles
    savedScrollY = window.scrollY;
    originalOverflow.body = document.body.style.overflow;
    originalOverflow.html = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Phase UX-1: Prevent iOS bounce scrolling and pull-to-refresh
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    // R32: Apply negative top to maintain visual scroll position
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.touchAction = 'none';
  }
}

/**
 * Unlocks body scroll. Decrements reference count and only unlocks when count reaches 0.
 *
 * R32: Restores the saved scroll position after unlocking.
 */
export function unlockScroll(): void {
  if (lockCount > 0) {
    lockCount--;
  }

  if (lockCount === 0) {
    // Last unlock: restore original styles
    document.body.style.overflow = originalOverflow.body;
    document.documentElement.style.overflow = originalOverflow.html;
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    document.body.style.overscrollBehavior = '';
    document.documentElement.style.overscrollBehavior = '';
    document.body.style.touchAction = '';

    // R32: Restore scroll position after position:fixed is removed
    window.scrollTo(0, savedScrollY);
  }
}

/**
 * Forces immediate unlock (resets count to 0). Use with caution.
 * Useful for cleanup scenarios where you want to ensure scroll is unlocked.
 */
export function forceUnlockScroll(): void {
  const scrollToRestore = savedScrollY;
  lockCount = 0;
  savedScrollY = 0;
  document.body.style.overflow = originalOverflow.body;
  document.documentElement.style.overflow = originalOverflow.html;
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.style.top = '';
  document.body.style.overscrollBehavior = '';
  document.documentElement.style.overscrollBehavior = '';
  document.body.style.touchAction = '';

  // R32: Restore scroll position
  window.scrollTo(0, scrollToRestore);
}

