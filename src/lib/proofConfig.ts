// src/lib/proofConfig.ts
// Centralized configuration for proof submission

/**
 * Maximum file size for proof uploads (in bytes)
 * Default: 10MB
 */
export const PROOF_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Maximum file size in human-readable format
 */
export const PROOF_MAX_FILE_SIZE_MB = 10;

/**
 * Allowed file types for proof uploads.
 * Kept in sync with the 'bounty-proofs' storage bucket's allowed_mime_types
 * (see supabase/migrations/20260611120000_storage_buckets_and_policies.sql
 * and 20260707221000_allow_pdf_proofs.sql) and with the server-side check in
 * src/domain/missions.ts uploadProof().
 */
export const PROOF_ALLOWED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
} as const;

/**
 * Human-readable label for the accepted proof file types, used in the
 * ProofModal dropzone helper text and error messages.
 */
export const PROOF_ACCEPTED_TYPES_LABEL = 'PNG, JPG, PDF, or video (MP4, MOV, WebM)';

/**
 * Validates if a URL string is valid and safe to use
 * @param urlString - The URL string to validate
 * @returns true if valid, false otherwise
 */
export function isValidUrl(urlString: string | null | undefined): boolean {
  if (!urlString || typeof urlString !== 'string') {
    return false;
  }

  try {
    const url = new URL(urlString);
    // Only allow http/https protocols
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Safely renders a URL as a clickable link or plain text
 * @param urlString - The URL string to render
 * @param fallbackText - Text to show if URL is invalid (defaults to URL string)
 * @returns Object with isValid flag and safe rendering info
 */
export function safeUrlRender(urlString: string | null | undefined, fallbackText?: string) {
  const isValid = isValidUrl(urlString);
  
  return {
    isValid,
    displayText: fallbackText || urlString || '',
    url: isValid ? urlString! : null,
  };
}

