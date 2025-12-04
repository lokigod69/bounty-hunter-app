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
import { UserCircle, UploadCloud, X, Volume2, VolumeX } from 'lucide-react';
import { FileUpload } from './FileUpload';
import toast from 'react-hot-toast';
import { soundManager } from '../utils/soundManager';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useUI } from '../context/UIContext';


interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const { openModal, clearLayer } = useUI();
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localSoundEnabled, setLocalSoundEnabled] = useState(soundManager.isEnabled());

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

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile, isOpen]);

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
    const toastId = toast.loading(t('profile.saving'));

    try {
      let avatarUrl = profile?.avatar_url;

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

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: displayName, avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      soundManager.play('saveProfile');

      toast.success(t('profile.saveSuccess'), { id: toastId });

      // Refresh profile in context instead of hard reload
      console.log('[ProfileEditModal] About to call refreshProfile, current profile:', {
        id: profile?.id,
        display_name: profile?.display_name,
        avatar_url: profile?.avatar_url,
      });

      if (refreshProfile) {
        await refreshProfile();
        console.log('[ProfileEditModal] refreshProfile completed');
      } else {
        console.warn('[ProfileEditModal] refreshProfile is undefined!');
      }

      // Close modal after successful save
      onClose();
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(t('profile.saveError'), { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-modal-backdrop p-2 sm:p-4"
      onClick={onClose} // Click outside to close
    >
      <div 
        className="glass-card w-full max-w-md mx-2 sm:mx-4 bg-gray-900/80 rounded-xl sm:rounded-2xl border border-gray-700 flex flex-col animate-fade-in-up max-h-[95vh] sm:max-h-[90vh] z-modal-content"
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
