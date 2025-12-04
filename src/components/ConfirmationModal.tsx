// src/components/ConfirmationModal.tsx
// Phase 2: Updated to use overlay-root, UIContext, and standardized z-index classes.
// A reusable modal for confirming actions.

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { getOverlayRoot } from '../lib/overlayRoot';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  loading = false,
}) => {
  const { openModal, clearLayer } = useUI();

  // R7 FIX: Only setup overlay when THIS modal is open
  useEffect(() => {
    if (!isOpen) return;
    openModal();
    return () => {
      clearLayer();
    };
  }, [isOpen, openModal, clearLayer]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-modal-backdrop p-4 animate-fade-in">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6 w-full max-w-md relative z-modal-content animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-100 transition-colors"
          aria-label="Close modal"
          disabled={loading}
        >
          <X size={24} />
        </button>
        <div className="flex items-center mb-4">
          <AlertTriangle size={28} className="text-red-500 mr-3" />
          <h2 className="text-2xl font-bold text-red-400">{title}</h2>
        </div>
        <p className="text-slate-300 mb-6 whitespace-pre-line">{message}</p>
        
        <div className="flex justify-end space-x-3 pt-2">
          <button 
            type="button"
            onClick={onClose}
            className="btn btn-secondary bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-50"
            disabled={loading}
          >
            {cancelButtonText}
          </button>
          <button 
            type="button" 
            onClick={onConfirm}
            className="btn btn-danger bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmButtonText}
          </button>
        </div>
      </div>
    </div>,
    getOverlayRoot() // Phase 2: Portal into overlay-root
  );
};

export default ConfirmationModal;
