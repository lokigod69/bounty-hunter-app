// src/components/CreateBountyModal.tsx
// Phase 2: Updated to use overlay-root and UIContext activeLayer coordination.
// R22: Added file upload option for reward images.
// R27: Added character limits and counters
// A modal form for creating a new bounty and assigning it to a friend.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import toast from 'react-hot-toast';
import FriendSelector from './FriendSelector';
import EmojiPicker from './EmojiPicker';
import { FileUpload } from './FileUpload';
import { Upload, Trash2 } from 'lucide-react';
import { useCreateBounty } from '../hooks/useCreateBounty';
import { useAuth } from '../hooks/useAuth';
import { TEXT_LIMITS } from '../config/textLimits';
import { CharacterCounter } from './ui/CharacterCounter';
import { AppButton } from './ui/AppButton';
import { ModalShell } from './ui/ModalShell';
import {
  uploadRewardImage,
  validateRewardImage,
  REWARD_IMAGE_MAX_SIZE_MB,
  REWARD_IMAGE_ALLOWED_EXTENSIONS,
} from '../lib/rewardImageUpload';

interface CreateBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback to refetch data on parent
}

const CreateBountyModal: React.FC<CreateBountyModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const supabase = useSupabaseClient();
  const { user } = useAuth();
  const { createBounty, isLoading } = useCreateBounty();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creditCost, setCreditCost] = useState<number | ''>('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

  // R22/R30: State for image/icon handling - emoji or upload only
  const [imageType, setImageType] = useState<'emoji' | 'upload'>('emoji');
  const [selectedEmoji, setSelectedEmoji] = useState('🎁');

  // R22: File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // R22: Handle file selection
  const handleFileSelect = (file: File) => {
    const validation = validateRewardImage(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    setUploadError(null);
    setUploadFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // R22: Clear uploaded file
  const handleClearUpload = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // R32: Add validation messages for missing fields
    if (!assignedTo) {
      toast.error('Please select a recipient for this bounty.');
      return;
    }
    if (creditCost === '' || creditCost <= 0) {
      toast.error('Please enter a valid credit cost.');
      return;
    }
    if (!user) return;

    setIsUploading(true);
    let finalImageUrl = '';

    try {
      // R22/R30: Handle different image types (emoji or upload only)
      if (imageType === 'emoji') {
        finalImageUrl = selectedEmoji;
      } else if (imageType === 'upload' && uploadFile) {
        // Upload file to storage
        const uploadResult = await uploadRewardImage(
          supabase,
          uploadFile,
          user.id,
          'new' // Will be replaced with actual ID after creation
        );

        if (!uploadResult.success) {
          setUploadError(uploadResult.error || 'Upload failed');
          setIsUploading(false);
          return;
        }

        finalImageUrl = uploadResult.publicUrl || '';
      }

      const result = await createBounty({
        p_name: name,
        p_description: description,
        p_image_url: finalImageUrl,
        p_credit_cost: Number(creditCost),
        p_assigned_to: assignedTo,
      });

      if (result && result.success) {
        // Reset form state
        setName('');
        setDescription('');
        setCreditCost('');
        setAssignedTo(null);
        setImageType('emoji');
        setSelectedEmoji('🎁');
        handleClearUpload();

        onSuccess(); // Trigger refetch
        onClose(); // Close modal
      }
    } catch {
      setUploadError('Failed to create bounty. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      name="CreateBountyModal"
      size="lg"
      sheet
      labelledBy="createbounty-title"
    >
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        {/* Header - fixed at top */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-700/50 flex-shrink-0">
          <h2 id="createbounty-title" className="text-lg sm:text-xl font-bold text-white">{t('rewards.createModal.title')}</h2>
        </div>

        {/* Single scroll container - iOS Safari optimized */}
        <div
          className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
          }}
        >
            <FriendSelector selectedFriend={assignedTo} setSelectedFriend={setAssignedTo} placeholder={t('rewards.createModal.assignBountyPlaceholder')} />

            {/* R27: Name field with character counter */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-white/70">{t('rewards.createModal.bountyNamePlaceholder')}</label>
                <CharacterCounter current={name.length} max={TEXT_LIMITS.rewardName} />
              </div>
              <input
                type="text"
                placeholder={t('rewards.createModal.bountyNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-base"
                required
                maxLength={TEXT_LIMITS.rewardName}
              />
            </div>

            {/* R27: Description field with character counter */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-white/70">{t('rewards.createModal.descriptionPlaceholder')}</label>
                <CharacterCounter current={description.length} max={TEXT_LIMITS.rewardDescription} />
              </div>
              <textarea
                placeholder={t('rewards.createModal.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition h-24 text-base"
                required
                maxLength={TEXT_LIMITS.rewardDescription}
              />
            </div>

            <input
              type="number"
              placeholder={t('rewards.createModal.creditCostPlaceholder')}
              value={creditCost}
              onChange={(e) => setCreditCost(e.target.value === '' ? '' : Number(e.target.value))}
              min="1"
              className="w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-base"
              required
            />

            {/* R22/R30: Image selection - emoji or upload only */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Reward Image (optional)</label>
              <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                <button type="button" onClick={() => setImageType('emoji')} className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition ${imageType === 'emoji' ? 'bg-teal-500 text-black' : 'bg-gray-700 text-white'}`}>{t('rewards.createModal.useEmoji')}</button>
                <button type="button" onClick={() => setImageType('upload')} className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition ${imageType === 'upload' ? 'bg-teal-500 text-black' : 'bg-gray-700 text-white'}`}>Upload</button>
              </div>

              {imageType === 'emoji' && (
                <EmojiPicker selectedEmoji={selectedEmoji} onSelect={setSelectedEmoji} />
              )}

              {imageType === 'upload' && (
                <div className="space-y-3">
                  {uploadPreview ? (
                    <div className="relative">
                      {/* R26: Square aspect ratio preview to match RewardCard */}
                      <div className="w-full aspect-square rounded-lg overflow-hidden border border-gray-700">
                        <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={handleClearUpload}
                        className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition"
                        aria-label="Remove image"
                      >
                        <Trash2 size={16} />
                      </button>
                      <p className="text-xs text-white/50 mt-1 text-center">{uploadFile?.name}</p>
                    </div>
                  ) : (
                    <FileUpload
                      onFileSelect={handleFileSelect}
                      accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
                    >
                      <div className="w-full p-6 border-2 border-dashed border-gray-600 rounded-lg hover:border-teal-500 transition cursor-pointer text-center">
                        <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-white/70">Click to upload image</p>
                        <p className="text-xs text-white/50 mt-1">
                          {REWARD_IMAGE_ALLOWED_EXTENSIONS.join(', ').toUpperCase()} - Max {REWARD_IMAGE_MAX_SIZE_MB}MB
                        </p>
                      </div>
                    </FileUpload>
                  )}
                  {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Sticky footer - always visible on iOS Safari */}
          <div className="p-3 sm:p-4 bg-gray-900 border-t border-gray-700/50 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 flex-shrink-0 safe-bottom">
            <AppButton type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px]" disabled={isLoading || isUploading}>
              {t('rewards.createModal.cancelButton')}
            </AppButton>
            <AppButton type="submit" variant="cta" loading={isLoading || isUploading} className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px]">
              {isLoading || isUploading ? (isUploading ? 'Uploading...' : t('rewards.createModal.submittingButton')) : t('rewards.createModal.submitButton')}
            </AppButton>
        </div>
      </form>
    </ModalShell>
  );
};

export default CreateBountyModal;
