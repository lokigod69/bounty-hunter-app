// src/components/modals/RewardImageLightbox.tsx
// R27: Full-screen lightbox for viewing reward images at native aspect ratio
// Opens on thumbnail click, closes on backdrop/ESC/button

import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getOverlayRoot } from '../../lib/overlayRoot';

interface RewardImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt?: string;
}

export const RewardImageLightbox: React.FC<RewardImageLightboxProps> = ({
  isOpen,
  onClose,
  imageUrl,
  alt = 'Reward image',
}) => {
  // Handle ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      data-overlay="RewardImageLightbox"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-fade-in" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close image viewer"
      >
        <X size={24} />
      </button>

      {/* Image container - native aspect ratio */}
      <div
        className="relative z-10 animate-modal-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={alt}
          className="max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          style={{
            // Ensure image doesn't get distorted
            width: 'auto',
            height: 'auto',
          }}
        />
      </div>

      {/* Optional: Image label */}
      {alt && alt !== 'Reward image' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-black/60 rounded-lg">
          <p className="text-white text-sm font-medium">{alt}</p>
        </div>
      )}
    </div>,
    getOverlayRoot()
  );
};

export default RewardImageLightbox;
