// src/components/ImageLightbox.tsx
// Phase 2: Updated to use UIContext for critical overlay coordination.
// Critical overlay for full-screen image viewing.

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useUI } from '../context/UIContext';

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const { openCriticalOverlay, clearLayer } = useUI();

  // Phase 2: Use UIContext to coordinate critical overlay layers and scroll locking
  useEffect(() => {
    openCriticalOverlay(); // Phase 2: Use UIContext for critical overlay coordination
    return () => {
      clearLayer(); // Phase 2: Clear layer when lightbox closes
    };
  }, [openCriticalOverlay, clearLayer]);

  return (
    <div
      className="fixed inset-0 z-critical-overlay flex items-center justify-center p-4" // Main container with critical overlay z-index
      onClick={onClose}
    >
      {/* Backdrop with slightly lower z-index, handles close on click */}
      <div 
        className="absolute inset-0 bg-black/80 z-critical-overlay backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Content wrapper with highest z-index within this modal context */}
      <div className="relative z-critical-content max-w-full max-h-full bg-white dark:bg-neutral-800 p-2 rounded-lg shadow-xl">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-critical-controls p-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded-full transition-colors"
          aria-label="Close image"
        >
          <X size={20} />
        </button>
        <img
          src={src}
          alt={alt}
          className="block max-w-[90vw] max-h-[90vh] object-contain rounded"
        />
      </div>
    </div>
  );
}
