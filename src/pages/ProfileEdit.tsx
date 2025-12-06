// src/pages/ProfileEdit.tsx
// Page for users to edit their profile (display name and avatar)
// Refactored to use FileUpload component for Android compatibility and improved upload state management.
// P1: Added theme selector UI section allowing users to switch between Guild, Family, and Couple modes.
// P2: Added "Restart Onboarding" option for testing/power users.

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { UserCircle, Edit3, UploadCloud, AlertCircle, Check, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { FileUpload } from '../components/FileUpload';
import toast from 'react-hot-toast';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { PageBody } from '../components/layout/PageBody';
import { BaseCard } from '../components/ui/BaseCard';
import { useTheme } from '../context/ThemeContext';
import { themesById } from '../theme/themes';
import { ThemeId } from '../theme/theme.types';
import { useNavigate } from 'react-router-dom';
import { clearOnboardingFlag } from '../lib/ftxGate';

export default function ProfileEdit() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { themeId, setThemeId } = useTheme();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // P6: System status
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'healthy' | 'error'>('checking');
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  const handleThemeChange = (newThemeId: ThemeId) => {
    setThemeId(newThemeId);
    toast.success(`Theme changed to ${themesById[newThemeId].label}`);
  };

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  // P6: Check Supabase health
  useEffect(() => {
    const checkSupabaseHealth = async () => {
      setSupabaseStatus('checking');
      setSupabaseError(null);
      try {
        // Simple ping: try to select from a lightweight table
        const { error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        if (error) {
          setSupabaseStatus('error');
          setSupabaseError(error.message);
        } else {
          setSupabaseStatus('healthy');
        }
      } catch (err) {
        setSupabaseStatus('error');
        setSupabaseError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    if (user) {
      checkSupabaseHealth();
    }
  }, [user]);

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

    // R15: Guard against saving when profile hasn't loaded yet
    if (!profile) {
      console.warn('[ProfileEdit] Cannot save - profile not yet loaded');
      toast.error('Profile not loaded. Please wait and try again.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // R15: Start with EXISTING avatar_url from profile
      let avatarUrl = profile.avatar_url;

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

      // R15: Log what we're about to save
      console.log('[ProfileEdit] Saving profile', {
        userId: user.id.substring(0, 8),
        display_name: displayName,
        avatarUrl: avatarUrl?.substring(0, 50) || null,
        avatarChanged: !!avatarFile,
        previousAvatarUrl: profile.avatar_url?.substring(0, 50) || null,
      });

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: displayName, avatar_url: avatarUrl })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('[ProfileEdit] Update error:', updateError);
        throw updateError;
      }

      // R15: Log successful save with result
      console.log('[ProfileEdit] Profile updated successfully:', {
        id: updatedProfile?.id?.substring(0, 8),
        display_name: updatedProfile?.display_name,
        avatar_url: updatedProfile?.avatar_url?.substring(0, 50),
      });

      // Refresh profile in useAuth to update header and other components immediately
      setSuccess('Profile updated successfully!');
      toast.success('Profile updated!');
      setAvatarFile(null);
      
      // Refresh profile state so changes are visible immediately in header and other components
      if (refreshProfile) {
        await refreshProfile();
      }
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

        {/* Theme Selector Section */}
        <BaseCard>
          <h2 className="text-title text-white mb-4">Theme / Mode</h2>
          <p className="text-meta text-white/60 mb-6">
            Choose how the app looks and feels. This changes labels and terminology throughout the app.
          </p>
          <div className="space-y-3">
            {Object.values(themesById).map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  themeId === theme.id
                    ? 'border-teal-400 bg-teal-400/10'
                    : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-subtitle text-white font-semibold">{theme.label}</h3>
                      {themeId === theme.id && (
                        <Check size={20} className="text-teal-400" />
                      )}
                    </div>
                    <p className="text-body text-white/70 text-sm">{theme.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </BaseCard>

        {/* Restart Onboarding Option */}
        <BaseCard>
          <h2 className="text-title text-white mb-4">Onboarding</h2>
          <p className="text-meta text-white/60 mb-4">
            Restart the first-time experience to see the setup flow again.
          </p>
          <button
            onClick={() => {
              clearOnboardingFlag();
              navigate('/onboarding');
            }}
            className="btn-secondary w-full"
          >
            Restart Onboarding
          </button>
        </BaseCard>

        {/* P6: System Status / Debug */}
        <BaseCard>
          <h2 className="text-title text-white mb-4 flex items-center gap-2">
            <Activity size={24} />
            System Status
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-meta text-white/60 mb-1">User ID</p>
              <p className="text-body text-white/90 font-mono text-sm break-all">{user?.id || 'Not logged in'}</p>
            </div>
            <div>
              <p className="text-meta text-white/60 mb-1">Email</p>
              <p className="text-body text-white/90">{user?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-meta text-white/60 mb-1">Theme Mode</p>
              <p className="text-body text-white/90">{themesById[themeId].label}</p>
            </div>
            <div>
              <p className="text-meta text-white/60 mb-2">Backend Connection</p>
              <div className="flex items-center gap-2">
                {supabaseStatus === 'checking' && (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-400"></div>
                    <span className="text-body text-white/70">Checking...</span>
                  </>
                )}
                {supabaseStatus === 'healthy' && (
                  <>
                    <CheckCircle2 size={20} className="text-green-400" />
                    <span className="text-body text-white/90">Connected</span>
                  </>
                )}
                {supabaseStatus === 'error' && (
                  <>
                    <XCircle size={20} className="text-red-400" />
                    <div className="flex-1">
                      <span className="text-body text-red-400">Connection Error</span>
                      {supabaseError && (
                        <p className="text-meta text-red-400/70 mt-1">{supabaseError}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </BaseCard>
      </PageBody>
    </PageContainer>
  );
}
