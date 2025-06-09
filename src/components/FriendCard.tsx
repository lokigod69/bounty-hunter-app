// src/components/FriendCard.tsx
// Card component for displaying friend information.
// Changes:
// - Removed unused 'React' import.
// - Added a delete (Trash2) icon button for pending sent friend requests.
// - Added `onCancelSentRequest` prop to handle the deletion logic.

import { Profile } from '../types/database';
import { CheckCircle, X, UserX, UserCheck, Trash2 } from 'lucide-react'; // Added Trash2

interface FriendCardProps {
  profile: Profile;
  friendshipId?: string;
  status?: 'accepted' | 'pending';
  isIncoming?: boolean;
  onAccept?: (friendshipId: string) => void;
  onReject?: (friendshipId: string) => void;
  onRemove?: (friendshipId: string) => void;
  onCancelSentRequest?: (friendshipId: string) => void; // Added prop for cancelling sent request
}

export default function FriendCard({
  profile,
  friendshipId,
  status = 'accepted',
  isIncoming = false,
  onAccept,
  onReject,
  onRemove,
  onCancelSentRequest, // Destructure new prop
}: FriendCardProps) {
  // Get initials from display name or email
  const getInitials = () => {
    if (profile.display_name) {
      return profile.display_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();
    }
    return profile.email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="glass-card flex items-center p-4 transition-all duration-300 hover:shadow-lg">
      {/* Avatar */}
      <div className="mr-4">
        {profile.avatar_url ? (
          <div className="w-12 h-12 rounded-full overflow-hidden">
            <img
              src={profile.avatar_url}
              alt={profile.display_name || profile.email}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center text-white font-medium">
            {getInitials()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">
          {profile.display_name || profile.email.split('@')[0]}
        </h3>
        <p className="text-sm text-white/70 truncate">{profile.email}</p>
      </div>

      {/* Status/Actions */}
      <div className="ml-4 flex items-center space-x-2">
        {status === 'accepted' && (
          <>
            <span className="text-green-400 flex items-center mr-2 text-sm">
              <CheckCircle size={16} className="mr-1" />
              Friend
            </span>
            {onRemove && friendshipId && (
              <button
                onClick={() => onRemove(friendshipId)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-red-400 transition-colors"
                aria-label="Remove friend"
                title="Remove friend"
              >
                <UserX size={18} />
              </button>
            )}
          </>
        )}

        {status === 'pending' && isIncoming && onAccept && onReject && friendshipId && (
          <>
            <button
              onClick={() => onAccept(friendshipId)}
              className="p-1.5 rounded-full hover:bg-green-500/20 text-white/70 hover:text-green-400 transition-colors"
              aria-label="Accept"
              title="Accept request"
            >
              <UserCheck size={18} />
            </button>
            <button
              onClick={() => onReject(friendshipId)}
              className="p-1.5 rounded-full hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-colors"
              aria-label="Reject"
              title="Reject request"
            >
              <X size={18} />
            </button>
          </>
        )}

        {status === 'pending' && !isIncoming && (
          <>
            <span className="text-amber-400 text-sm mr-2">Pending</span>
            {onCancelSentRequest && friendshipId && (
              <button
                onClick={() => onCancelSentRequest(friendshipId)}
                className="p-1.5 rounded-full hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-colors"
                aria-label="Cancel sent request"
                title="Cancel sent request"
              >
                <Trash2 size={18} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}