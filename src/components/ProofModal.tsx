// src/components/ProofModal.tsx
// Phase 2: Updated to use UIContext for modal coordination.
import React, { useState, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud, File as FileIcon } from 'lucide-react';
import { AppButton } from './ui/AppButton';
import { ModalShell } from './ui/ModalShell';
import { PROOF_MAX_FILE_SIZE, PROOF_MAX_FILE_SIZE_MB, PROOF_ALLOWED_FILE_TYPES, PROOF_ACCEPTED_TYPES_LABEL } from '../lib/proofConfig';

interface ProofModalProps {
  onClose: () => void;
  onSubmit: (file: File | null, textDescription?: string) => Promise<void>;
  uploadProgress: number;
}

const ProofModal: React.FC<ProofModalProps> = ({ onClose, onSubmit, uploadProgress }) => {
  const [file, setFile] = useState<File | null>(null);
  const [textDescription, setTextDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors.some(e => e.code === 'file-too-large')) {
        setError(`File is too large. Maximum size is ${PROOF_MAX_FILE_SIZE_MB}MB.`);
      } else {
        setError(`File type not supported. Please upload ${PROOF_ACCEPTED_TYPES_LABEL}.`);
      }
      return;
    }
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      // Validate file size
      if (selectedFile.size > PROOF_MAX_FILE_SIZE) {
        setError(`File is too large. Maximum size is ${PROOF_MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: PROOF_ALLOWED_FILE_TYPES,
    multiple: false,
    maxSize: PROOF_MAX_FILE_SIZE,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError(null);
    
    // Validation
    if (!file && !textDescription.trim()) {
      setError('Please provide a file or text description.');
      return;
    }

    // File size validation (double-check)
    if (file && file.size > PROOF_MAX_FILE_SIZE) {
      setError(`File is too large. Maximum size is ${PROOF_MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(file, textDescription.trim() || undefined);
      // Success - modal will close via parent component
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit proof. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell isOpen onClose={onClose} name="ProofModal" labelledBy="proofmodal-title">
      <div
        className="flex-1 overflow-y-auto p-6"
        style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}
      >
        <h2 id="proofmodal-title" className="text-2xl font-bold text-white mb-4">Submit Proof</h2>
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
                  <p className="text-xs mt-1">{PROOF_ACCEPTED_TYPES_LABEL}</p>
                </div>
              )}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          {/* Upload progress */}
          {uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div
                  className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 text-center">Uploading... {uploadProgress}%</p>
            </div>
          )}
          
          {/* Submit button */}
          <AppButton
            type="submit"
            variant="cta"
            fullWidth
            loading={isSubmitting}
            disabled={(!file && !textDescription.trim()) || uploadProgress > 0}
          >
            {isSubmitting ? 'Submitting...' : uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Submit for Review'}
          </AppButton>
        </form>
      </div>
    </ModalShell>
  );
};

export default ProofModal;
