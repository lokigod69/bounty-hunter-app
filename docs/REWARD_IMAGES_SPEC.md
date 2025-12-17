# Reward Images Upload Specification

**Date**: 2025-12-17
**Round**: R22
**Status**: ✅ Complete

---

## Overview

Add manual reward image upload for bounty/gift type items in the Rewards Store, using Supabase Storage. This enables creators to upload custom images when creating or editing bounties, with the images displayed in both the store cards and mission reward panels.

---

## Phase 0: Investigation Summary

### Database Schema

**Table: `rewards_store`** (already has `image_url` field)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| name | string | Required |
| description | string | Optional |
| **image_url** | string | **Already exists, nullable** |
| credit_cost | number | Required |
| assigned_to | uuid | FK to profiles |
| creator_id | uuid | FK to profiles |
| is_active | boolean | Default true |
| created_at | timestamp | |
| updated_at | timestamp | |

**RPC Functions** (already accept `p_image_url`):
- `create_reward_store_item(p_name, p_description, p_image_url, p_credit_cost, p_assigned_to)`
- `update_reward_store_item(p_bounty_id, p_name, p_description, p_image_url, p_credit_cost)`

### Existing Patterns

**Avatar Upload Pattern** (from `ProfileEditModal.tsx`):
```typescript
// Path convention
const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

// Upload
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(filePath, file, { upsert: true });

// Get public URL
const { data: urlData } = supabase.storage
  .from('avatars')
  .getPublicUrl(data.path);
```

**FileUpload Component** (`src/components/FileUpload.tsx`):
- Already handles file selection, validation, Android compatibility
- Uses `PROOF_MAX_FILE_SIZE` from `src/lib/proofConfig.ts`

### Components to Modify

| Component | Location | Changes |
|-----------|----------|---------|
| CreateBountyModal | `src/components/CreateBountyModal.tsx` | Add file upload UI, handle upload |
| EditBountyModal | `src/components/EditBountyModal.tsx` | Show existing image, allow replace/remove |
| RewardCard | `src/components/RewardCard.tsx` | Already handles URL display |
| MissionModalShell | `src/components/modals/MissionModalShell.tsx` | Already has image display logic |

---

## Phase 1: Storage Design

### Supabase Bucket

**Bucket Name**: `reward-images`

**Configuration** (must be set up in Supabase dashboard):
- Public read access
- Authenticated write access
- RLS policy: User can upload to paths starting with `rewards/{their_user_id}/`

**Note**: Mirror the RLS pattern used by the `avatars` bucket:
```sql
-- Example policy (user must configure in Supabase):
-- INSERT: auth.uid() = (storage.foldername(name))[1]::uuid
-- SELECT: true (public read)
```

### File Path Convention

```
reward-images/rewards/{creator_id}/{bounty_id}-{timestamp}.{ext}
```

Example: `reward-images/rewards/abc123/bounty-def456-1702745600000.jpg`

### Supported Formats

- PNG, JPG, JPEG, GIF, WebP
- Max file size: 5MB (client-side validation)

---

## Phase 2: Upload Helper

Create a reusable upload helper to avoid code duplication:

**File**: `src/lib/rewardImageUpload.ts`

```typescript
interface UploadRewardImageResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

export async function uploadRewardImage(
  supabase: SupabaseClient,
  file: File,
  creatorId: string,
  bountyId: string
): Promise<UploadRewardImageResult>;
```

---

## Phase 3: UI Changes

### CreateBountyModal

Add third option to image type selector:
- Emoji (existing)
- Image URL (existing)
- **Upload Image** (new)

When "Upload Image" selected:
- Show file picker button
- Show thumbnail preview when file selected
- Show "Remove" link to clear selection

### EditBountyModal

- If existing `image_url` is a storage URL, show thumbnail preview
- Allow replacing with new upload
- Allow removing (clears URL)

### Validation

Client-side:
- File type: PNG, JPG, JPEG, GIF, WebP only
- File size: Max 5MB
- Show inline error messages

---

## Phase 4: Display Changes

### RewardCard (already works)

The existing `isUrl()` check in `RewardCard.tsx` already handles URL vs emoji:
```typescript
const isUrl = (str: string | null | undefined): boolean => {
  if (!str) return false;
  return str.startsWith('http') || str.includes('/') || str.includes('.');
};
```

No changes needed - uploaded images will display automatically.

### MissionModalShell (already works)

Already has `reward.imageUrl` handling:
```typescript
{reward.imageUrl ? (
  <div className="relative w-24 h-24 mx-auto rounded-lg overflow-hidden">
    <img src={reward.imageUrl} alt={...} className="w-full h-full object-cover" />
  </div>
) : (
  // Emoji fallback
)}
```

---

## Implementation Order

1. Create `src/lib/rewardImageUpload.ts` helper
2. Update `CreateBountyModal.tsx` with upload option
3. Update `EditBountyModal.tsx` with preview/replace/remove
4. Test all flows
5. Document in status file

---

## Future Considerations

- **AI-generated images**: This infrastructure supports future Runware integration
- **Image deletion**: Currently orphans old images; could add cleanup later
- **Image optimization**: Could add client-side compression before upload

---

## Supabase Setup Required

The user must create the `reward-images` bucket in Supabase with:
1. Public access enabled
2. Appropriate RLS policies for authenticated uploads

This is intentionally not automated to maintain user control over storage policies.

---

## Implementation Summary

### Files Created
- `src/lib/rewardImageUpload.ts` - Upload helper with validation and storage functions

### Files Modified
- `src/components/CreateBountyModal.tsx` - Added "Upload" tab with file picker, preview, and upload handling
- `src/components/EditBountyModal.tsx` - Added "Upload" tab, preserves existing images, allows replace/remove

### No Changes Needed
- `src/components/RewardCard.tsx` - Already handles URLs correctly
- `src/components/modals/MissionModalShell.tsx` - Already displays image URLs
- Database schema - `image_url` field already exists in `rewards_store`
- RPC functions - Already accept `p_image_url` parameter

### TypeScript Check
✅ All types pass without errors
