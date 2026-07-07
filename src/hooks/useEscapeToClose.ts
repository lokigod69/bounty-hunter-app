// src/hooks/useEscapeToClose.ts
// Shared Escape-key handler for modals: closes the modal when Escape is pressed.
// Keeps the latest onClose in a ref so callers don't need to memoize it.

import { useEffect, useRef } from 'react';

export function useEscapeToClose(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
}

export default useEscapeToClose;
