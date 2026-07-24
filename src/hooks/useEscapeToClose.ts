// src/hooks/useEscapeToClose.ts
// Shared LIFO Escape stack: one key press closes only the topmost dialog.
// Keeps each latest onClose in a ref so callers don't need to memoize it.

import { useEffect, useRef } from 'react';

interface EscapeEntry {
  id: symbol;
  close: () => void;
}

const escapeStack: EscapeEntry[] = [];

function handleEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  const top = escapeStack[escapeStack.length - 1];
  if (!top) return;

  event.preventDefault();
  event.stopPropagation();
  top.close();
}

function syncEscapeListener() {
  document.removeEventListener('keydown', handleEscape, true);
  if (escapeStack.length > 0) {
    document.addEventListener('keydown', handleEscape, true);
  }
}

export function useEscapeToClose(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const entry: EscapeEntry = {
      id: Symbol('dialog-escape-handler'),
      close: () => onCloseRef.current(),
    };
    escapeStack.push(entry);
    syncEscapeListener();

    return () => {
      const index = escapeStack.findIndex((candidate) => candidate.id === entry.id);
      if (index >= 0) escapeStack.splice(index, 1);
      syncEscapeListener();
    };
  }, [isOpen]);
}

export default useEscapeToClose;
