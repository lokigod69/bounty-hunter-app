// src/components/ImageLightbox.tsx
// Component to display an image in a lightbox overlay.
// URGENT FIX: Restructured for maximum z-index (z-[99999] for container, z-[99998] for backdrop, z-[100000] for content)
// to ensure it appears on top of all other elements. Content is centered and closable.

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
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4" // Main container with highest z-index context
      // onClick for the main container is removed, will be on backdrop
    >
      {/* Backdrop with slightly lower z-index, handles close on click */}
      <div 
        className="absolute inset-0 bg-black/80 z-[99998] backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Content wrapper with highest z-index within this modal context */}
      <div
        className="relative z-[100000] max-w-full max-h-full bg-white dark:bg-neutral-800 p-2 rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to overlay
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 p-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded-full transition-colors"
          aria-label="Close image lightbox"
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
