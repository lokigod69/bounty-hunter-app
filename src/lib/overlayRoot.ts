// src/lib/overlayRoot.ts
// Phase 2: Centralized overlay root helper for consistent modal portaling.
// Provides a single overlay root element that all modals/overlays should portal into.

/**
 * Gets the overlay root element where all modals and overlays should be portaled.
 * Throws a clear error if the element is missing (e.g. HTML not loaded yet).
 */
export function getOverlayRoot(): HTMLElement {
  const overlayRoot = document.getElementById('overlay-root');
  if (!overlayRoot) {
    throw new Error(
      'Overlay root element (#overlay-root) not found. Ensure it exists in index.html.'
    );
  }
  return overlayRoot;
}

