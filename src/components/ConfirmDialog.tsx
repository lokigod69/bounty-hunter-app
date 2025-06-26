// src/components/ConfirmDialog.tsx
// A reusable confirmation dialog modal.

import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-sm m-auto border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-2 rounded-lg text-white bg-gray-700 hover:bg-gray-600 transition"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            className="px-6 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition disabled:bg-red-800"
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
