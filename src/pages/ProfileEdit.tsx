// src/pages/ProfileEdit.tsx
// Page for users to edit their profile (display name and avatar)
// Removed direct fetchProfile call. Removed manual updated_at (handled by DB trigger).
// Renamed local loading state to isSubmitting to avoid conflict with authLoading.

import { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { UserCircle, Edit3, UploadCloud, AlertCircle } from 'lucide-react';

export default function ProfileEdit() {
  const { user, profile, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarFile(null);
      setAvatarPreview(profile?.avatar_url || null); // Revert to original if no file selected
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let avatarUrl = profile?.avatar_url;

      // 1. Upload new avatar if selected
      if (avatarFile) {
        const filePath = `${user.id}/avatar-${Date.now()}.${avatarFile.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars') // Ensure 'avatars' bucket exists and has correct policies
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(uploadData.path);
        avatarUrl = publicUrlData.publicUrl;
      }

      // 2. Update profile in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          avatar_url: avatarUrl,
          // updated_at is now handled by a database trigger
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 3. Profile data in useAuth hook will refresh on next full load or auth state change.
      // For immediate update, useAuth would need to expose a refresh function or allow direct state update.
      setSuccess('Profile updated successfully!');
      setAvatarFile(null); // Clear file input after successful upload

    } catch (err) {
      console.error('Error updating profile:', err);
      setError((err as Error).message || 'An unknown error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-lg mx-auto glass-card p-8 text-center">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold gradient-text flex items-center">
          <Edit3 size={24} className="mr-2" /> Edit Profile
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
        {/* Avatar Section */} 
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
          <label htmlFor="avatarUpload" className="btn-secondary cursor-pointer text-sm">
            <UploadCloud size={16} className="inline mr-1" /> Change Avatar
          </label>
          <input 
            type="file" 
            id="avatarUpload" 
            accept="image/png, image/jpeg, image/gif" 
            onChange={handleAvatarChange} 
            className="hidden" 
          />
        </div>

        {/* Display Name */} 
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

        {/* Submit Button */} 
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting || authLoading}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>

        {/* Status Messages */} 
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
    </div>
  );
}
