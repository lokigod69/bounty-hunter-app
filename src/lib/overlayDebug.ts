// src/lib/overlayDebug.ts
// Phase 10: Debug helper to identify zombie overlays in #overlay-root

export function logOverlayRootState(label: string): void {
  // Only run in dev mode
  if (!import.meta.env.DEV) return;

  const root = document.getElementById('overlay-root');
  if (!root) {
    console.log(`[OverlayDebug] ${label}: overlay-root not found`);
    return;
  }

  const children = Array.from(root.children) as HTMLElement[];

  console.log(
    `[OverlayDebug] ${label}: ${children.length} child(ren)`,
    children.map((el) => ({
      tag: el.tagName,
      overlay: el.getAttribute('data-overlay'),
      zIndex: getComputedStyle(el).zIndex,
      pointerEvents: getComputedStyle(el).pointerEvents,
      display: getComputedStyle(el).display,
      visibility: getComputedStyle(el).visibility,
    }))
  );
}

