# Backlog: Image Upload Feature for Bounties and Rewards

**Created**: 2025-10-27
**Priority**: P2 (Medium)
**Status**: Not Started
**Estimated Effort**: 2-3 days

---

## Problem

Currently, users can only specify emojis or external image URLs when creating bounties/rewards. This has limitations:
- External URLs can break if the source is removed
- No control over image content or quality
- No way to upload custom images from user's device
- Security risk: users could link to inappropriate content

---

## Proposed Solution

Implement image upload functionality using Supabase Storage with proper RLS policies.

### Features

1. **File Upload Component**
   - Allow users to upload images from their device
   - Support formats: JPG, PNG, GIF, WEBP
   - Client-side validation (max 2MB, aspect ratio guidance)
   - Image preview before upload

2. **Supabase Storage Bucket**
   - Create bucket: `bounty-images`
   - Public access for viewing
   - Authenticated upload only
   - File size limit: 2MB
   - Auto-generate unique filenames (UUID-based)

3. **Row-Level Security Policies**
   - **Upload**: Authenticated users can upload to their own user folder
   - **Read**: Public read access (for displaying images)
   - **Delete**: Only file owner or admin can delete
   - **Update**: Prevent updates (images are immutable)

4. **Database Schema Changes**
   - No changes needed to existing tables
   - `image_url` column already accepts strings (will store Storage URLs)

5. **UI Updates**
   - **CreateBountyModal**: Add third option "Upload Image" alongside Emoji and URL
   - **Image Picker**: Drag-and-drop or click to browse
   - **Progress Indicator**: Show upload progress
   - **Error Handling**: Clear messages for size/format violations

---

## Technical Implementation

### 1. Storage Bucket Setup

```sql
-- Create bucket (via Supabase Dashboard or SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bounty-images', 'bounty-images', true);

-- RLS Policy: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bounty-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS Policy: Public read access
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bounty-images');

-- RLS Policy: Users can delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bounty-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 2. Client Upload Logic

```typescript
// src/hooks/useImageUpload.ts
export const useImageUpload = () => {
  const supabase = useSupabaseClient();
  const { user } = useAuth();

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    // Validate file
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('File size must be less than 2MB');
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Use JPG, PNG, GIF, or WEBP');
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${uuidv4()}.${fileExt}`;

    // Upload to Storage
    const { data, error } = await supabase.storage
      .from('bounty-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('bounty-images')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  return { uploadImage };
};
```

### 3. UI Component

```tsx
// src/components/ImageUploader.tsx
interface ImageUploaderProps {
  onImageUploaded: (url: string) => void;
  onError: (error: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUploaded, onError }) => {
  const { uploadImage } = useImageUpload();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const url = await uploadImage(file);
      if (url) onImageUploaded(url);
    } catch (err) {
      onError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4">
      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
        id="image-upload"
      />
      <label htmlFor="image-upload" className="cursor-pointer">
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-40 object-cover rounded" />
        ) : (
          <div className="text-center">
            <p className="text-gray-400">Click to upload or drag and drop</p>
            <p className="text-sm text-gray-500">JPG, PNG, GIF, WEBP (max 2MB)</p>
          </div>
        )}
      </label>
      {uploading && <p className="text-teal-400 mt-2">Uploading...</p>}
    </div>
  );
};
```

---

## Acceptance Criteria

### Storage
- [ ] `bounty-images` bucket created in Supabase Storage
- [ ] Public read access enabled
- [ ] RLS policies applied (upload, read, delete)
- [ ] File size limit enforced (2MB)
- [ ] Unique filenames generated (UUID-based)

### UI
- [ ] Upload option added to CreateBountyModal
- [ ] File picker supports drag-and-drop
- [ ] Image preview shown before upload
- [ ] Progress indicator during upload
- [ ] Clear error messages for validation failures
- [ ] Works on mobile devices (touch-friendly)

### Functionality
- [ ] Uploaded images stored in user's folder (`user_id/filename.ext`)
- [ ] Public URL returned and stored in `image_url` field
- [ ] Images load correctly in RewardCard component
- [ ] Users can delete their own images (optional cleanup feature)

### Security
- [ ] Only authenticated users can upload
- [ ] Users cannot upload to other users' folders
- [ ] File type validation enforced client-side and server-side
- [ ] File size limit enforced
- [ ] No SQL injection or XSS vulnerabilities

---

## Out of Scope

- Image editing/cropping (can be added later)
- Multiple images per bounty (single image only)
- Video uploads
- CDN integration (Supabase Storage has built-in CDN)
- Image compression (users responsible for optimizing before upload)

---

## Dependencies

- Supabase Storage enabled on project
- `@supabase/storage-js` client library (already included in `@supabase/supabase-js`)
- UUID library for filename generation

---

## Rollout Plan

### Phase 1: Backend Setup
1. Create `bounty-images` bucket via Supabase Dashboard
2. Apply RLS policies
3. Test upload/read/delete via SQL client

### Phase 2: Client Implementation
1. Create `useImageUpload` hook
2. Create `ImageUploader` component
3. Integrate into CreateBountyModal
4. Add to EditRewardModal (if exists)

### Phase 3: Testing
1. Test upload flow (happy path)
2. Test validation errors (file size, type)
3. Test on mobile devices
4. Test RLS policies (prevent unauthorized access)
5. Load testing (concurrent uploads)

### Phase 4: Documentation
1. Update user guide with image upload instructions
2. Document Storage bucket setup for deployments
3. Add troubleshooting section

---

## Estimated Timeline

- **Backend Setup**: 2 hours
- **Client Implementation**: 1 day
- **Testing**: 4 hours
- **Documentation**: 2 hours

**Total**: ~2 days

---

## Notes

- Consider adding image moderation in the future (AI-based content filtering)
- May want to add image optimization (auto-resize to standard dimensions)
- Could integrate with external image hosting (Imgur, Cloudinary) as alternative

---

**END OF BACKLOG ITEM**
