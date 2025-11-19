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
// P1: Updated page header title to use theme strings.

import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../hooks/useFriends';
import { usePartnerState } from '../hooks/usePartnerState';
import PullToRefresh from 'react-simple-pull-to-refresh';
import FriendCard from '../components/FriendCard';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { UserPlus, Users, AlertTriangle, Heart, Mail, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Database } from '../types/database';
import { useNavigate } from 'react-router-dom';

type Profile = Database['public']['Tables']['profiles']['Row'];
import { soundManager } from '../utils/soundManager';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { PageBody } from '../components/layout/PageBody';
import { BaseCard } from '../components/ui/BaseCard';

export default function Friends() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // For Couple Mode, use partner state; for other modes, use friends
  const partnerState = usePartnerState(theme.id === 'couple' ? user?.id : undefined);
  const { friends, pendingRequests, sentRequests, loading, error, respondToFriendRequest, removeFriend, cancelSentRequest, refreshFriends } = useFriends(user?.id);
  
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

  // State for cancel sent request confirmation modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [requestToCancelId, setRequestToCancelId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Friend Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    
    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    if (value.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    
    // Debounce search by 300ms
    searchTimeout.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const performSearch = async (searchValue: string) => {
    if (!user) return;
    setIsSearching(true);
    try {
      // Search users by display name
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('display_name', `%${searchValue}%`)
        .neq('id', user.id)
        .limit(5);
        
      if (error) throw error;
      
      // Filter out existing friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
        
      const friendIds = new Set();
      friendships?.forEach(f => {
        if (f.user1_id === user.id) friendIds.add(f.user2_id);
        if (f.user2_id === user.id) friendIds.add(f.user1_id);
      });
      
      const availableUsers = users?.filter(u => !friendIds.has(u.id)) || [];
      setSearchResults(availableUsers);
      setShowDropdown(availableUsers.length > 0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (toUser: Profile) => {
    if (!user) {
      toast.error(t('friends.mustBeLoggedIn'));
      return;
    }
    try {
      // Create new friendship request
      const { error } = await supabase
        .from('friendships')
        .insert({
          user1_id: user.id,
          user2_id: toUser.id,
          status: 'pending',
          requested_by: user.id,
        });

      if (error) throw error;
      
      soundManager.play('friendRequest');
      toast.success(t('friends.requestSent', { name: toUser.display_name }));
      setSearchTerm('');
      setShowDropdown(false);
      setSearchResults([]);
      
      // Refresh friend requests
      if(refreshFriends) {
        await refreshFriends();
      }
    } catch (error) {
        if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
            toast.error(t('friends.requestAlreadyExists'));
        } else {
            toast.error(t('friends.requestFailed'));
            console.error('Error sending friend request:', error);
        }
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    await respondToFriendRequest(friendshipId, true);
    soundManager.play('notification');
    soundManager.play('success');
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

  const handleRefresh = async () => {
    if (theme.id === 'couple' && partnerState.refresh) {
      await partnerState.refresh();
    }
    if (refreshFriends) {
      await refreshFriends();
    }
  };

  // For Couple Mode, show partner-specific UI
  if (theme.id === 'couple') {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <PageContainer>
          <PageHeader 
            title={theme.strings.friendsTitle} 
            subtitle="Connect with your partner to share requests and moments." 
          />

          <PageBody>
            {partnerState.isLoading ? (
              <BaseCard>
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-2 border-t-teal-500 border-white/10 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-body text-white/70">Loading partner status...</p>
                </div>
              </BaseCard>
            ) : partnerState.error ? (
              <BaseCard className="bg-red-900/20 border-red-500/30">
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                  <h3 className="text-subtitle text-white font-semibold mb-2">Error loading partner</h3>
                  <p className="text-body text-white/70 mb-4">{partnerState.error}</p>
                  <button
                    onClick={() => partnerState.refresh()}
                    className="btn-primary flex items-center justify-center gap-2 mx-auto"
                  >
                    Retry
                  </button>
                </div>
              </BaseCard>
            ) : partnerState.state === 'NO_PARTNER' ? (
              <BaseCard>
                <div className="text-center py-12">
                  <Heart size={64} className="mx-auto mb-6 text-teal-400" />
                  <h3 className="text-subtitle text-white/90 mb-2">You haven't connected with a partner yet</h3>
                  <p className="text-body text-white/70 mb-8">
                    Invite your partner to start sharing requests and moments together.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => {
                        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                        if (searchInput) {
                          searchInput.focus();
                        }
                      }}
                      className="btn-primary flex items-center justify-center gap-2"
                    >
                      <UserPlus size={20} />
                      Invite your partner
                    </button>
                    <button
                      onClick={() => navigate('/onboarding')}
                      className="btn-secondary flex items-center justify-center gap-2"
                    >
                      Complete onboarding
                    </button>
                  </div>
                </div>
              </BaseCard>
            ) : partnerState.state === 'INVITE_SENT' ? (
              <BaseCard>
                <div className="text-center py-12">
                  <Mail size={64} className="mx-auto mb-6 text-yellow-400" />
                  <h3 className="text-subtitle text-white/90 mb-2">
                    Invite sent to {partnerState.partnerProfile?.display_name || partnerState.partnerProfile?.email || 'your partner'}
                  </h3>
                  <p className="text-body text-white/70 mb-8">
                    Waiting for them to join and accept your invitation.
                  </p>
                  {partnerState.friendshipId && (
                    <button
                      onClick={() => handleRequestCancellationAttempt(partnerState.friendshipId!)}
                      className="btn-secondary mx-auto"
                    >
                      Cancel invite
                    </button>
                  )}
                </div>
              </BaseCard>
            ) : partnerState.state === 'INVITE_RECEIVED' ? (
              <BaseCard>
                <div className="text-center py-12">
                  <Mail size={64} className="mx-auto mb-6 text-blue-400" />
                  <h3 className="text-subtitle text-white/90 mb-2">
                    {partnerState.partnerProfile?.display_name || 'Someone'} invited you to connect
                  </h3>
                  {partnerState.partnerProfile && (
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <img 
                        src={partnerState.partnerProfile.avatar_url || '/default-avatar.png'} 
                        alt={partnerState.partnerProfile.display_name || 'partner'} 
                        className="w-16 h-16 rounded-full border-2 border-teal-400"
                      />
                      <div className="text-left">
                        <p className="text-subtitle text-white font-semibold">
                          {partnerState.partnerProfile.display_name || partnerState.partnerProfile.email}
                        </p>
                        <p className="text-body text-white/70 text-sm">{partnerState.partnerProfile.email}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {partnerState.friendshipId && (
                      <>
                        <button
                          onClick={() => handleAcceptRequest(partnerState.friendshipId!)}
                          className="btn-primary flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={20} />
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(partnerState.friendshipId!)}
                          className="btn-secondary flex items-center justify-center gap-2"
                        >
                          <XCircle size={20} />
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </BaseCard>
            ) : partnerState.state === 'PARTNERED' && partnerState.partnerProfile ? (
              <BaseCard>
                <div className="text-center py-8">
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <img 
                      src={partnerState.partnerProfile.avatar_url || '/default-avatar.png'} 
                      alt={partnerState.partnerProfile.display_name || 'partner'} 
                      className="w-24 h-24 rounded-full border-4 border-teal-400"
                    />
                    <Heart size={32} className="text-teal-400" />
                    {user && (
                      <img 
                        src={user.user_metadata?.avatar_url || '/default-avatar.png'} 
                        alt={user.email || 'you'} 
                        className="w-24 h-24 rounded-full border-4 border-teal-400"
                      />
                    )}
                  </div>
                  <h3 className="text-subtitle text-white/90 mb-2 font-semibold">
                    {partnerState.partnerProfile.display_name || partnerState.partnerProfile.email}
                  </h3>
                  <p className="text-body text-white/70 mb-8">{partnerState.partnerProfile.email}</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => navigate('/issued')}
                      className="btn-primary flex items-center justify-center gap-2"
                    >
                      Create request
                    </button>
                    <button
                      onClick={() => navigate('/rewards-store')}
                      className="btn-secondary flex items-center justify-center gap-2"
                    >
                      Create gift
                    </button>
                  </div>
                </div>
              </BaseCard>
            ) : null}

            {/* Search/Invite form for Couple Mode - only show if NO_PARTNER or INVITE_SENT */}
            {(partnerState.state === 'NO_PARTNER' || partnerState.state === 'INVITE_SENT') && (
              <div className="relative mb-6 mt-6">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-4 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-emerald-500 focus:outline-none text-white"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>
                
                {/* Dropdown Results */}
                {showDropdown && (
                  <div className="absolute z-dropdown w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {searchResults.map((userResult) => (
                      <button
                        key={userResult.id}
                        onClick={() => sendFriendRequest(userResult)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={userResult.avatar_url || '/default-avatar.png'} 
                            alt={userResult.display_name || 'user avatar'} 
                            className="w-10 h-10 rounded-full"
                          />
                          <span className="font-medium">{userResult.display_name}</span>
                        </div>
                        <UserPlus className="w-5 h-5 text-emerald-500" />
                      </button>
                    ))}
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
                title="Cancel Invite"
                message="Are you sure you want to cancel this invitation?"
                confirmText="Cancel Invite"
                isConfirming={isCancelling}
              />
            )}
          </PageBody>
        </PageContainer>
      </PullToRefresh>
    );
  }

  // For Guild/Family modes, show regular friends UI
  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <PageContainer>
        <PageHeader 
          title={theme.strings.friendsTitle} 
          subtitle={t('friends.description', 'Manage your guild members, send invitations, and review pending requests.')} 
        />

        <PageBody>
          {/* Add Friend Form */}
          <div className="relative mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('friends.searchPlaceholder')}
                className="w-full pl-4 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-emerald-500 focus:outline-none text-white"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
                </div>
              )}
            </div>
            
            {/* Dropdown Results */}
            {showDropdown && (
              <div className="absolute z-dropdown w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {searchResults.map((userResult) => (
                  <button
                    key={userResult.id}
                    onClick={() => sendFriendRequest(userResult)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={userResult.avatar_url || '/default-avatar.png'} 
                        alt={userResult.display_name || 'user avatar'} 
                        className="w-10 h-10 rounded-full"
                      />
                      <span className="font-medium">{userResult.display_name}</span>
                    </div>
                    <UserPlus className="w-5 h-5 text-emerald-500" />
                  </button>
                ))}
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
            {t('friends.tabGuildMembers')}
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
            {t('friends.tabRequests')}
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

        {/* P6: Error State */}
        {error && !loading && (
          <BaseCard className="bg-red-900/20 border-red-500/30">
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-subtitle text-white font-semibold mb-2">Cannot load {theme.strings.friendsTitle.toLowerCase()}</h3>
              <p className="text-body text-white/70 mb-4">{error}</p>
              <button
                onClick={() => refreshFriends?.()}
                className="btn-primary flex items-center justify-center gap-2 mx-auto"
              >
                <Users size={20} />
                Retry
              </button>
            </div>
          </BaseCard>
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
              <BaseCard>
                <div className="text-center py-8">
                  <Users size={48} className="mx-auto mb-4 text-teal-400" />
                  <h3 className="text-subtitle text-white/90 mb-2">{theme.strings.friendsTitle}</h3>
                  <p className="text-body text-white/70 mb-6">
                    {theme.id === 'guild' && 'Invite crew members to share missions and rewards.'}
                    {theme.id === 'family' && 'Invite family members to share chores and rewards.'}
                    {theme.id === 'couple' && 'Invite your partner to share requests and moments.'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => {
                        // Focus the search input
                        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                        if (searchInput) {
                          searchInput.focus();
                        }
                      }}
                      className="btn-primary flex items-center justify-center gap-2"
                    >
                      <UserPlus size={20} />
                      Invite someone
                    </button>
                    {pendingRequests.length > 0 && (
                      <button
                        onClick={() => setActiveTab('requests')}
                        className="btn-secondary"
                      >
                        View requests ({pendingRequests.length})
                      </button>
                    )}
                  </div>
                </div>
              </BaseCard>
            )}
          </div>
        )}

        {/* Requests List */}
        {!loading && !error && activeTab === 'requests' && (
          <div>
            {/* Incoming Requests */}
            {pendingRequests.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3 text-white/90">{t('friends.incomingRequests')}</h2>
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
                <h2 className="text-lg font-medium mb-3 text-white/90">{t('friends.sentRequests')}</h2>
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
                <h3 className="text-xl font-medium mb-2">{t('friends.noRequestsTitle')}</h3>
                <p className="text-white/70 mb-4">
                  {t('friends.noRequestsMessage')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setActiveTab('friends')}
                    className="btn-secondary"
                  >
                    {t('friends.viewFriends')}
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
              title={t('friends.cancelRequestTitle')}
              message={t('friends.cancelRequestMessage')}
              confirmText={t('friends.cancelRequestConfirm')}
              isConfirming={isCancelling}
            />
          )}
        </PageBody>
      </PageContainer>
    </PullToRefresh>
  );
}