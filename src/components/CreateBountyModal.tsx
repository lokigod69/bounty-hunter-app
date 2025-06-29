// src/components/CreateBountyModal.tsx
// A modal form for creating a new bounty and assigning it to a friend.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import FriendSelector from './FriendSelector';
import EmojiPicker from './EmojiPicker';
import { X } from 'lucide-react';
import { useCreateBounty } from '../hooks/useCreateBounty';

interface CreateBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback to refetch data on parent
}

const CreateBountyModal: React.FC<CreateBountyModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { createBounty, isLoading } = useCreateBounty();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creditCost, setCreditCost] = useState<number | ''>('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

  // State for image/icon handling
  const [imageType, setImageType] = useState<'emoji' | 'url'>('emoji');
  const [selectedEmoji, setSelectedEmoji] = useState('🎁');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrlError, setImageUrlError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTo || creditCost === '') return;

    if (imageType === 'url' && !validateImageUrl(imageUrl)) {
      return;
    }

    const finalImageUrl = imageType === 'emoji' ? selectedEmoji : imageUrl;

    const result = await createBounty({
      p_name: name,
      p_description: description,
      p_image_url: finalImageUrl,
      p_credit_cost: Number(creditCost),
      p_assigned_to: assignedTo,
    });

    if (result && result.success) {
      onSuccess(); // Trigger refetch
      onClose(); // Close modal
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-[1000] backdrop-blur-sm">
      <div className="bg-gray-900 w-full h-[95vh] md:h-auto md:max-w-lg rounded-t-2xl md:rounded-xl md:border md:border-gray-700 flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700/50 flex-shrink-0">
            <h2 className="text-xl font-bold text-white">{t('rewards.createModal.title')}</h2>
            <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition z-[1001]" aria-label={t('rewards.createModal.closeButton')}>
              <X size={24} />
            </button>
          </div>

          {/* Form Content (scrollable) */}
          <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-6">
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
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700/50 flex justify-end space-x-4 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-lg text-white bg-gray-700 hover:bg-gray-600 transition font-semibold">
              {t('rewards.createModal.cancelButton')}
            </button>
            <button type="submit" className="px-6 py-3 rounded-lg text-black bg-teal-400 hover:bg-teal-500 font-bold transition disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={isLoading}>
              {isLoading ? t('rewards.createModal.submittingButton') : t('rewards.createModal.submitButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBountyModal;
