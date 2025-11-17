// src/core/proofs/proofs.domain.ts
// Phase 3: Pure domain functions for proof validation and requirements.
// No React, no Supabase - just business logic.

/**
 * Type of proof submission.
 */
export type ProofType = 'text' | 'url' | 'image';

/**
 * Payload for proof submission.
 */
export interface ProofPayload {
  type: ProofType;
  content?: string; // For text proofs
  url?: string; // For URL proofs
  file?: File; // For file/image proofs
}

/**
 * Validation result for proof payload.
 */
export interface ProofValidationResult {
  /** Whether the proof is valid */
  valid: boolean;
  /** Error messages if invalid */
  errors?: string[];
}

/**
 * Validates a proof payload based on its type.
 * 
 * Rules:
 * - Text proofs must have non-empty content
 * - URL proofs must have a valid URL
 * - File proofs must have a file (file validation happens at upload layer)
 */
export function validateProofPayload(payload: ProofPayload): ProofValidationResult {
  const { type, content, url, file } = payload;
  const errors: string[] = [];

  switch (type) {
    case 'text':
      if (!content || content.trim().length === 0) {
        errors.push('Text proof must have content.');
      }
      break;

    case 'url':
      if (!url || url.trim().length === 0) {
        errors.push('URL proof must have a URL.');
      } else {
        try {
          new URL(url);
        } catch {
          errors.push('URL proof must be a valid URL.');
        }
      }
      break;

    case 'image':
      if (!file) {
        errors.push('Image proof must have a file.');
      }
      break;

    default:
      errors.push(`Unknown proof type: ${type}`);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Checks if a contract requires proof before status can change to 'review' or 'completed'.
 */
export function requiresProofForStatusChange(contract: { proof_required: boolean }): boolean {
  return contract.proof_required === true;
}

/**
 * Determines the appropriate status after proof submission.
 * 
 * Rules:
 * - If proof is required, status becomes 'review'
 * - If proof is not required, can go directly to 'completed'
 */
export function getStatusAfterProofSubmission(proofRequired: boolean): 'review' | 'completed' {
  return proofRequired ? 'review' : 'completed';
}

