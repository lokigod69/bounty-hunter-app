// src/hooks/useClickOutside.ts
// Custom hook to detect clicks outside a specified element.
// Useful for closing dropdowns, modals, or other popovers when the user clicks away.

import { useEffect, RefObject } from 'react';

type EventType = MouseEvent | TouchEvent;

/**
 * Custom hook to handle clicks outside a specified element.
 * @param ref RefObject pointing to the DOM element to monitor.
 * @param handler Callback function to execute when a click outside is detected.
 */
function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: EventType) => void
) {
  useEffect(() => {
    const listener = (event: EventType) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]); // Reload only if ref or handler changes
}

export default useClickOutside;
