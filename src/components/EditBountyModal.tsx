// src/components/EditBountyModal.tsx
// A modal for editing an existing bounty.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import EmojiPicker from './EmojiPicker';
import { X } from 'lucide-react';
import { useUpdateBounty } from '../hooks/useUpdateBounty';
import { Reward } from './RewardCard';

interface EditBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bounty: Reward | null;
}

const EditBountyModal: React.FC<EditBountyModalProps> = ({ isOpen, onClose, onSuccess, bounty }) => {
  const { t } = useTranslation();
  const { updateBounty, isLoading } = useUpdateBounty();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creditCost, setCreditCost] = useState<number | ''>('');
  const [imageType, setImageType] = useState<'emoji' | 'url'>('emoji');
  const [selectedEmoji, setSelectedEmoji] = useState('🎁');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrlError, setImageUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (bounty) {
      setName(bounty.name);
      setDescription(bounty.description || '');
      setCreditCost(bounty.credit_cost || '');
      
      const isUrl = bounty.image_url && (bounty.image_url.startsWith('http') || bounty.image_url.includes('/'));
      if (isUrl) {
        setImageType('url');
        setImageUrl(bounty.image_url || '');
        setSelectedEmoji('🎁');
      } else {
        setImageType('emoji');
        setSelectedEmoji(bounty.image_url || '🎁');
        setImageUrl('');
      }
    }
  }, [bounty]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bounty) return;

    if (imageType === 'url' && !validateImageUrl(imageUrl)) {
      return;
    }

    const finalImageUrl = imageType === 'emoji' ? selectedEmoji : imageUrl;

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
  };

  if (!isOpen || !bounty) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-end md:items-center z-50 backdrop-blur-sm">
      <div className="bg-gray-900 w-full h-[95vh] md:h-auto md:max-w-lg rounded-t-2xl md:rounded-xl md:border md:border-gray-700 flex flex-col">
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
            <input
              type="text"
              placeholder={t('rewards.editModal.bountyNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-base"
              required
              maxLength={100}
            />
            <textarea
              placeholder={t('rewards.editModal.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg h-24 resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-base"
            />
            <input
              type="number"
              placeholder={t('rewards.editModal.creditCostPlaceholder')}
              value={creditCost}
              onChange={(e) => setCreditCost(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-base"
              required
            />

            <div>
              <div className="flex items-center justify-center space-x-4 mb-3">
                <button type="button" onClick={() => setImageType('emoji')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${imageType === 'emoji' ? 'bg-teal-500 text-black' : 'bg-gray-700 text-white'}`}>{t('rewards.createModal.useEmoji')}</button>
                <button type="button" onClick={() => setImageType('url')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${imageType === 'url' ? 'bg-teal-500 text-black' : 'bg-gray-700 text-white'}`}>{t('rewards.createModal.useImageUrl')}</button>
              </div>
              {imageType === 'emoji' ? (
                <EmojiPicker selectedEmoji={selectedEmoji} onSelect={setSelectedEmoji} />
              ) : (
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
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700/50 flex justify-end space-x-4 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-lg text-white bg-gray-700 hover:bg-gray-600 transition font-semibold">{t('rewards.editModal.cancelButton')}</button>
            <button type="submit" disabled={isLoading} className="px-6 py-3 rounded-lg bg-teal-500 text-black font-bold hover:bg-teal-600 transition disabled:bg-gray-500">
              {isLoading ? t('rewards.editModal.submittingButton') : t('rewards.editModal.submitButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBountyModal;
