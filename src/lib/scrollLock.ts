// src/lib/scrollLock.ts
// Phase 2: Centralized body scroll locking with reference counting.
// Ensures scroll is locked when any overlay is open and unlocked only when all overlays are closed.

let lockCount = 0;
const originalOverflow = {
  body: '',
  html: '',
};

/**
 * Locks body scroll. Uses reference counting so multiple overlays can request lock
 * and scroll is only unlocked when all overlays release it.
 */
export function lockScroll(): void {
  lockCount++;
  
  if (lockCount === 1) {
    // First lock: save current styles and apply lock
    originalOverflow.body = document.body.style.overflow;
    originalOverflow.html = document.documentElement.style.overflow;
    
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Phase UX-1: Prevent iOS bounce scrolling and pull-to-refresh
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.touchAction = 'none';
  }
}

/**
 * Unlocks body scroll. Decrements reference count and only unlocks when count reaches 0.
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
    document.body.style.overscrollBehavior = '';
    document.documentElement.style.overscrollBehavior = '';
    document.body.style.touchAction = '';
  }
}

/**
 * Forces immediate unlock (resets count to 0). Use with caution.
 * Useful for cleanup scenarios where you want to ensure scroll is unlocked.
 */
export function forceUnlockScroll(): void {
  lockCount = 0;
  document.body.style.overflow = originalOverflow.body;
  document.documentElement.style.overflow = originalOverflow.html;
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.style.overscrollBehavior = '';
  document.documentElement.style.overscrollBehavior = '';
  document.body.style.touchAction = '';
}

