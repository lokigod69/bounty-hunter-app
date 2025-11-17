// src/pages/ProfileEdit.tsx
// Page for users to edit their profile (display name and avatar)
// Refactored to use FileUpload component for Android compatibility and improved upload state management.

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { UserCircle, Edit3, UploadCloud, AlertCircle } from 'lucide-react';
import { FileUpload } from '../components/FileUpload';
import toast from 'react-hot-toast';
import { PageContainer, PageHeader, PageBody } from '../components/layout';
import { BaseCard } from '../components/ui/BaseCard';

export default function ProfileEdit() {
  const { user, profile, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  const handleFileSelect = (file: File) => {
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      let avatarUrl = profile?.avatar_url;

      if (avatarFile) {
        const filePath = `${user.id}/avatar-${Date.now()}.${avatarFile.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(uploadData.path);
        avatarUrl = publicUrlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: displayName, avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSuccess('Profile updated successfully!');
      toast.success('Profile updated!');
      setAvatarFile(null);
    } catch (err) {
      console.error('Upload failed:', err);
      const errorMessage = (err as Error).message || 'An unknown error occurred.';
      setError(errorMessage);
      toast.error(`Failed to upload image. Please try again.`);
    } finally {
      setIsUploading(false);
    }
  };

  if (authLoading) {
    return (
      <PageContainer>
        <BaseCard>
          <div className="text-center">Loading profile...</div>
        </BaseCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader 
        title={
          <span className="flex items-center justify-center">
            <Edit3 size={24} className="mr-2" /> Edit Profile
          </span>
        }
      />

      <PageBody>
        <BaseCard>
          <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center space-y-3">
          {avatarPreview ? (
            <img 
              src={avatarPreview} 
              alt="Avatar preview" 
              className="w-32 h-32 rounded-full object-cover border-2 border-teal-400/50"
            />
          ) : (
            <UserCircle size={128} className="text-white/30" />
          )}
          <FileUpload onFileSelect={handleFileSelect} accept="image/png, image/jpeg, image/gif">
            <div className="btn-secondary cursor-pointer text-sm">
              <UploadCloud size={16} className="inline mr-1" /> Change Avatar
            </div>
          </FileUpload>
        </div>

        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-white/70 mb-1">
            Display Name
          </label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input-field w-full text-white"
            placeholder="Your public display name"
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isUploading || authLoading}>
          {isUploading ? 'Saving...' : 'Save Changes'}
        </button>

        {error && (
          <div className="text-red-400 text-sm flex items-center">
            <AlertCircle size={16} className="mr-1" /> {error}
          </div>
        )}
        {success && (
          <div className="text-green-400 text-sm flex items-center">
            <UserCircle size={16} className="mr-1" /> {success}
          </div>
        )}
          </form>
        </BaseCard>
      </PageBody>
    </PageContainer>
  );
}
