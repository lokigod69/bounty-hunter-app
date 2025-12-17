// src/components/EditBountyModal.tsx
// Phase 2: Updated to use overlay-root, UIContext, and standardized z-index classes.
// R22: Added file upload option for reward images.
// R27: Added character limits and counters
// A modal for editing an existing bounty.

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import EmojiPicker from './EmojiPicker';
import { FileUpload } from './FileUpload';
import { X, Upload, Trash2 } from 'lucide-react';
import { useUpdateBounty } from '../hooks/useUpdateBounty';
import { Reward } from './RewardCard';
import { useUI } from '../context/UIContext';
import { useAuth } from '../hooks/useAuth';
import { getOverlayRoot } from '../lib/overlayRoot';
import { TEXT_LIMITS } from '../config/textLimits';
import { CharacterCounter } from './ui/CharacterCounter';
import {
  uploadRewardImage,
  validateRewardImage,
  isRewardImageStorageUrl,
  REWARD_IMAGE_MAX_SIZE_MB,
  REWARD_IMAGE_ALLOWED_EXTENSIONS,
} from '../lib/rewardImageUpload';

interface EditBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bounty: Reward | null;
}

const EditBountyModal: React.FC<EditBountyModalProps> = ({ isOpen, onClose, onSuccess, bounty }) => {
  const { t } = useTranslation();
  const supabase = useSupabaseClient();
  const { user } = useAuth();
  const { updateBounty, isLoading } = useUpdateBounty();
  const { openModal, clearLayer } = useUI();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creditCost, setCreditCost] = useState<number | ''>('');

  // R22: Image state - now includes 'upload' option
  const [imageType, setImageType] = useState<'emoji' | 'url' | 'upload'>('emoji');
  const [selectedEmoji, setSelectedEmoji] = useState('🎁');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrlError, setImageUrlError] = useState<string | null>(null);

  // R22: File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (bounty) {
      setName(bounty.name);
      setDescription(bounty.description || '');
      setCreditCost(bounty.credit_cost || '');

      // R22: Determine image type from existing data
      const imgUrl = bounty.image_url;
      const isHttpUrl = imgUrl && (imgUrl.startsWith('http') || imgUrl.includes('/'));
      const isStorageUrl = imgUrl && isRewardImageStorageUrl(imgUrl);

      if (isStorageUrl) {
        // It's an uploaded image
        setImageType('upload');
        setExistingImageUrl(imgUrl);
        setUploadPreview(imgUrl);
        setImageUrl('');
        setSelectedEmoji('🎁');
      } else if (isHttpUrl) {
        // It's an external URL
        setImageType('url');
        setImageUrl(imgUrl || '');
        setSelectedEmoji('🎁');
        setExistingImageUrl(null);
        setUploadPreview(null);
      } else {
        // It's an emoji
        setImageType('emoji');
        setSelectedEmoji(imgUrl || '🎁');
        setImageUrl('');
        setExistingImageUrl(null);
        setUploadPreview(null);
      }

      // Reset upload file when bounty changes
      setUploadFile(null);
      setUploadError(null);
    }
  }, [bounty]);

  // R7 FIX: Only setup overlay when THIS modal is open
  useEffect(() => {
    if (!isOpen) return;
    openModal();
    return () => {
      clearLayer();
    };
  }, [isOpen, openModal, clearLayer]);

  const validateImageUrl = (url: string) => {
    if (!url) return true;
    const isValid = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.includes('unsplash.com') || url.includes('imgur.com');
    if (!isValid) {
      setImageUrlError(t('rewards.createModal.imageUrlError'));
      return false;
    }
    setImageUrlError(null);
    return true;
  };

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
    setExistingImageUrl(null);
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // R23 debug log (remove later)
    console.log('[EditBountyModal] bounty.id', bounty?.id, bounty);
    if (!bounty || !user) return;

    if (imageType === 'url' && !validateImageUrl(imageUrl)) {
      return;
    }

    setIsUploading(true);
    let finalImageUrl = '';

    try {
      // R22: Handle different image types
      if (imageType === 'emoji') {
        finalImageUrl = selectedEmoji;
      } else if (imageType === 'url') {
        finalImageUrl = imageUrl;
      } else if (imageType === 'upload') {
        if (uploadFile) {
          // New file to upload
          const uploadResult = await uploadRewardImage(
            supabase,
            uploadFile,
            user.id,
            bounty.id
          );

          if (!uploadResult.success) {
            setUploadError(uploadResult.error || 'Upload failed');
            setIsUploading(false);
            return;
          }

          finalImageUrl = uploadResult.publicUrl || '';
        } else if (existingImageUrl) {
          // Keep existing uploaded image
          finalImageUrl = existingImageUrl;
        }
      }

      const result = await updateBounty({
        p_bounty_id: bounty.id,
        p_name: name,
        p_description: description,
        p_image_url: finalImageUrl,
        p_credit_cost: Number(creditCost),
      });

      if (result?.success) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('[EditBountyModal] Submit error:', err);
      setUploadError('Failed to update bounty. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen || !bounty) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-end md:items-center z-modal-backdrop backdrop-blur-sm">
      <div className="bg-gray-900 w-full h-[95vh] md:h-auto md:max-w-lg rounded-t-2xl md:rounded-xl md:border md:border-gray-700 flex flex-col z-modal-content">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700/50 flex-shrink-0">
            <h2 className="text-xl font-bold text-white">{t('rewards.editModal.title')}</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white" aria-label={t('rewards.createModal.closeButton')}>
              <X size={24} />
            </button>
          </div>

          {/* Form Content (scrollable) */}
          <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-6">
            {/* R27: Name field with character counter */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-white/70">{t('rewards.editModal.bountyNamePlaceholder')}</label>
                <CharacterCounter current={name.length} max={TEXT_LIMITS.rewardName} />
              </div>
              <input
                type="text"
                placeholder={t('rewards.editModal.bountyNamePlaceholder')}
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
                <label className="text-sm font-medium text-white/70">{t('rewards.editModal.descriptionPlaceholder')}</label>
                <CharacterCounter current={description.length} max={TEXT_LIMITS.rewardDescription} />
              </div>
              <textarea
                placeholder={t('rewards.editModal.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg h-24 resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-base"
                maxLength={TEXT_LIMITS.rewardDescription}
              />
            </div>
            <input
              type="number"
              placeholder={t('rewards.editModal.creditCostPlaceholder')}
              value={creditCost}
              onChange={(e) => setCreditCost(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-base"
              required
            />

            {/* R22: Image selection with three options */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Reward Image</label>
              <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                <button type="button" onClick={() => setImageType('emoji')} className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition ${imageType === 'emoji' ? 'bg-teal-500 text-black' : 'bg-gray-700 text-white'}`}>{t('rewards.createModal.useEmoji')}</button>
                <button type="button" onClick={() => setImageType('url')} className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition ${imageType === 'url' ? 'bg-teal-500 text-black' : 'bg-gray-700 text-white'}`}>{t('rewards.createModal.useImageUrl')}</button>
                <button type="button" onClick={() => setImageType('upload')} className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition ${imageType === 'upload' ? 'bg-teal-500 text-black' : 'bg-gray-700 text-white'}`}>Upload</button>
              </div>

              {imageType === 'emoji' && (
                <EmojiPicker selectedEmoji={selectedEmoji} onSelect={setSelectedEmoji} />
              )}

              {imageType === 'url' && (
                <div>
                  <input
                    type="text"
                    placeholder={t('rewards.createModal.imageUrlPlaceholder')}
                    value={imageUrl}
                    onChange={(e) => { setImageUrl(e.target.value); validateImageUrl(e.target.value); }}
                    className={`w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-base ${imageUrlError ? 'border-red-500' : ''}`}
                  />
                  {imageUrlError && <p className="text-red-500 text-sm mt-1">{imageUrlError}</p>}
                </div>
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
                      {uploadFile && <p className="text-xs text-white/50 mt-1 text-center">{uploadFile.name}</p>}
                      {existingImageUrl && !uploadFile && <p className="text-xs text-teal-400/70 mt-1 text-center">Current uploaded image</p>}
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

          {/* Footer */}
          <div className="p-4 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700/50 flex justify-end space-x-4 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={isLoading || isUploading} className="px-6 py-3 rounded-lg text-white bg-gray-700 hover:bg-gray-600 transition font-semibold disabled:opacity-50">{t('rewards.editModal.cancelButton')}</button>
            <button type="submit" disabled={isLoading || isUploading} className="px-6 py-3 rounded-lg bg-teal-500 text-black font-bold hover:bg-teal-600 transition disabled:bg-gray-500">
              {isLoading || isUploading ? (isUploading ? 'Uploading...' : t('rewards.editModal.submittingButton')) : t('rewards.editModal.submitButton')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    getOverlayRoot() // Phase 2: Portal into overlay-root
  );
};

export default EditBountyModal;
