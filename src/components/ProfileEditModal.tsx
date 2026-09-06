import { ensureProfileForUser } from '../lib/profileBootstrap';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { UserCircle, UploadCloud, Volume2, VolumeX, Shield, Home, Heart, RotateCcw, Vibrate, VibrateOff, LogOut } from 'lucide-react';
import { FileUpload } from './FileUpload';
import toast from 'react-hot-toast';
import { soundManager } from '../utils/soundManager';
import { feedback } from '../utils/feedback';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTheme } from '../context/ThemeContext';
import { AppButton } from './ui/AppButton';
import { ModalShell } from './ui/ModalShell';
import { ConfirmModal } from './ui/ConfirmModal';
import { themesById } from '../theme/themes';
import type { ThemeId } from '../theme/theme.types';
import { MODE_ACCENT_HEX } from '../theme/modeAccents';
import { SKIN_IDS } from '../theme/skins';
import { StandingBlock } from './StandingBlock';
import { useStanding } from '../hooks/useStanding';
import { useDailyQuote } from '../hooks/useDailyQuote';
import { PageQuote } from './layout/PageQuote';
import { clearOnboardingFlag } from '../lib/ftxGate';
import { AccountDeletionPanel } from './AccountDeletionPanel';


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

// R10/R20: Mode switcher configuration. Only the icon is static — the label and
// the hint are user-visible copy, so they are read from i18n at render time via
// `theme.<id>.label` / `theme.<id>.description` and follow the language switch.
const modeOptions: { id: ThemeId; icon: typeof Shield }[] =
  Object.values(themesById).map((theme) => ({
    id: theme.id,
    icon: MODE_ICON[theme.id],
  }));


// R16: Helper to derive display name from email
function deriveDisplayNameFromEmail(email: string | undefined): string {
  if (!email) return 'New User';
  return email.split('@')[0] || 'New User';
}

export default function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { t } = useTranslation();
  // R16: Also pull profileLoading to handle first-time profile scenario
  const { user, profile, profileLoading, refreshProfile } = useAuth();
  const { themeId, setThemeId, skinId, setSkinId } = useTheme();
  const { standing, known } = useStanding();
  const dailyQuote = useDailyQuote(known ? standing.unlockedCreedLines : undefined, user?.id);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const handleSignOut = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(error.message); setSigningOut(false); return; }
    onClose();
    navigate('/login', { replace: true });
  };
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localSoundEnabled, setLocalSoundEnabled] = useState(soundManager.isEnabled());
  // Haptics are an independent channel since the Wave-0 feedback split —
  // muting sound no longer removes vibration.
  const [localHapticsEnabled, setLocalHapticsEnabled] = useState(feedback.isHapticsEnabled());
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  // Restart Onboarding: reset the FTX flag (localStorage cache + DB profile flag)
  // then send the user through the first-time flow again. Folded in from the
  // deleted /profile/edit orphan page.
  const handleRestartOnboarding = () => {
    setShowRestartConfirm(false);
    clearOnboardingFlag();
    onClose();
    navigate('/onboarding');
  };

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
      if (!profile) {
        const bootstrapped = await ensureProfileForUser(supabase, user);
        if (bootstrapped.error || !bootstrapped.profile) throw bootstrapped.error ?? new Error('Profile unavailable');
      }
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

        feedback.tap('upload');

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
        avatarUrl = publicUrlData.publicUrl;
      }

      // Bootstrap owns creation. Keep the Auth-owned email in sync without
      // selecting it; a stale stored email would fail 016's self-update policy.
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ email: user.email || '', display_name: baseDisplayName || null, avatar_url: avatarUrl || null })
        .eq('id', user.id)
        .select('id, display_name, avatar_url, theme, onboarding_completed')
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

      feedback.success('saveProfile');

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
    <ModalShell isOpen={isOpen} onClose={() => { if (!deletingAccount) onClose(); }} name="ProfileEditModal" labelledBy="profileedit-title">
      {/* Modal Header with enhanced mobile touch targets */}
      <div className="flex items-center justify-center p-3 sm:p-4 border-b border-gray-700/50 flex-shrink-0">
        <h2 id="profileedit-title" className="text-lg sm:text-xl font-bold text-center">{t('workflow.profile')}</h2>
      </div>

      {/* Modal Body (Scrollable) with enhanced mobile spacing */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
          <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset disabled={deletingAccount} className="space-y-6 min-w-0">
            <div className="flex flex-col items-center space-y-3">
              <div className="avatar-ring">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Avatar preview" 
                  className="w-20 h-20 rounded-full object-cover border-2 border-cyan-400/50"
                />
              ) : (
                <UserCircle size={80} className="text-white/30" />
              )}
              </div>
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

            <div className="space-y-4 pt-4 border-t border-white/10">
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
                    if (newState) feedback.tap('toggleOn');
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

              {/* Haptics Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <label className="text-sm font-medium flex items-center">
                  {localHapticsEnabled ? <Vibrate size={18} className="mr-2 text-cyan-400" /> : <VibrateOff size={18} className="mr-2 text-gray-500"/>}
                  {t('profile.haptics')}
                </label>
                <button
                  type="button"
                  aria-label={localHapticsEnabled ? t('profile.disableHaptics') : t('profile.enableHaptics')}
                  onClick={() => {
                    const next = !feedback.isHapticsEnabled();
                    feedback.setHapticsEnabled(next);
                    setLocalHapticsEnabled(next);
                    if (next) feedback.tap(); // immediate demo pulse
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 ${
                    localHapticsEnabled ? 'bg-emerald-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      localHapticsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <label className="text-sm font-medium">{t('profile.language')}</label>
                <LanguageSwitcher />
              </div>

              {/* Material and accent are appearance choices, independent of recipients. */}
              {modeOptions.length > 1 && (
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <label className="text-sm font-medium block mb-3">{t('workflow.appearance')}</label>
                <p className="text-xs text-white/60 mb-3">{t('workflow.appearanceHint')}</p>
                <fieldset className="mb-5">
                  <legend className="text-xs text-white/70 mb-3">{t('workflow.skinHint')}</legend>
                  <div className="grid grid-cols-3 gap-3">
                    {SKIN_IDS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={skinId === id}
                        className="skin-choice"
                        data-preview-skin={id}
                        onClick={() => { setSkinId(id); feedback.tap('toggleOn'); }}
                      >
                        <span className="skin-swatch" aria-hidden="true"><span /></span>
                        <span>{t(`workflow.skins.${id}`)}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="flex bg-gray-900/60 rounded-lg p-1 gap-1">
                  {modeOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = themeId === option.id;
                    const accent = MODE_ACCENT_HEX[option.id];
                    return (
                      <button
                        key={option.id}
                        aria-pressed={isActive}
                        aria-label={t(`theme.${option.id}.label`)}
                        type="button"
                        onClick={() => {
                          setThemeId(option.id);
                          feedback.tap('toggleOn');
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
                        <span className="text-xs">{t(`theme.${option.id}.label`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              )}

              <details className="optional-details">
                <summary>{t('workflow.progress')}</summary>
                <div className="pt-4"><StandingBlock standing={standing} known={known} /></div>
                {dailyQuote && <PageQuote text={dailyQuote.text} author={dailyQuote.author} />}
              </details>

              {/* Restart Onboarding (folded in from the removed /profile/edit page) */}
              <button
                type="button"
                onClick={() => setShowRestartConfirm(true)}
                className="w-full flex items-center justify-center gap-2 min-h-[44px] p-4 bg-gray-800/50 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-gray-800/80 transition-colors"
              >
                <RotateCcw size={18} className="text-white/60" />
                {t('profile.restartOnboarding')}
              </button>
            </div>

            <AppButton type="submit" variant="cta" fullWidth loading={isUploading} className="mt-6">
              {isUploading ? t('profile.saving') : t('profile.save')}
            </AppButton>
            </fieldset>
          </form>
          <AppButton type="button" variant="ghost" fullWidth className="mt-4" loading={signingOut} disabled={deletingAccount} icon={<LogOut size={18} />} onClick={handleSignOut}>{t('auth.signOut')}</AppButton>
          {import.meta.env.VITE_ACCOUNT_DELETION_ENABLED === 'true' && user && (
            <AccountDeletionPanel userId={user.id} onBusyChange={setDeletingAccount} onDeleted={async () => {
              // The server has confirmed Auth absence before local session cleanup.
              await supabase.auth.signOut({ scope: 'local' });
              toast.success(t('accountDeletion.deleted'));
              onClose();
              navigate('/login', { replace: true });
            }} />
          )}
      </div>

      <ConfirmModal
        isOpen={showRestartConfirm}
        onClose={() => setShowRestartConfirm(false)}
        onConfirm={handleRestartOnboarding}
        variant="default"
        title={t('profile.restartOnboardingConfirmTitle')}
        message={t('profile.restartOnboardingConfirmMessage')}
        confirmLabel={t('profile.restartOnboardingConfirmButton')}
        cancelLabel={t('common.cancel')}
      />
    </ModalShell>
  );
}
