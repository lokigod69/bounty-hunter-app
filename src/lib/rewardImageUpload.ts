// src/lib/rewardImageUpload.ts
// R22: Helper for uploading reward images to Supabase Storage
// Mirrors the avatar upload pattern from ProfileEditModal

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Maximum file size for reward images (5MB)
 */
export const REWARD_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
export const REWARD_IMAGE_MAX_SIZE_MB = 5;

/**
 * Allowed MIME types for reward images
 */
export const REWARD_IMAGE_ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Allowed file extensions (for display purposes)
 */
export const REWARD_IMAGE_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

/**
 * Storage bucket name for reward images
 * Note: This bucket must be created in Supabase with:
 * - Public read access
 * - Authenticated write access with appropriate RLS policies
 */
export const REWARD_IMAGES_BUCKET = 'reward-images';

/**
 * What went wrong, as a machine-readable fact rather than a sentence.
 *
 * Same code-not-copy rule the task lifecycle follows (src/domain/missions.ts):
 * this is a `lib` module, it must stay free of i18next, and a hard-coded English
 * string returned from here can never be translated by the caller — the caller
 * would have to show it verbatim. src/i18n/rewardImageErrors.ts owns the copy.
 */
export type RewardImageErrorCode =
  /** MIME type is not in REWARD_IMAGE_ALLOWED_TYPES. */
  | 'invalid_type'
  /** Bigger than REWARD_IMAGE_MAX_SIZE. */
  | 'file_too_large'
  /** Storage rejected the upload, or it threw. */
  | 'upload_failed';

export interface UploadRewardImageResult {
  success: boolean;
  publicUrl?: string;
  errorCode?: RewardImageErrorCode;
}

export interface ValidateRewardImageResult {
  valid: boolean;
  errorCode?: RewardImageErrorCode;
}

/**
 * Validates a file before upload
 * @param file - The file to validate
 * @returns Validation result with an error code if invalid
 */
export function validateRewardImage(file: File): ValidateRewardImageResult {
  // Check file type
  if (!REWARD_IMAGE_ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, errorCode: 'invalid_type' };
  }

  // Check file size
  if (file.size > REWARD_IMAGE_MAX_SIZE) {
    return { valid: false, errorCode: 'file_too_large' };
  }

  return { valid: true };
}

/**
 * Uploads a reward image to Supabase Storage
 *
 * @param supabase - Supabase client instance
 * @param file - The image file to upload
 * @param creatorId - The user ID of the reward creator
 * @param bountyId - The bounty/reward ID (can be 'new' for new bounties)
 * @returns Upload result with public URL on success
 */
export async function uploadRewardImage(
  supabase: SupabaseClient,
  file: File,
  creatorId: string,
  bountyId: string = 'new'
): Promise<UploadRewardImageResult> {
  // Validate file first
  const validation = validateRewardImage(file);
  if (!validation.valid) {
    return { success: false, errorCode: validation.errorCode };
  }

  try {
    // Generate file path: rewards/{creator_id}/{bounty_id}-{timestamp}.{ext}
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const filePath = `rewards/${creatorId}/${bountyId}-${timestamp}.${ext}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(REWARD_IMAGES_BUCKET)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      return { success: false, errorCode: 'upload_failed' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(REWARD_IMAGES_BUCKET)
      .getPublicUrl(uploadData.path);

    return {
      success: true,
      publicUrl: urlData.publicUrl,
    };
  } catch {
    return { success: false, errorCode: 'upload_failed' };
  }
}

/**
 * Checks if a URL is a reward image storage URL
 * Useful for determining if we should show a delete/replace option
 */
export function isRewardImageStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes(REWARD_IMAGES_BUCKET) || url.includes('supabase');
}
