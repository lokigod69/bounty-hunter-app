// src/components/ProofModal.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { X, UploadCloud, File as FileIcon } from 'lucide-react';

interface ProofModalProps {
  taskId: string;
  onClose: () => void;
  onSubmit: (file: File) => Promise<void>;
  uploadProgress: number;
}

const ProofModal: React.FC<ProofModalProps> = ({ onClose, onSubmit, uploadProgress, taskId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (!file) {
      setError('Please select a file to submit.');
      return;
    }
    await onSubmit(file);
  };

  return (
    <div className="fixed inset-0 z-modal-backdrop flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-[90vw] max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} title="Close" className="absolute top-3 right-3 text-slate-400 hover:text-white">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold text-white mb-4">Submit Proof for Task {taskId}</h2>
        <form onSubmit={handleSubmit}>
          <div
            {...getRootProps()}
            className={`mt-4 flex justify-center items-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
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
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          {uploadProgress > 0 && (
            <div className="w-full bg-slate-700 rounded-full h-2.5 mt-4">
              <div
                className="bg-indigo-500 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
          <button type="submit" className="btn-primary w-full mt-6 py-2" disabled={!file || uploadProgress > 0}>
            {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Submit for Review'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProofModal;
