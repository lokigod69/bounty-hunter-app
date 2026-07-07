// src/components/ProfileEditModal.tsx
// This new component houses the profile editing form within a modal, 
// allowing it to be opened from the main layout header.

// src/components/ProfileEditModal.tsx
// This new component houses the profile editing form within a modal, 
// allowing it to be opened from the main layout header.
// Added a sound effects toggle switch.
// PHASE 1 FIX: Added mobile menu coordination for consistency and to prevent UI conflicts.
// PHASE 3 FIX: Enhanced responsive positioning with improved mobile layouts, better touch targets, and optimized modal behavior.

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { UserCircle, UploadCloud, Volume2, VolumeX, Shield, Home, Heart } from 'lucide-react';
import { FileUpload } from './FileUpload';
import toast from 'react-hot-toast';
import { soundManager } from '../utils/soundManager';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTheme } from '../context/ThemeContext';
import { AppButton } from './ui/AppButton';
import { ModalShell } from './ui/ModalShell';
import { themesById } from '../theme/themes';
import type { ThemeId } from '../theme/theme.types';
import { MODE_ACCENT_HEX } from '../theme/modeAccents';


interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Icons per mode; labels/descriptions are sourced from theme definitions below.
const MODE_ICON: Record<ThemeId, typeof Shield> = {
  guild: Shield,
  family: Home,
  couple: Heart,
};

// R10/R20: Mode switcher configuration, with label/hint sourced from theme definitions.
const modeOptions: { id: ThemeId; label: string; icon: typeof Shield; hint: string }[] =
  Object.values(themesById).map((theme) => ({
    id: theme.id,
    label: theme.label,
    icon: MODE_ICON[theme.id],
    hint: theme.description,
  }));

// Temporary V1 public gating: Family/Couple remain available in dev for internal testing.
const VISIBLE_PROFILE_MODE_OPTIONS = import.meta.env.DEV
  ? modeOptions
  : modeOptions.filter((option) => option.id === 'guild');

// R16: Helper to derive display name from email
function deriveDisplayNameFromEmail(email: string | undefined): string {
  if (!email) return 'New User';
  return email.split('@')[0] || 'New User';
}

export default function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { t } = useTranslation();
  // R16: Also pull profileLoading to handle first-time profile scenario
  const { user, profile, profileLoading, refreshProfile } = useAuth();
  const { themeId, setThemeId } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localSoundEnabled, setLocalSoundEnabled] = useState(soundManager.isEnabled());

  // R16: Hydrate form state when modal opens - handles both existing profile and first-time scenarios
  useEffect(() => {
    if (!isOpen) return; // Only hydrate when modal is open

    if (profile) {
      // Existing user with profile - use profile values
      setDisplayName(profile.display_name ?? '');
      setAvatarPreview(profile.avatar_url ?? null);
    } else if (!profileLoading && user) {
      // R16: First-time profile scenario - derive defaults from user
      const baseName = deriveDisplayNameFromEmail(user.email);
      setDisplayName(baseName);
      setAvatarPreview(null);
    }
    // Always reset file selection when modal opens
    setAvatarFile(null);
  }, [isOpen, profile, profileLoading, user]);

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

    // R16: Only block if profile is still actively loading
    // If profile is null but not loading, this is first-time creation - allow it
    if (!profile && profileLoading) {
      toast.error('Profile is still loading. Please wait a moment and try again.');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(t('profile.saving'));

    try {
      // R16: Build display name with fallbacks for first-time profile
      const baseDisplayName =
        displayName?.trim() ||
        profile?.display_name ||
        deriveDisplayNameFromEmail(user.email);

      // R16: Start with existing avatar if profile exists, otherwise null
      let avatarUrl = profile?.avatar_url ?? null;

      if (avatarFile) {
        const filePath = `${user.id}/avatar-${Date.now()}.${avatarFile.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        soundManager.play('upload');

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
        avatarUrl = publicUrlData.publicUrl;
      }

      // R12: Upsert must include `email` since it's required for INSERT
      // If profile doesn't exist, upsert will INSERT which requires email
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email || '',  // Required for INSERT
            display_name: baseDisplayName || null,
            avatar_url: avatarUrl || null,
          },
          { onConflict: 'id' }
        )
        .select('*')
        .single();

      if (updateError) {
        // R11: Show specific error messages for known error codes
        let errorMessage = t('profile.saveError');

        if (updateError.code === '42501') {
          // RLS policy violation
          errorMessage = 'Profile update blocked by database security rules. Please contact support.';
        } else if (updateError.code === '23502') {
          // NOT NULL violation - likely missing required field
          errorMessage = 'Missing required profile data. Please try again.';
        } else if (updateError.code === '23505') {
          // Unique constraint violation
          errorMessage = 'This profile already exists. Please try again.';
        } else if (updateError.code?.startsWith('4') || updateError.code?.startsWith('5')) {
          // Other 4xx/5xx database errors
          errorMessage = `Database error: ${updateError.message || 'Unknown error'}`;
        }

        toast.error(errorMessage, { id: toastId, duration: 6000 });
        return; // Don't proceed on error - don't pretend save succeeded
      }

      soundManager.play('saveProfile');

      toast.success(t('profile.saveSuccess'), { id: toastId });

      if (refreshProfile) {
        await refreshProfile();
      }

      // Close modal after successful save
      onClose();
    } catch (err: unknown) {
      // R11: Better error messages for caught exceptions
      let errorMessage = t('profile.saveError');

      if (err && typeof err === 'object') {
        const error = err as { code?: string; message?: string };
        if (error.code === '42501') {
          errorMessage = 'Profile update blocked by database security rules. Please contact support.';
        } else if (error.message) {
          errorMessage = `Error: ${error.message}`;
        }
      }

      toast.error(errorMessage, { id: toastId, duration: 6000 });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} name="ProfileEditModal" labelledBy="profileedit-title">
      {/* Modal Header with enhanced mobile touch targets */}
      <div className="flex items-center justify-center p-3 sm:p-4 border-b border-gray-700/50 flex-shrink-0">
        <h2 id="profileedit-title" className="text-lg sm:text-xl font-bold text-center">{t('profile.edit')}</h2>
      </div>

      {/* Modal Body (Scrollable) with enhanced mobile spacing */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center space-y-3">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Avatar preview" 
                  className="w-28 h-28 rounded-full object-cover border-2 border-cyan-400/50"
                />
              ) : (
                <UserCircle size={112} className="text-white/30" />
              )}
              <FileUpload onFileSelect={handleFileSelect} accept="image/png, image/jpeg, image/gif">
                <div className="btn-secondary cursor-pointer text-sm">
                  <UploadCloud size={16} className="inline mr-1" /> {t('profile.changeAvatar')}
                </div>
              </FileUpload>
            </div>
            <div>
              <label htmlFor="displayNameModal" className="block text-sm font-medium text-white/70 mb-1">
                {t('profile.username')}
              </label>
              <input
                type="text"
                id="displayNameModal"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field w-full text-white text-base"
                placeholder={t('profile.usernamePlaceholder')}
                disabled={isUploading}
                autoComplete="off"
              />
            </div>

            {/* Settings Section */}
            <div className="space-y-4 pt-4 border-t border-gray-700/50">
              {/* Sound Effects Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <label className="text-sm font-medium flex items-center">
                  {localSoundEnabled ? <Volume2 size={18} className="mr-2 text-cyan-400" /> : <VolumeX size={18} className="mr-2 text-gray-500"/>}
                  {t('profile.soundEffects')}
                </label>
                <button
                  type="button"
                  aria-label={localSoundEnabled ? t('profile.disableSound') : t('profile.enableSound')}
                  onClick={() => {
                    const newState = soundManager.toggle();
                    setLocalSoundEnabled(newState);
                    if (newState) soundManager.play('toggleOn');
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 ${
                    localSoundEnabled ? 'bg-emerald-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      localSoundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <label className="text-sm font-medium">{t('profile.language')}</label>
                <LanguageSwitcher />
              </div>

              {/* R10/R20/R21: Mode Switcher with helper text */}
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <label className="text-sm font-medium block mb-3">Mode</label>
                <div className="flex bg-gray-900/60 rounded-lg p-1 gap-1">
                  {VISIBLE_PROFILE_MODE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isActive = themeId === option.id;
                    const accent = MODE_ACCENT_HEX[option.id];
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setThemeId(option.id);
                          soundManager.play('toggleOn');
                        }}
                        style={
                          isActive
                            ? {
                                borderColor: accent,
                                color: accent,
                                boxShadow: `0 0 16px ${accent}40`,
                                backgroundColor: `${accent}14`,
                              }
                            : undefined
                        }
                        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] py-2 px-3 rounded-lg border-2 text-xs font-semibold transition-all ${
                          isActive
                            ? ''
                            : 'border-transparent text-white/60 hover:text-white/80 hover:bg-white/5'
                        }`}
                      >
                        <Icon size={16} style={isActive ? { color: accent } : undefined} />
                        <span className="hidden sm:inline">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                {/* R20: Show hint for currently selected mode */}
                <p className="text-xs text-white/50 mt-2 text-center">
                  {modeOptions.find(o => o.id === themeId)?.hint || 'Guild Mode is the public V1 launch mode.'}
                </p>
              </div>
            </div>

            <AppButton type="submit" variant="cta" fullWidth loading={isUploading} className="mt-6">
              {isUploading ? t('profile.saving') : t('profile.save')}
            </AppButton>
          </form>
      </div>
    </ModalShell>
  );
}
