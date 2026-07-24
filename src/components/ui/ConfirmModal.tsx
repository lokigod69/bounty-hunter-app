// src/components/ui/ConfirmModal.tsx
// Unified confirmation modal (replaces ConfirmDeleteModal + ConfirmDialog).
// Modal material, LIFO Escape, and trapped focus sit above other dialogs.

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { getOverlayRoot } from '../../lib/overlayRoot';
import { useEscapeToClose } from '../../hooks/useEscapeToClose';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { AppButton } from './AppButton';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loadingLabel,
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  const { openCriticalOverlay, clearLayer } = useUI();
  const cardRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    openCriticalOverlay();
    return () => {
      clearLayer();
    };
  }, [isOpen, openCriticalOverlay, clearLayer]);

  useEscapeToClose(isOpen, () => {
    if (!loadingRef.current) onCloseRef.current();
  });
  useFocusTrap(cardRef, isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-critical-overlay flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="modal-enter w-full max-w-md p-6 rounded-2xl z-critical-content outline-none"
        style={{
          background: 'var(--modal-bg)',
          border: '1px solid var(--modal-border)',
          boxShadow: 'var(--modal-shadow)',
          backdropFilter: 'blur(var(--modal-blur-desktop))',
          WebkitBackdropFilter: 'blur(var(--modal-blur-desktop))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-subtitle text-white font-semibold flex items-center gap-2">
            {variant === 'danger' && <AlertTriangle size={22} className="text-red-400 flex-shrink-0" />}
            {title}
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="modal-icon-button z-critical-controls min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
        {message && <p className="text-body text-white/70 mb-6">{message}</p>}
        <div className="flex justify-end gap-3">
          <AppButton variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </AppButton>
          <AppButton
            variant={variant === 'danger' ? 'danger' : 'cta'}
            onClick={onConfirm}
            loading={loading}
          >
            {loading ? loadingLabel ?? confirmLabel : confirmLabel}
          </AppButton>
        </div>
      </div>
    </div>,
    getOverlayRoot()
  );
}

export default ConfirmModal;
