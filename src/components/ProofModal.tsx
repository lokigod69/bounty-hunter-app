// src/components/ProofModal.tsx
// Modal for uploading proof of task completion

import React, { useState, useRef } from 'react';
import { X, Upload, Image, FileVideo, AlertCircle } from 'lucide-react';

interface ProofModalProps {
  onClose: () => void;
  onSubmit: (file: File) => Promise<void>;
  uploadProgress: number;
}

export default function ProofModal({
  onClose,
  onSubmit,
  uploadProgress,
}: ProofModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    
    if (!e.target.files || e.target.files.length === 0) {
      setFile(null);
      setPreview(null);
      return;
    }
    
    const selectedFile = e.target.files[0];
    
    // Check file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }
    
    // Validate file type
    const fileType = selectedFile.type;
    const isImage = fileType.startsWith('image/');
    const isVideo = fileType.startsWith('video/');
    
    if (!isImage && !isVideo) {
      setError('Please upload an image or video file');
      return;
    }
    
    setFile(selectedFile);
    
    // Create preview
    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      // For video, we'll use a placeholder
      setPreview('video');
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    setUploading(true);
    
    try {
      await onSubmit(file);
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      if (fileInputRef.current) {
        // Create a new FileList-like object
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        
        // Update the file input value
        fileInputRef.current.files = dataTransfer.files;
        
        // Trigger the onChange event manually
        const event = new Event('change', { bubbles: true });
        fileInputRef.current.dispatchEvent(event);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6 relative animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          disabled={uploading}
        >
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-semibold mb-5 gradient-text">Upload Proof of Completion</h2>
        
        {/* File Upload Area */}
        {!preview ? (
          <div
            className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center cursor-pointer hover:border-teal-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto mb-4 text-teal-400" size={40} />
            <p className="mb-2 font-medium">Drag and drop or click to upload</p>
            <p className="text-sm text-white/70 mb-3">
              Images or videos up to 10MB
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,video/*"
              disabled={uploading}
            />
            <button className="btn-secondary text-sm py-1 px-3">
              Browse Files
            </button>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden bg-black/20 mb-4 relative">
            {/* Preview */}
            <div className="h-64 flex items-center justify-center">
              {preview === 'video' ? (
                <div className="flex flex-col items-center">
                  <FileVideo size={48} className="text-teal-400 mb-2" />
                  <p className="text-sm">{file?.name}</p>
                </div>
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>
            
            {/* Replace button */}
            {!uploading && (
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="mt-3 text-red-400 text-sm flex items-center">
            <AlertCircle size={16} className="mr-1" />
            {error}
          </div>
        )}
        
        {/* Upload Progress */}
        {uploading && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Submit button */}
        <div className="mt-4">
          <button
            onClick={handleSubmit}
            className="btn-primary w-full"
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading...' : 'Submit Proof'}
          </button>
        </div>
      </div>
    </div>
  );
}