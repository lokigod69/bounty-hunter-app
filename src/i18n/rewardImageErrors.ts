// src/i18n/rewardImageErrors.ts
// The UI-layer half of the reward-image upload contract, mirroring
// src/i18n/taskLifecycleErrors.ts.
//
// src/lib/rewardImageUpload.ts reports WHAT it refused as a machine-readable
// RewardImageErrorCode and stays free of i18next. This module is the only place
// that turns such a code into a sentence a person reads, so all twelve locales
// get it.
//
// Two of the three sentences need a value the module owns anyway — the allowed
// formats and the size cap. They are passed as i18next interpolation values, not
// concatenated, so each language can put the number where its grammar wants it.

import {
  REWARD_IMAGE_ALLOWED_EXTENSIONS,
  REWARD_IMAGE_MAX_SIZE_MB,
  type RewardImageErrorCode,
} from '../lib/rewardImageUpload';
import type { Translator } from './taskLifecycleErrors';

/** "JPG, JPEG, PNG, GIF, WEBP" — the same list the file hint shows. */
export function rewardImageAllowedFormats(): string {
  return REWARD_IMAGE_ALLOWED_EXTENSIONS.join(', ').toUpperCase();
}

/**
 * Localized sentence for a reward-image failure. An absent or unrecognised code
 * falls back to the generic upload failure rather than showing nothing.
 */
export function translateRewardImageError(
  code: RewardImageErrorCode | undefined,
  t: Translator,
): string {
  switch (code) {
    case 'invalid_type':
      return t('rewards.imageField.invalidFile', { formats: rewardImageAllowedFormats() });
    case 'file_too_large':
      return t('rewards.imageField.fileTooLarge', { size: REWARD_IMAGE_MAX_SIZE_MB });
    default:
      return t('rewards.imageField.uploadFailed');
  }
}
