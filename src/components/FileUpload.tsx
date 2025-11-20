// src/components/FileUpload.tsx
// This is a new universal file input component designed to address file upload issues on Android devices.
// It includes workarounds like a click delay, file size validation, and specific attributes for camera access.

import React, { useRef } from 'react';
import { PROOF_MAX_FILE_SIZE, PROOF_MAX_FILE_SIZE_MB } from '../lib/proofConfig';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  className?: string;
  children: React.ReactNode;
}

export function FileUpload({ onFileSelect, accept = "image/*", className, children }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Small delay helps Android
    setTimeout(() => {
      inputRef.current?.click();
    }, 100);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size for Android
      if (file.size > PROOF_MAX_FILE_SIZE) {
        alert(`File too large. Maximum size is ${PROOF_MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      onFileSelect(file);
    }
    // Reset input to allow same file selection
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        aria-label="File upload"
        // `multiple={false}` is important for consistency
        multiple={false}
      />
      <div onClick={handleClick} className={className}>
        {children}
      </div>
    </>
  );
}
