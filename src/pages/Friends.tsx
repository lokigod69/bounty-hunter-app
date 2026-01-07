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

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../hooks/useFriends';
import { usePartnerState } from '../hooks/usePartnerState';
import PullToRefresh from 'react-simple-pull-to-refresh';
import FriendCard from '../components/FriendCard';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { UserPlus, Users, AlertTriangle, Heart, Mail, CheckCircle, XCircle, UserCheck } from 'lucide-react';
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
  // R10: Use profileLoading to show skeleton while profile loads
  // R25: Added setPartner for couple mode partner selection
  const { user, profile, profileLoading, setPartner } = useAuth();
  const navigate = useNavigate();

  const userIdForFriends = profile ? user?.id : undefined;

  // For Couple Mode, use partner state; for other modes, use friends
  const partnerState = usePartnerState(theme.id === 'couple' ? user?.id : undefined);
  // R10: Only call useFriends when profile is loaded to avoid subscribe issues
  const { friends, pendingRequests, sentRequests, loading, error, respondToFriendRequest, removeFriend, cancelSentRequest, refreshFriends } = useFriends(
    userIdForFriends
  );

  // R25: Get accepted friends list
  const acceptedFriends = useMemo(() =>
    friends.filter(f => f.status === 'accepted'),
    [friends]
  );

  // R25: Compute partner profile from profile.partner_user_id
  const selectedPartnerProfile = useMemo(() => {
    if (!profile?.partner_user_id) return null;
    const partnerFriend = acceptedFriends.find(f => f.friend?.id === profile.partner_user_id);
    return partnerFriend?.friend || null;
  }, [profile?.partner_user_id, acceptedFriends]);

  // R25: Auto-clear partner_user_id if partner is no longer in friends list
  useEffect(() => {
    if (!profile?.partner_user_id || loading) return;

    // Only run when friends have loaded
    if (friends.length === 0 && loading) return;

    const isPartnerStillFriend = acceptedFriends.some(f => f.friend?.id === profile.partner_user_id);
    if (!isPartnerStillFriend && acceptedFriends.length > 0) {
      setPartner(null);
    }
  }, [profile?.partner_user_id, acceptedFriends, loading, setPartner, friends.length]);

  // R25: Handle partner selection
  const handleSelectPartner = async (friendId: string) => {
    await setPartner(friendId);
  };

  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

  // Unified identity values for current user with cache-busting
  const myDisplayName =
    profile?.display_name ??
    user?.email?.split('@')[0] ??
    'You';

  // R15: RENDERING FALLBACKS - These are for DISPLAY ONLY, never written to DB
  // myAvatarUrlBase: The actual DB value (null if user hasn't set one)
  // myAvatarUrl: For rendering - uses placeholder when DB value is null
  const myAvatarUrlBase = profile?.avatar_url ?? null; // DB VALUE - may be null
  const myProfileUpdatedAt = (profile as { updated_at?: string | null } | null | undefined)?.updated_at;
  const myAvatarCacheBuster = myProfileUpdatedAt ? `?v=${encodeURIComponent(myProfileUpdatedAt)}` : '';
  const myAvatarUrl = myAvatarUrlBase
    ? `${myAvatarUrlBase}${myAvatarCacheBuster}`
    : `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(user?.email || 'user')}`; // RENDER FALLBACK ONLY

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
    } catch {
      void 0;
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

  // R10: Show loading skeleton while profile loads
  if (profileLoading) {
    return (
      <PageContainer>
        <PageHeader title={theme.strings.friendsTitle} />
        <PageBody>
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
        </PageBody>
      </PageContainer>
    );
  }

  // R25: For Couple Mode, show partner based on profile.partner_user_id
  if (theme.id === 'couple') {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <PageContainer>
          <PageHeader
            title={theme.strings.friendsTitle}
            subtitle={theme.strings.friendsSubtitle}
          />

          <PageBody>
            {/* Loading state */}
            {(loading || partnerState.isLoading) ? (
              <BaseCard>
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-2 border-t-teal-500 border-white/10 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-body text-white/70">Loading...</p>
                </div>
              </BaseCard>
            ) : error ? (
              <BaseCard className="bg-red-900/20 border-red-500/30">
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                  <h3 className="text-subtitle text-white font-semibold mb-2">Error loading</h3>
                  <p className="text-body text-white/70 mb-4">{error}</p>
                  <button
                    onClick={() => refreshFriends?.()}
                    className="btn-primary flex items-center justify-center gap-2 mx-auto"
                  >
                    Retry
                  </button>
                </div>
              </BaseCard>
            ) : selectedPartnerProfile ? (
              /* R25: Partner is selected - show partner card */
              <BaseCard>
                <div className="text-center py-8">
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <img
                      src={selectedPartnerProfile.avatar_url || `https://avatar.iran.liara.run/public/girl?username=${encodeURIComponent(selectedPartnerProfile.email || 'partner')}`}
                      alt={selectedPartnerProfile.display_name || 'partner'}
                      className="w-24 h-24 rounded-full border-4 border-teal-400"
                    />
                    <Heart size={32} className="text-teal-400" />
                    {user && (
                      <img
                        src={myAvatarUrl}
                        alt={myDisplayName}
                        className="w-24 h-24 rounded-full border-4 border-teal-400"
                      />
                    )}
                  </div>
                  <h3 className="text-subtitle text-white/90 mb-2 font-semibold">
                    {selectedPartnerProfile.display_name || selectedPartnerProfile.email}
                  </h3>
                  <p className="text-body text-white/70 mb-6">{selectedPartnerProfile.email}</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
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
                  <button
                    onClick={() => setPartner(null)}
                    className="text-sm text-white/50 hover:text-white/70 transition"
                  >
                    Change partner
                  </button>
                </div>
              </BaseCard>
            ) : acceptedFriends.length > 0 ? (
              /* R25: No partner selected, but have friends - show picker */
              <BaseCard>
                <div className="text-center py-8">
                  <Heart size={64} className="mx-auto mb-6 text-teal-400" />
                  <h3 className="text-subtitle text-white/90 mb-2">Select your partner</h3>
                  <p className="text-body text-white/70 mb-6">
                    Choose who you want to share requests and gifts with.
                  </p>
                  <div className="space-y-2 max-w-sm mx-auto">
                    {acceptedFriends.map(({ friend }) => {
                      if (!friend) return null;
                      return (
                        <button
                          key={friend.id}
                          onClick={() => handleSelectPartner(friend.id)}
                          className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-between transition"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={friend.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(friend.email || 'user')}`}
                              alt={friend.display_name || 'user'}
                              className="w-10 h-10 rounded-full"
                            />
                            <span className="font-medium">{friend.display_name}</span>
                          </div>
                          <UserCheck size={20} className="text-teal-400" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </BaseCard>
            ) : partnerState.state === 'INVITE_SENT' ? (
              /* Pending invite sent */
              <BaseCard>
                <div className="text-center py-12">
                  <Mail size={64} className="mx-auto mb-6 text-yellow-400" />
                  <h3 className="text-subtitle text-white/90 mb-2">
                    Invite sent to {partnerState.partnerProfile?.display_name || partnerState.partnerProfile?.email || 'your partner'}
                  </h3>
                  <p className="text-body text-white/70 mb-8">
                    Waiting for them to accept your invitation.
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
              /* Pending invite received */
              <BaseCard>
                <div className="text-center py-12">
                  <Mail size={64} className="mx-auto mb-6 text-blue-400" />
                  <h3 className="text-subtitle text-white/90 mb-2">
                    {partnerState.partnerProfile?.display_name || 'Someone'} invited you to connect
                  </h3>
                  {partnerState.partnerProfile && (
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <img
                        src={partnerState.partnerProfile.avatar_url || `https://avatar.iran.liara.run/public/girl?username=${encodeURIComponent(partnerState.partnerProfile.email || 'partner')}`}
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
            ) : (
              /* No friends at all - show invite UI */
              <BaseCard>
                <div className="text-center py-12">
                  <Heart size={64} className="mx-auto mb-6 text-teal-400" />
                  <h3 className="text-subtitle text-white/90 mb-2">Invite your partner</h3>
                  <p className="text-body text-white/70 mb-8">
                    Search for your partner to start sharing requests and moments together.
                  </p>
                </div>
              </BaseCard>
            )}

            {/* Search/Invite form for Couple Mode - show when no accepted friends */}
            {acceptedFriends.length === 0 && !selectedPartnerProfile && (
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
                            src={userResult.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(userResult.email || 'user')}`}
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
          subtitle={theme.strings.friendsSubtitle}
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
                        src={userResult.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(userResult.email || 'user')}`}
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
          <div className="flex border-b border-white/10 mb-6 overflow-x-auto">
            <div className="flex gap-1 sm:gap-0 w-full">
              <button
                className={`px-4 py-2 sm:py-3 font-medium text-sm sm:text-base flex-1 text-center min-h-[44px] transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'friends'
                    ? 'text-teal-400 border-b-2 border-teal-400'
                    : 'text-white/70 hover:text-white/90'
                }`}
                onClick={() => setActiveTab('friends')}
              >
                <Users size={16} className="inline mr-1" />
                {theme.strings.friendsTabLabel}
                {friends.length > 0 && (
                  <span className="ml-2 bg-white/10 rounded-full px-2 py-0.5 text-xs">
                    {friends.length}
                  </span>
                )}
              </button>
              <button
                className={`px-4 py-2 sm:py-3 font-medium text-sm sm:text-base flex-1 text-center min-h-[44px] transition-all duration-200 whitespace-nowrap relative ${
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
                  <span className="ml-1 bg-amber-500 rounded-full h-2 w-2 inline-block absolute top-2 right-2 sm:top-3 sm:right-3"></span>
                )}
              </button>
            </div>
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
          <section className="space-y-4">
            {friends.length > 0 ? (
              <>
                <h2 className="text-subtitle text-white font-semibold mb-4">
                  {theme.id === 'guild' && 'Your Crew'}
                  {theme.id === 'family' && 'Your Family'}
                </h2>
                <div className="space-y-3">
                  {friends.map((friendship) => (
                    <FriendCard
                      key={friendship.id}
                      profile={friendship.friend}
                      friendshipId={friendship.id}
                      status="accepted"
                      isPartner={profile?.partner_user_id === friendship.friend?.id}  // R25
                      onRemove={handleRemoveFriend}
                      onSetPartner={handleSelectPartner}  // R25
                    />
                  ))}
                </div>
              </>
            ) : (
              <BaseCard className="transition-all duration-200 hover:shadow-lg">
                <div className="text-center py-8">
                  <Users size={48} className="mx-auto mb-4 text-teal-400" />
                  <h3 className="text-subtitle text-white/90 mb-2">{theme.strings.friendsTitle}</h3>
                  <p className="text-body text-white/70 mb-6">
                    {theme.id === 'guild' && 'Invite crew members to share missions and rewards.'}
                    {theme.id === 'family' && 'Invite family members to share chores and rewards.'}
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
                      className="btn-primary flex items-center justify-center gap-2 min-h-[44px] transition-all duration-200 hover:scale-105"
                    >
                      <UserPlus size={20} />
                      Invite someone
                    </button>
                    {pendingRequests.length > 0 && (
                      <button
                        onClick={() => setActiveTab('requests')}
                        className="btn-secondary min-h-[44px] transition-all duration-200 hover:scale-105"
                      >
                        View requests ({pendingRequests.length})
                      </button>
                    )}
                  </div>
                </div>
              </BaseCard>
            )}
          </section>
        )}

        {/* Requests List */}
        {!loading && !error && activeTab === 'requests' && (
          <section className="space-y-6">
            {/* Incoming Requests */}
            {pendingRequests.length > 0 && (
              <div>
                <h2 className="text-subtitle text-white font-semibold mb-4">{t('friends.incomingRequests')}</h2>
                <div className="space-y-3">
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
                <h2 className="text-subtitle text-white font-semibold mb-4">{t('friends.sentRequests')}</h2>
                <div className="space-y-3">
                  {sentRequests.map((request) => (
                    <FriendCard
                      key={request.id}
                      profile={request.friend}
                      friendshipId={request.id}
                      status="pending"
                      isIncoming={false}
                      onCancelSentRequest={handleRequestCancellationAttempt}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {pendingRequests.length === 0 && sentRequests.length === 0 && (
              <BaseCard className="transition-all duration-200">
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                    <UserPlus size={24} className="text-white/50" />
                  </div>
                  <h3 className="text-subtitle text-white/90 mb-2">{t('friends.noRequestsTitle')}</h3>
                  <p className="text-body text-white/70 mb-6">
                    {t('friends.noRequestsMessage')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setActiveTab('friends')}
                      className="btn-secondary min-h-[44px] transition-all duration-200 hover:scale-105"
                    >
                      {t('friends.viewFriends')}
                    </button>
                  </div>
                </div>
              </BaseCard>
            )}
          </section>
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