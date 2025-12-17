// src/components/CreateBountyModal.tsx
// Phase 2: Updated to use overlay-root and UIContext activeLayer coordination.
// R22: Added file upload option for reward images.
// A modal form for creating a new bounty and assigning it to a friend.

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import FriendSelector from './FriendSelector';
import EmojiPicker from './EmojiPicker';
import { FileUpload } from './FileUpload';
import { X, Upload, Trash2 } from 'lucide-react';
import { useCreateBounty } from '../hooks/useCreateBounty';
import { useUI } from '../context/UIContext';
import { useAuth } from '../hooks/useAuth';
import { getOverlayRoot } from '../lib/overlayRoot';
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
  const { openModal, clearLayer } = useUI();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creditCost, setCreditCost] = useState<number | ''>('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

  // R22: State for image/icon handling - now includes 'upload' option
  const [imageType, setImageType] = useState<'emoji' | 'url' | 'upload'>('emoji');
  const [selectedEmoji, setSelectedEmoji] = useState('🎁');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrlError, setImageUrlError] = useState<string | null>(null);

  // R22: File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const validateImageUrl = (url: string) => {
    if (!url) return true; // Optional field
    const isValid = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                    url.includes('unsplash.com') ||
                    url.includes('imgur.com');
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
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTo || creditCost === '' || !user) return;

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
        setImageUrl('');
        handleClearUpload();

        onSuccess(); // Trigger refetch
        onClose(); // Close modal
      }
    } catch (err) {
      console.error('[CreateBountyModal] Submit error:', err);
      setUploadError('Failed to create bounty. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // R7 FIX: Only setup overlay when THIS modal is open
  useEffect(() => {
    if (!isOpen) return;
    openModal();
    return () => {
      clearLayer();
    };
  }, [isOpen, openModal, clearLayer]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-2 sm:p-4 z-modal-backdrop backdrop-blur-sm">
      <div className="bg-gray-900 w-full h-[98vh] sm:h-[95vh] md:h-auto md:max-w-lg rounded-t-2xl md:rounded-xl md:border md:border-gray-700 flex flex-col z-modal-content mx-1 sm:mx-0">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header with enhanced mobile spacing */}
          <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-700/50 flex-shrink-0">
            <h2 className="text-lg sm:text-xl font-bold text-white">{t('rewards.createModal.title')}</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white transition z-modal-controls p-3 sm:p-2 rounded-full hover:bg-gray-700/50 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={t('rewards.createModal.closeButton')}>
              <X size={20} />
            </button>
          </div>

          {/* Form Content (scrollable) with enhanced mobile spacing */}
          <div className="flex-grow overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
            <FriendSelector selectedFriend={assignedTo} setSelectedFriend={setAssignedTo} placeholder={t('rewards.createModal.assignBountyPlaceholder')} />
            
            <input
              type="text"
              placeholder={t('rewards.createModal.bountyNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-base"
              required
              maxLength={100}
            />

            <textarea
              placeholder={t('rewards.createModal.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition h-24 text-base"
              required
            />

            <input
              type="number"
              placeholder={t('rewards.createModal.creditCostPlaceholder')}
              value={creditCost}
              onChange={(e) => setCreditCost(e.target.value === '' ? '' : Number(e.target.value))}
              min="1"
              className="w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-base"
              required
            />

            {/* R22: Image selection with three options */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Reward Image (optional)</label>
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
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      validateImageUrl(e.target.value);
                    }}
                    className={`
                      w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-base
                      ${imageUrlError ? 'border-red-500' : ''}
                    `}
                  />
                  {imageUrlError && <p className="text-red-500 text-sm mt-1">{imageUrlError}</p>}
                </div>
              )}

              {imageType === 'upload' && (
                <div className="space-y-3">
                  {uploadPreview ? (
                    <div className="relative">
                      <div className="w-full h-40 rounded-lg overflow-hidden border border-gray-700">
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

          {/* Footer with enhanced mobile button layout */}
          <div className="p-3 sm:p-4 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700/50 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 flex-shrink-0">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3 sm:py-2 rounded-lg text-white bg-gray-700 hover:bg-gray-600 transition font-semibold min-h-[48px] sm:min-h-[auto] text-base sm:text-sm" disabled={isLoading || isUploading}>
              {t('rewards.createModal.cancelButton')}
            </button>
            <button type="submit" className="w-full sm:w-auto px-6 py-3 sm:py-2 rounded-lg text-black bg-teal-400 hover:bg-teal-500 font-bold transition disabled:bg-gray-500 disabled:cursor-not-allowed min-h-[48px] sm:min-h-[auto] text-base sm:text-sm" disabled={isLoading || isUploading}>
              {isLoading || isUploading ? (isUploading ? 'Uploading...' : t('rewards.createModal.submittingButton')) : t('rewards.createModal.submitButton')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    getOverlayRoot() // Phase 2: Portal into overlay-root instead of document.body
  );
};

export default CreateBountyModal;
