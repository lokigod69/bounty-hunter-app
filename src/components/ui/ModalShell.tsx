// src/components/ui/ModalShell.tsx
// One lightweight, generic modal shell that owns the cross-cutting modal
// mechanics so form modals only carry their own content:
//   - portal into the overlay root
//   - one backdrop recipe (bg-black/70 + blur) + z-index layering
//   - .modal-enter entry animation + glass-card surface
//   - text-selection-safe backdrop click, stopPropagation on the surface
//   - Escape-to-close, UIContext modal-layer registration (scroll lock/stacking)
//   - a standard 44px close button (X)
//   - role="dialog" / aria-modal / aria-labelledby|aria-label
//
// This is NOT MissionModalShell (the rich mission-detail shell with role/state
// theming). Use this for plain form modals: Create/EditBounty, TaskForm,
// ProofModal, ProfileEditModal.

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../context/UIContext';
import { useEscapeToClose } from '../../hooks/useEscapeToClose';
import { useModalBackdropClick } from '../../hooks/useModalBackdropClick';
import { getOverlayRoot } from '../../lib/overlayRoot';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  /** Value for the data-overlay attribute (pass the component name). */
  name: string;
  children: React.ReactNode;
  /** id of the element that labels the dialog (maps to aria-labelledby). */
  labelledBy?: string;
  /** Fallback accessible name when there is no labelledBy target. */
  ariaLabel?: string;
  /** Surface max width. Defaults to 'md'. */
  size?: 'md' | 'lg';
  /**
   * Mobile bottom-sheet layout: full-width, top-rounded, docked to the bottom
   * on small screens; centered card on sm+. Matches Create/EditBounty.
   */
  sheet?: boolean;
  /** Full-height mobile sheet (EditBounty). Only meaningful together with `sheet`. */
  tall?: boolean;
  /** Close when the backdrop is clicked. Defaults to true. */
  closeOnBackdrop?: boolean;
  /** Render the standard close button. Defaults to true. */
  showClose?: boolean;
  /** Extra classes appended to the surface. */
  className?: string;
}

export function ModalShell({
  isOpen,
  onClose,
  name,
  children,
  labelledBy,
  ariaLabel,
  size = 'md',
  sheet = false,
  tall = false,
  closeOnBackdrop = true,
  showClose = true,
  className = '',
}: ModalShellProps) {
  const { t } = useTranslation();
  const { openModal, clearLayer } = useUI();
  const { handleBackdropClick, handleBackdropMouseDown, handleContentMouseDown } =
    useModalBackdropClick({ onClose });

  // Register with the UIContext modal layer (scroll lock + backdrop stacking).
  useEffect(() => {
    if (!isOpen) return;
    openModal();
    return () => {
      clearLayer();
    };
  }, [isOpen, openModal, clearLayer]);

  useEscapeToClose(isOpen, onClose);

  if (!isOpen) return null;

  const sizeClass = size === 'lg' ? 'max-w-lg' : 'max-w-md';

  const alignClass = sheet
    ? 'items-end sm:items-center p-0 sm:p-4'
    : 'items-center p-2 sm:p-4';

  const shapeClass = sheet
    ? 'rounded-t-2xl sm:rounded-2xl'
    : 'rounded-2xl mx-2 sm:mx-4';

  const heightClass = tall
    ? 'h-[95vh] md:h-auto md:max-h-[85vh]'
    : 'max-h-[95vh] sm:max-h-[85vh]';

  const surfaceClass = [
    'relative w-full glass-card z-modal-content modal-enter flex flex-col overflow-hidden',
    sizeClass,
    shapeClass,
    heightClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div
      data-overlay={name}
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-modal-backdrop flex justify-center ${alignClass}`}
      onMouseDown={closeOnBackdrop ? handleBackdropMouseDown : undefined}
      onClick={closeOnBackdrop ? handleBackdropClick : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        tabIndex={-1}
        className={surfaceClass}
        onMouseDown={handleContentMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors z-modal-controls"
          >
            <X size={20} />
          </button>
        )}
        {children}
      </div>
    </div>,
    getOverlayRoot()
  );
}

export default ModalShell;
