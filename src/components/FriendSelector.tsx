// src/components/FriendSelector.tsx
// A reusable dropdown component to select from a list of accepted friends.
// R25: Updated to auto-select partner in couple mode and lock selection.

import React, { useState, useEffect, useRef } from 'react';
import { useFriends } from '../hooks/useFriends';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { Heart, AlertCircle } from 'lucide-react';

interface FriendSelectorProps {
  selectedFriend: string | null;
  setSelectedFriend: (friendId: string) => void;
  className?: string;
  placeholder?: string;
}

const FriendSelector: React.FC<FriendSelectorProps> = ({ selectedFriend, setSelectedFriend, className, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const { friends, loading, error } = useFriends(user?.id);

  const acceptedFriends = friends.filter(f => f.status === 'accepted');

  // R25: In couple mode, auto-select partner and lock selection
  const isCoupleMode = theme.id === 'couple';
  const partnerId = profile?.partner_user_id;
  const hasPartnerSet = isCoupleMode && !!partnerId;
  const partnerInFriends = hasPartnerSet && acceptedFriends.some(f => f.friend?.id === partnerId);

  // R25: Auto-select partner when in couple mode
  useEffect(() => {
    if (isCoupleMode && partnerId && partnerInFriends && selectedFriend !== partnerId) {
      setSelectedFriend(partnerId);
    }
  }, [isCoupleMode, partnerId, partnerInFriends, selectedFriend, setSelectedFriend]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedFriendProfile = acceptedFriends.find(f => f.friend.id === selectedFriend)?.friend;

  if (loading) {
    return <div className="text-slate-400">Loading friends...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading friends.</div>;
  }

  // R25: In couple mode, show error if no partner is set
  if (isCoupleMode && !hasPartnerSet) {
    return (
      <div className={`p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3 ${className}`}>
        <AlertCircle size={20} className="text-amber-400 flex-shrink-0" />
        <span className="text-amber-200 text-sm">Select a partner first on the Partner page.</span>
      </div>
    );
  }

  // R25: In couple mode with partner, show locked selection
  if (isCoupleMode && hasPartnerSet && partnerInFriends) {
    const partnerProfile = acceptedFriends.find(f => f.friend?.id === partnerId)?.friend;
    if (partnerProfile) {
      return (
        <div className={`p-3 bg-gray-800/80 border border-teal-500/30 rounded-lg flex items-center gap-3 ${className}`}>
          <img
            src={partnerProfile.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(partnerProfile.email || 'user')}`}
            alt={partnerProfile.display_name || 'partner'}
            className="w-8 h-8 rounded-full border-2 border-teal-400"
          />
          <span className="font-medium flex-1">{partnerProfile.display_name}</span>
          <Heart size={16} className="text-teal-400" />
        </div>
      );
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition flex items-center justify-between"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedFriendProfile ? (
          <div className="flex items-center gap-3">
            <img
              src={selectedFriendProfile.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(selectedFriendProfile.email || 'user')}`}
              alt={selectedFriendProfile.display_name || 'user avatar'}
              className="w-8 h-8 rounded-full"
            />
            <span className="font-medium">{selectedFriendProfile.display_name}</span>
          </div>
        ) : (
          <span className="text-gray-400">{placeholder || 'Select a friend to assign bounty'}</span>
        )}
        <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-dropdown w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {acceptedFriends.length > 0 ? (
            <ul tabIndex={-1} role="listbox" aria-label="Friends">
              {acceptedFriends.map(({ friend }) => {
                if (!friend) return null;
                return (
                  <li
                    key={friend.id}
                    onClick={() => {
                      setSelectedFriend(friend.id);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-gray-700 cursor-pointer transition-colors"
                    role="option"
                    aria-selected={selectedFriend === friend.id}
                  >
                    <img
                      src={friend.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(friend.email || 'user')}`}
                      alt={friend.display_name || 'user avatar'}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="font-medium">{friend.display_name}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-3 text-center text-gray-400">You have no friends to select.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default FriendSelector;
