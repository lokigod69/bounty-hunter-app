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

export interface UploadRewardImageResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

export interface ValidateRewardImageResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file before upload
 * @param file - The file to validate
 * @returns Validation result with error message if invalid
 */
export function validateRewardImage(file: File): ValidateRewardImageResult {
  // Check file type
  if (!REWARD_IMAGE_ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${REWARD_IMAGE_ALLOWED_EXTENSIONS.join(', ').toUpperCase()}`,
    };
  }

  // Check file size
  if (file.size > REWARD_IMAGE_MAX_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${REWARD_IMAGE_MAX_SIZE_MB}MB.`,
    };
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
    return { success: false, error: validation.error };
  }

  try {
    // Generate file path: rewards/{creator_id}/{bounty_id}-{timestamp}.{ext}
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const filePath = `rewards/${creatorId}/${bountyId}-${timestamp}.${ext}`;

    console.log('[rewardImageUpload] Uploading to:', filePath);

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(REWARD_IMAGES_BUCKET)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('[rewardImageUpload] Upload error:', uploadError);
      return {
        success: false,
        error: uploadError.message || 'Failed to upload image. Please try again.',
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(REWARD_IMAGES_BUCKET)
      .getPublicUrl(uploadData.path);

    console.log('[rewardImageUpload] Upload successful:', urlData.publicUrl);

    return {
      success: true,
      publicUrl: urlData.publicUrl,
    };
  } catch (err) {
    console.error('[rewardImageUpload] Unexpected error:', err);
    return {
      success: false,
      error: 'Could not upload image. Please try again.',
    };
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
