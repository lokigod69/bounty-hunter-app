// Minimal shared dialog focus management with LIFO Tab trapping and restoration.

import { useEffect, type RefObject } from 'react';

interface FocusTrapEntry {
  id: symbol;
  getDialog: () => HTMLElement | null;
  previousFocus: HTMLElement | null;
}

const focusTrapStack: FocusTrapEntry[] = [];
const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => element.getAttribute('aria-hidden') !== 'true'
  );
}

function handleTab(event: KeyboardEvent) {
  if (event.key !== 'Tab') return;
  const top = focusTrapStack[focusTrapStack.length - 1];
  const dialog = top?.getDialog();
  if (!dialog) return;

  const focusable = getFocusableElements(dialog);
  if (focusable.length === 0) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

function syncFocusListener() {
  document.removeEventListener('keydown', handleTab);
  if (focusTrapStack.length > 0) {
    document.addEventListener('keydown', handleTab);
  }
}

export function useFocusTrap<T extends HTMLElement>(
  dialogRef: RefObject<T>,
  active: boolean
) {
  useEffect(() => {
    if (!active) return;

    const entry: FocusTrapEntry = {
      id: Symbol('dialog-focus-trap'),
      getDialog: () => dialogRef.current,
      previousFocus:
        document.activeElement instanceof HTMLElement ? document.activeElement : null,
    };
    focusTrapStack.push(entry);
    syncFocusListener();

    const dialog = dialogRef.current;
    if (dialog) {
      const firstFocusable = getFocusableElements(dialog)[0];
      (firstFocusable ?? dialog).focus({ preventScroll: true });
    }

    return () => {
      const index = focusTrapStack.findIndex((candidate) => candidate.id === entry.id);
      const wasTop = index === focusTrapStack.length - 1;
      if (index >= 0) focusTrapStack.splice(index, 1);
      syncFocusListener();

      if (!wasTop) return;
      if (entry.previousFocus?.isConnected) {
        entry.previousFocus.focus({ preventScroll: true });
        return;
      }

      const nextDialog = focusTrapStack[focusTrapStack.length - 1]?.getDialog();
      nextDialog?.focus({ preventScroll: true });
    };
  }, [active, dialogRef]);
}

export default useFocusTrap;
