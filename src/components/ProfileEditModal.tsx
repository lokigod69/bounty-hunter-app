// src/components/ProfileEditModal.tsx
// This new component houses the profile editing form within a modal, 
// allowing it to be opened from the main layout header.

// src/components/ProfileEditModal.tsx
// This new component houses the profile editing form within a modal, 
// allowing it to be opened from the main layout header.
// Added a sound effects toggle switch.

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { UserCircle, Edit3, UploadCloud, X, Volume2, VolumeX } from 'lucide-react';
import { FileUpload } from './FileUpload';
import toast from 'react-hot-toast';
import { soundManager } from '../utils/soundManager';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import UserCredits from './UserCredits';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { t } = useTranslation();
  const { user, profile, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localSoundEnabled, setLocalSoundEnabled] = useState(soundManager.isEnabled());

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
      // A full reload is the most reliable way to ensure all components
      // get the updated profile information, including the header.
      window.location.reload();
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(t('profile.saveError'), { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="glass-card p-6 rounded-lg w-full max-w-md relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors" aria-label="Close profile edit modal">
          <X size={24} />
        </button>
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold gradient-text flex items-center">
            <Edit3 size={24} className="mr-2" /> {t('profile.edit')}
          </h2>

          {/* User Credits Display */}
          <div className="flex justify-center pb-4 border-b border-white/10">
            <UserCredits />
          </div>
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
              disabled={authLoading || isUploading}
            />
          </div>

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
                soundManager.play('navigation'); // Use a neutral click sound
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

          <button type="submit" className="btn-primary w-full" disabled={isUploading || authLoading}>
            {isUploading ? t('profile.saving') : t('profile.save')}
          </button>
        </form>
      </div>
    </div>
  );
}
