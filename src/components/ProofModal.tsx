// src/components/ProofModal.tsx
// Phase 2: Updated to use UIContext for modal coordination.
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { X, UploadCloud, File as FileIcon } from 'lucide-react';
import { useUI } from '../context/UIContext';

interface ProofModalProps {
  taskId: string;
  onClose: () => void;
  onSubmit: (file: File | null, textDescription?: string) => Promise<void>;
  uploadProgress: number;
}

const ProofModal: React.FC<ProofModalProps> = ({ onClose, onSubmit, uploadProgress, taskId }) => {
  const { openModal, clearLayer } = useUI();
  const [file, setFile] = useState<File | null>(null);
  const [textDescription, setTextDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    openModal(); // Phase 2: Use UIContext to coordinate overlay layers
    return () => {
      clearLayer(); // Phase 2: Clear layer when modal unmounts
    };
  }, [openModal, clearLayer]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      setError('File type not supported. Please upload an image or PDF.');
      return;
    }
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'application/pdf': [],
    },
    multiple: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !textDescription.trim()) {
      setError('Please provide a file or text description.');
      return;
    }
    await onSubmit(file, textDescription.trim() || undefined);
  };

  console.log("[ProofModal] Rendering modal");

  return (
    <div 
      className="fixed inset-0 z-modal-backdrop flex items-center justify-center bg-black/70 backdrop-blur-sm" 
      onClick={() => {
        console.log("[ProofModal] Backdrop clicked, closing");
        onClose();
      }}
    >
      <div 
        className="relative bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-[90vw] max-w-md p-6 z-modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={(e) => {
            e.stopPropagation();
            console.log("[ProofModal] Close button clicked");
            onClose();
          }} 
          title="Close" 
          className="absolute top-3 right-3 text-slate-400 hover:text-white z-modal-controls p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold text-white mb-4">Submit Proof</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Text description input */}
          <div>
            <label htmlFor="proof-description" className="block text-sm font-medium text-white/70 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="proof-description"
              value={textDescription}
              onChange={(e) => setTextDescription(e.target.value)}
              placeholder="Describe what you did or add any notes..."
              className="input-field w-full text-white h-24 resize-none"
              maxLength={500}
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Attach File (Optional)
            </label>
            <div
              {...getRootProps()}
              className={`flex justify-center items-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragActive ? 'border-indigo-400 bg-slate-700/50' : 'border-slate-600 hover:border-indigo-500'
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="text-center text-slate-300">
                  <FileIcon size={48} className="mx-auto mb-2" />
                  <p className="font-semibold">{file.name}</p>
                  <p className="text-xs">({(file.size / 1024).toFixed(2)} KB)</p>
                </div>
              ) : (
                <div className="text-center text-slate-400">
                  <UploadCloud size={48} className="mx-auto mb-2" />
                  <p className="font-semibold">
                    {isDragActive ? 'Drop the file here...' : 'Drag & drop or click to select'}
                  </p>
                  <p className="text-xs mt-1">PNG, JPG, or PDF</p>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {uploadProgress > 0 && (
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div
                className="bg-indigo-500 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
          <button 
            type="submit" 
            className="btn-primary w-full py-2" 
            disabled={(!file && !textDescription.trim()) || uploadProgress > 0}
          >
            {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Submit for Review'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProofModal;
