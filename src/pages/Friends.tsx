// src/pages/Friends.tsx
// Friends management page.
// Changes:
// - Updated page title to 'GUILD ROSTER' (Phase 5A, Step 3).
// - Updated terminology: 'My Friends' to 'Guild Members', 'Add a Friend' to 'Recruit Member', 'Send Request' to 'Send Invitation' (Phase 5B, Step 4).
// - Corrected prop name to `isConfirming` for ConfirmDeleteModal.
// - Removed unused 'Search' icon import.
// - Added functionality to cancel pending sent friend requests with a confirmation modal.
// - Imported ConfirmDeleteModal and necessary state/handlers.
// - Passed cancel handler to FriendCard for sent requests.

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../hooks/useFriends';
import FriendCard from '../components/FriendCard';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'; // Assuming ConfirmDeleteModal is suitable
import { UserPlus, Users, UserCheck, Mail, AlertCircle } from 'lucide-react'; // Removed Search

export default function Friends() {
  const { user } = useAuth();
  const { friends, pendingRequests, sentRequests, loading, error, sendFriendRequest, respondToFriendRequest, removeFriend, cancelSentRequest } = useFriends(user?.id);
  
  const [email, setEmail] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

  // State for cancel sent request confirmation modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [requestToCancelId, setRequestToCancelId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setSearchSuccess(null);
    
    if (!email.trim()) {
      setSearchError('Please enter an email address');
      return;
    }
    
    try {
      const result = await sendFriendRequest(email.trim());
      if (result) {
        setSearchSuccess('Friend request sent successfully!');
        setEmail('');
      }
    } catch (error) {
      setSearchError((error as Error).message);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    await respondToFriendRequest(friendshipId, true);
  };

  const handleRejectRequest = async (friendshipId: string) => {
    await respondToFriendRequest(friendshipId, false);
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    await removeFriend(friendshipId);
  };

  // Handlers for cancelling a sent friend request
  const handleRequestCancellationAttempt = (friendshipId: string) => {
    setRequestToCancelId(friendshipId);
    setShowCancelModal(true);
  };

  const handleConfirmCancelRequest = async () => {
    if (requestToCancelId && cancelSentRequest) {
      setIsCancelling(true);
      await cancelSentRequest(requestToCancelId);
      setIsCancelling(false);
      setShowCancelModal(false);
      setRequestToCancelId(null);
    }
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setRequestToCancelId(null);
    setIsCancelling(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold gradient-text">GUILD ROSTER</h1>
      </div>

      {/* Add Friend Form */}
      <div className="glass-card p-5 mb-6">
        <h2 className="flex items-center text-lg font-medium mb-4">
          <UserPlus size={20} className="mr-2 text-teal-400" />
          Recruit Member
        </h2>
        <form onSubmit={handleSendRequest} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={16} className="text-white/50" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter friend's email address"
              className="input-field w-full pl-10"
            />
          </div>
          <button type="submit" className="btn-primary whitespace-nowrap">
            Send Invitation
          </button>
        </form>
        
        {/* Status messages */}
        {searchError && (
          <div className="mt-3 text-red-400 text-sm flex items-center">
            <AlertCircle size={16} className="mr-1" />
            {searchError}
          </div>
        )}
        {searchSuccess && (
          <div className="mt-3 text-green-400 text-sm flex items-center">
            <UserCheck size={16} className="mr-1" />
            {searchSuccess}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm flex-1 text-center ${
            activeTab === 'friends'
              ? 'text-teal-400 border-b-2 border-teal-400'
              : 'text-white/70 hover:text-white/90'
          }`}
          onClick={() => setActiveTab('friends')}
        >
          <Users size={16} className="inline mr-1" />
          Guild Members
          {friends.length > 0 && (
            <span className="ml-2 bg-white/10 rounded-full px-2 py-0.5 text-xs">
              {friends.length}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm flex-1 text-center ${
            activeTab === 'requests'
              ? 'text-teal-400 border-b-2 border-teal-400'
              : 'text-white/70 hover:text-white/90'
          }`}
          onClick={() => setActiveTab('requests')}
        >
          <UserPlus size={16} className="inline mr-1" />
          Requests
          {(pendingRequests.length > 0 || sentRequests.length > 0) && (
            <span className="ml-2 bg-white/10 rounded-full px-2 py-0.5 text-xs">
              {pendingRequests.length + sentRequests.length}
            </span>
          )}
          {pendingRequests.length > 0 && (
            <span className="ml-1 bg-amber-500 rounded-full h-2 w-2 inline-block"></span>
          )}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-white/10 mr-4"></div>
                <div className="flex-1">
                  <div className="h-4 bg-white/10 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="glass-card p-5 text-red-400">
          <p>Error loading friends: {error}</p>
        </div>
      )}

      {/* Friends List */}
      {!loading && !error && activeTab === 'friends' && (
        <div className="space-y-4">
          {friends.length > 0 ? (
            friends.map((friendship) => (
              <FriendCard
                key={friendship.id}
                profile={friendship.friend}
                friendshipId={friendship.id}
                status="accepted"
                onRemove={handleRemoveFriend}
              />
            ))
          ) : (
            <div className="glass-card p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                <Users size={24} className="text-white/50" />
              </div>
              <h3 className="text-xl font-medium mb-2">No friends yet</h3>
              <p className="text-white/70 mb-4">
                Add friends to start assigning tasks and sending rewards.
              </p>
              <button
                onClick={() => setActiveTab('requests')}
                className="btn-secondary"
              >
                View Requests
              </button>
            </div>
          )}
        </div>
      )}

      {/* Requests List */}
      {!loading && !error && activeTab === 'requests' && (
        <div>
          {/* Incoming Requests */}
          {pendingRequests.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-medium mb-3 text-white/90">Incoming Requests</h2>
              <div className="space-y-4">
                {pendingRequests.map((friendship) => (
                  <FriendCard
                    key={friendship.id}
                    profile={friendship.friend}
                    friendshipId={friendship.id}
                    status="pending"
                    isIncoming={true}
                    onAccept={handleAcceptRequest}
                    onReject={handleRejectRequest}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-3 text-white/90">Sent Requests</h2>
              <div className="space-y-4">
                {sentRequests.map((request) => (
                  <FriendCard
                    key={request.id}
                    profile={request.friend}
                    friendshipId={request.id}
                    status="pending"
                    isIncoming={false}
                    onCancelSentRequest={handleRequestCancellationAttempt} // Pass the handler
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {pendingRequests.length === 0 && sentRequests.length === 0 && (
            <div className="glass-card p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                <UserPlus size={24} className="text-white/50" />
              </div>
              <h3 className="text-xl font-medium mb-2">No friend requests</h3>
              <p className="text-white/70 mb-4">
                You don't have any pending friend requests.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setActiveTab('friends')}
                  className="btn-secondary"
                >
                  View Friends
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Cancelling Sent Request */}
      {showCancelModal && (
        <ConfirmDeleteModal
          isOpen={showCancelModal}
          onClose={handleCloseCancelModal}
          onConfirm={handleConfirmCancelRequest}
          title="Cancel Friend Request"
          message="Are you sure you want to cancel this friend request? This action cannot be undone."
          confirmText="Yes, Cancel Request"
          isConfirming={isCancelling} // Corrected prop name
        />
      )}
    </div>
  );
}