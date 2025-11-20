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
 * Allowed file types for proof uploads
 */
export const PROOF_ALLOWED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
} as const;

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

