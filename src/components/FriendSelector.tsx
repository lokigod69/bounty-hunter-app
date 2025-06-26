// src/components/FriendSelector.tsx
// A reusable dropdown component to select from a list of accepted friends.

import React from 'react';
import { useFriends } from '../hooks/useFriends';
import { useAuth } from '../hooks/useAuth';

interface FriendSelectorProps {
  selectedFriend: string | null;
  setSelectedFriend: (friendId: string) => void;
  className?: string;
}

const FriendSelector: React.FC<FriendSelectorProps> = ({ selectedFriend, setSelectedFriend, className }) => {
  const { user } = useAuth();
  // The useFriends hook returns an array where each object has a `friend` property containing the profile
  const { friends, loading, error } = useFriends(user?.id);

  const acceptedFriends = friends.filter(f => f.status === 'accepted');

  if (loading) {
    return <div className="text-slate-400">Loading friends...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading friends.</div>;
  }

  return (
    <select
      value={selectedFriend || ''}
      onChange={(e) => setSelectedFriend(e.target.value)}
      className={`w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition ${className}`}
      required
      aria-label="Select a friend"
    >
      <option value="" disabled>Select a friend to assign bounty</option>
      {acceptedFriends.map(({ friend }) => {
        if (!friend) return null;

        return (
          <option key={friend.id} value={friend.id}>
            {friend.display_name || friend.email || 'Unnamed Friend'}
          </option>
        );
      })}
    </select>
  );
};

export default FriendSelector;
