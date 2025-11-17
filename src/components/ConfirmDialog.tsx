// src/components/ConfirmDialog.tsx
// Phase 2: Updated to use overlay-root, UIContext, and standardized z-index classes.
// A reusable confirmation dialog modal.

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useUI } from '../context/UIContext';
import { getOverlayRoot } from '../lib/overlayRoot';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
  const { t } = useTranslation();
  const { openModal, clearLayer } = useUI();

  useEffect(() => {
    if (isOpen) {
      openModal(); // Phase 2: Use UIContext to coordinate overlay layers
    } else {
      clearLayer();
    }
  }, [isOpen, openModal, clearLayer]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-modal-backdrop p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-sm m-auto border border-gray-700 z-modal-content">
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-2 rounded-lg text-white bg-gray-700 hover:bg-gray-600 transition"
            disabled={isLoading}
          >
            {t('rewards.confirmDialog.cancelButton')}
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            className="px-6 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition disabled:bg-red-800"
            disabled={isLoading}
          >
            {isLoading ? t('rewards.confirmDialog.deletingButton') : t('rewards.confirmDialog.confirmButton')}
          </button>
        </div>
      </div>
    </div>,
    getOverlayRoot() // Phase 2: Portal into overlay-root
  );
};

export default ConfirmDialog;
