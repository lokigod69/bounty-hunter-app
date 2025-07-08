// src/components/ImageLightbox.tsx
// URGENT FIX: Restructured for maximum z-index (critical overlay layer for container, backdrop, and content)
// PHASE 2 FIX: Updated to use new z-index hierarchy system with critical overlay layer.

import { X } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  // Prevent background scroll when lightbox is open
  // useEffect(() => {
  //   document.body.style.overflow = 'hidden';
  //   return () => {
  //     document.body.style.overflow = 'unset';
  //   };
  // }, []);

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
