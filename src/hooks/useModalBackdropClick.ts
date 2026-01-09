// src/hooks/useModalBackdropClick.ts
// Hook to handle modal backdrop clicks while respecting text selection.
// Prevents modal from closing when user drags a text selection outside the modal.

import { useRef, useCallback } from 'react';

interface UseModalBackdropClickOptions {
  onClose: () => void;
}

interface UseModalBackdropClickReturn {
  handleBackdropClick: (e: React.MouseEvent) => void;
  handleBackdropMouseDown: (e: React.MouseEvent) => void;
  handleContentMouseDown: () => void;
}

export function useModalBackdropClick({ onClose }: UseModalBackdropClickOptions): UseModalBackdropClickReturn {
  // Track if mousedown started inside the modal content
  const mouseDownInsideRef = useRef(false);

  // Handle backdrop click - only close if click started AND ended on backdrop, and no text selection
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // If mousedown started inside modal, don't close (user was selecting text and dragged out)
    if (mouseDownInsideRef.current) {
      mouseDownInsideRef.current = false;
      return;
    }

    // Check if there's an active text selection - don't close if user just finished selecting
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    // Only close if clicking directly on backdrop (not on modal content)
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleContentMouseDown = useCallback(() => {
    mouseDownInsideRef.current = true;
  }, []);

  const handleBackdropMouseDown = useCallback((e: React.MouseEvent) => {
    // Reset the flag - only set to true if mousedown is on content
    if (e.target === e.currentTarget) {
      mouseDownInsideRef.current = false;
    }
  }, []);

  return {
    handleBackdropClick,
    handleBackdropMouseDown,
    handleContentMouseDown,
  };
}
