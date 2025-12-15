// src/components/ProfileEditModal.tsx
// This new component houses the profile editing form within a modal, 
// allowing it to be opened from the main layout header.

// src/components/ProfileEditModal.tsx
// This new component houses the profile editing form within a modal, 
// allowing it to be opened from the main layout header.
// Added a sound effects toggle switch.
// PHASE 1 FIX: Added mobile menu coordination for consistency and to prevent UI conflicts.
// PHASE 3 FIX: Enhanced responsive positioning with improved mobile layouts, better touch targets, and optimized modal behavior.

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { UserCircle, UploadCloud, X, Volume2, VolumeX, Shield, Home, Heart } from 'lucide-react';
import { FileUpload } from './FileUpload';
import toast from 'react-hot-toast';
import { soundManager } from '../utils/soundManager';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useUI } from '../context/UIContext';
import { useTheme } from '../context/ThemeContext';
import type { ThemeId } from '../theme/theme.types';


interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// R10/R20: Mode switcher configuration with descriptions
const modeOptions: { id: ThemeId; label: string; icon: typeof Shield; hint: string }[] = [
  { id: 'guild', label: 'Guild', icon: Shield, hint: 'For friends & gaming groups' },
  { id: 'family', label: 'Family', icon: Home, hint: 'For household chores' },
  { id: 'couple', label: 'Couple', icon: Heart, hint: 'For partners & loved ones' },
];

// R16: Helper to derive display name from email
function deriveDisplayNameFromEmail(email: string | undefined): string {
  if (!email) return 'New User';
  return email.split('@')[0] || 'New User';
}

export default function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { t } = useTranslation();
  // R16: Also pull profileLoading to handle first-time profile scenario
  const { user, profile, profileLoading, refreshProfile } = useAuth();
  const { openModal, clearLayer } = useUI();
  const { themeId, setThemeId } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localSoundEnabled, setLocalSoundEnabled] = useState(soundManager.isEnabled());

  // R19: Track if mousedown occurred on backdrop (not inside modal content)
  // This prevents closing the modal when user is selecting text and drags outside
  const mouseDownOnBackdropRef = useRef(false);

  // Phase 2: Use UIContext to coordinate overlay layers and scroll locking
  // R7 FIX: Only setup overlay when THIS modal is open. Don't call clearLayer in else branch
  // as it would cancel other modals (e.g., TaskCard expansion) when this component re-renders.
  useEffect(() => {
    if (!isOpen) return; // Early exit - no effect if not open
    openModal();
    return () => {
      clearLayer(); // Only cleanup when THIS modal closes
    };
  }, [isOpen, openModal, clearLayer]);

  // R16: Log when modal opens for debugging
  useEffect(() => {
    if (!isOpen) return;
    console.log('[ProfileEditModal] OPEN', {
      profileNull: !profile,
      profileLoading,
      userId: user?.id?.substring(0, 8),
    });
  }, [isOpen, profile, profileLoading, user]);

  // R16: Hydrate form state when modal opens - handles both existing profile and first-time scenarios
  useEffect(() => {
    if (!isOpen) return; // Only hydrate when modal is open

    if (profile) {
      // Existing user with profile - use profile values
      console.log('[ProfileEditModal] Hydrating from profile:', {
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url?.substring(0, 50),
      });
      setDisplayName(profile.display_name ?? '');
      setAvatarPreview(profile.avatar_url ?? null);
    } else if (!profileLoading && user) {
      // R16: First-time profile scenario - derive defaults from user
      const baseName = deriveDisplayNameFromEmail(user.email);
      console.log('[ProfileEditModal] Hydrating from user (no profile yet):', {
        baseName,
        userId: user.id.substring(0, 8),
      });
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

    // R16: Log submit attempt for debugging
    console.log('[ProfileEditModal] SUBMIT CLICK', {
      profileNull: !profile,
      profileLoading,
      displayName,
      hasAvatarFile: !!avatarFile,
    });

    // R16: Only block if profile is still actively loading
    // If profile is null but not loading, this is first-time creation - allow it
    if (!profile && profileLoading) {
      console.warn('[ProfileEditModal] Cannot save - profile still loading');
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

      // R15: Enhanced logging before save - track what's being preserved vs changed
      console.log('[ProfileEditModal] Saving profile', {
        userId: user.id.substring(0, 8),
        display_name: displayName,
        avatarUrl: avatarUrl?.substring(0, 50) || null,
        avatarChanged: !!avatarFile, // R15: Track if avatar was changed
        previousAvatarUrl: profile?.avatar_url?.substring(0, 50) || null,
      });

      // R12: Upsert must include `email` since it's required for INSERT
      // If profile doesn't exist, upsert will INSERT which requires email
      const { data: upsertData, error: updateError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email || '',  // Required for INSERT
            display_name: displayName || null,
            avatar_url: avatarUrl || null,
          },
          { onConflict: 'id' }
        )
        .select('*')
        .single();

      // R10: Log upsert result
      console.log('[ProfileEditModal] Upsert result', { data: upsertData, error: updateError });

      if (updateError) {
        console.error('[ProfileEditModal] Upsert error:', updateError);

        // R11: Show specific error messages for known error codes
        let errorMessage = t('profile.saveError');

        if (updateError.code === '42501') {
          // RLS policy violation
          errorMessage = 'Profile update blocked by database security rules. Please contact support.';
          console.error('[ProfileEditModal] RLS policy violation - INSERT/UPDATE blocked on profiles table');
        } else if (updateError.code === '23502') {
          // NOT NULL violation - likely missing required field
          errorMessage = 'Missing required profile data. Please try again.';
          console.error('[ProfileEditModal] NOT NULL violation:', updateError.message);
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

      // Refresh profile in context
      console.log('[ProfileEditModal] About to call refreshProfile');

      if (refreshProfile) {
        await refreshProfile();
        console.log('[ProfileEditModal] refreshProfile completed');
      } else {
        console.warn('[ProfileEditModal] refreshProfile is undefined!');
      }

      // Close modal after successful save
      onClose();
    } catch (err: unknown) {
      console.error('[ProfileEditModal] Operation failed:', err);

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

  if (!isOpen) return null;

  // R19: Handle backdrop click - only close if mousedown also started on backdrop
  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    // If the target is the backdrop itself (not a child), record it
    if (e.target === e.currentTarget) {
      mouseDownOnBackdropRef.current = true;
    } else {
      mouseDownOnBackdropRef.current = false;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if both mousedown AND click occurred on the backdrop
    // This prevents closing when user selects text and drags outside
    if (e.target === e.currentTarget && mouseDownOnBackdropRef.current) {
      onClose();
    }
    mouseDownOnBackdropRef.current = false;
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-modal-backdrop p-2 sm:p-4"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        className="glass-card w-full max-w-md mx-2 sm:mx-4 bg-gray-900/80 rounded-xl sm:rounded-2xl border border-gray-700 flex flex-col animate-fade-in-up max-h-[95vh] sm:max-h-[90vh] z-modal-content"
        onMouseDown={(e) => e.stopPropagation()} // Prevent mousedown inside from being tracked as backdrop
        onClick={(e) => e.stopPropagation()} // Prevent click inside from closing
      >
        {/* Modal Header with enhanced mobile touch targets */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700/50 flex-shrink-0">
          <div className="w-8"></div> {/* Spacer */}
          <h2 className="text-lg sm:text-xl font-bold text-center flex-grow">{t('profile.edit')}</h2>
          <button onClick={onClose} className="w-10 h-10 sm:w-8 sm:h-8 p-2 sm:p-1.5 bg-gray-800/60 hover:bg-gray-700/80 rounded-full transition-colors z-modal-controls flex items-center justify-center" aria-label="Close profile edit modal">
            <X size={20} />
          </button>
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
                  {modeOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = themeId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          console.log('[ProfileEditModal] Mode switched to:', option.id);
                          setThemeId(option.id);
                          soundManager.play('toggleOn');
                        }}
                        className={`
                          flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md
                          text-sm font-medium transition-all duration-200
                          ${isActive
                            ? 'bg-cyan-500/20 text-cyan-400 shadow-sm'
                            : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                          }
                        `}
                      >
                        <Icon size={16} className={isActive ? 'text-cyan-400' : ''} />
                        <span className="hidden sm:inline">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                {/* R20: Show hint for currently selected mode */}
                <p className="text-xs text-white/50 mt-2 text-center">
                  {modeOptions.find(o => o.id === themeId)?.hint}
                </p>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3 sm:py-2 text-base sm:text-sm min-h-[48px] sm:min-h-[auto] mt-6" disabled={isUploading}>
              {isUploading ? t('profile.saving') : t('profile.save')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
