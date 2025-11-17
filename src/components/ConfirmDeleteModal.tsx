// src/components/ConfirmDeleteModal.tsx
// Phase 2: Updated to use overlay-root, UIContext, and standardized z-critical-* classes.
// A reusable modal component for confirming destructive actions.

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { getOverlayRoot } from '../lib/overlayRoot';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isConfirming = false,
}) => {
  const { openCriticalOverlay, clearLayer } = useUI();

  useEffect(() => {
    if (isOpen) {
      openCriticalOverlay(); // Phase 2: Use UIContext for critical overlay coordination
    } else {
      clearLayer();
    }
  }, [isOpen, openCriticalOverlay, clearLayer]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-critical-overlay flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="glass-card p-6 rounded-lg shadow-xl w-full max-w-md mx-4 z-critical-content">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <AlertTriangle size={24} className="mr-2 text-red-400" />
            {title}
          </h3>
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="modal-icon-button z-critical-controls"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        <p className="text-[var(--text-secondary)] mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="btn btn-secondary btn-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={`btn-danger-galactic btn-sm ${isConfirming ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isConfirming ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    getOverlayRoot() // Phase 2: Portal into overlay-root
  );
};

export default ConfirmDeleteModal;
