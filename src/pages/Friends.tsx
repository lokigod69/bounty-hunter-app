import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../hooks/useFriends';
import { useInvite } from '../hooks/useInvite';
import PullToRefresh from 'react-simple-pull-to-refresh';
import FriendCard from '../components/FriendCard';
import { UserPlus, Users, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
import { feedback } from '../utils/feedback';
import { useTranslation } from 'react-i18next';
import { useThemeStrings } from '../hooks/useThemeStrings';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { PageBody } from '../components/layout/PageBody';
import { AppButton, EmptyState, PageState, ConfirmModal, SectionHeader, Spinner, TabBar } from '../components/ui';
import { avatarFallback } from '../lib/avatar';
import emptyFriends from '../assets/generated/empty-friends.webp';

// Shared loading skeleton for friend lists (used while profile or friends load)
function FriendListSkeleton() {
  return (
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
  );
}

export default function Friends() {
  const { t } = useTranslation();
  const { strings } = useThemeStrings();
  const { user, profile, profileLoading } = useAuth();

  const userIdForFriends = profile ? user?.id : undefined;

  // Wait for profile bootstrap before loading connections.
  // R10: Only call useFriends when profile is loaded to avoid subscribe issues
  const { friends, pendingRequests, sentRequests, loading, error, respondToFriendRequest, removeFriend, cancelSentRequest, refreshFriends } = useFriends(
    userIdForFriends
  );

  const hasFriendshipData = friends.length > 0 || pendingRequests.length > 0 || sentRequests.length > 0;
  const initialFriendsLoading = loading && !hasFriendshipData;

  // Phase 2.5: shareable invite link (works for people without an account yet)
  const { shareInviteLink } = useInvite();
  const [isSharingInvite, setIsSharingInvite] = useState(false);
  const handleShareInvite = async () => {
    setIsSharingInvite(true);
    try {
      await shareInviteLink();
    } finally {
      setIsSharingInvite(false);
    }
  };

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
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchEpoch = useRef(0);
  const [searchDone, setSearchDone] = useState(false);
  useEffect(() => () => { searchEpoch.current++; if (searchTimeout.current) clearTimeout(searchTimeout.current); }, []);

  // Debounced search function
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    searchEpoch.current++;
    setSearchDone(false);
    setIsSearching(false);
    setSearchResults([]);
    setShowDropdown(false);
    
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
      performSearch(value, searchEpoch.current);
    }, 300);
  };

  const performSearch = async (searchValue: string, epoch: number) => {
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
      
      if (epoch !== searchEpoch.current) return;
      const availableUsers = users?.filter(u => !friendIds.has(u.id)) || [];
      setSearchDone(true);
      setSearchResults(availableUsers);
      setShowDropdown(availableUsers.length > 0);
    } catch {
      if (epoch === searchEpoch.current) toast.error(t('friends.requestFailed'));
    } finally {
      if (epoch === searchEpoch.current) setIsSearching(false);
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
      
      feedback.success('friendRequest');
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
    if (await respondToFriendRequest(friendshipId, true)) feedback.success();
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
    if (refreshFriends) {
      await refreshFriends();
    }
  };

  // R10: Show loading skeleton while profile loads
  if (profileLoading) {
    return (
      <PageContainer>
        <PageHeader title={strings.friendsTitle} />
        <PageBody>
          <FriendListSkeleton />
        </PageBody>
      </PageContainer>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <PageContainer>
        <PageHeader
          title={strings.friendsTitle}
          subtitle={strings.friendsSubtitle}
        />

        <PageBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AppButton variant="cta" icon={<Share2 size={18} />} loading={isSharingInvite} onClick={handleShareInvite}>{t('invite.inviteSomeone')}</AppButton>
          </div>
          <details className="optional-details">
            <summary>{t('workflow.findExisting')}</summary>
          {/* Add Friend Form */}
          <div className="relative mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                aria-label={t('friends.searchPlaceholder')}
                placeholder={t('friends.searchPlaceholder')}
                className="w-full pl-4 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-emerald-500 focus:outline-none text-white"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
            
            {searchDone && searchResults.length === 0 && <p role="status" className="mt-2 text-sm text-white/60">{t('workflow.noSearchResults')}</p>}
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
                        src={userResult.avatar_url || avatarFallback(userResult.email)}
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

          </details>

          {/* Tabs */}
          <TabBar
            tabs={[
              {
                id: 'friends',
                label: strings.friendsTabLabel,
                icon: <Users size={16} />,
                count: friends.length,
              },
              {
                id: 'requests',
                label: t('friends.tabRequests'),
                icon: <UserPlus size={16} />,
                count: pendingRequests.length + sentRequests.length,
                showDot: pendingRequests.length > 0,
              },
            ]}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as 'friends' | 'requests')}
            fullWidth
            className="mb-6"
            aria-label={t('friends.tabsLabel')}
          />

        {/* Loading State */}
        {initialFriendsLoading && <FriendListSkeleton />}

        {/* P6: Error State */}
        {error && !initialFriendsLoading && (
          <PageState state="error" message={error} onRetry={() => refreshFriends?.()} />
        )}

        {/* Friends List */}
        {!initialFriendsLoading && !error && activeTab === 'friends' && (
          <section className="space-y-4">
            {friends.length > 0 ? (
              <>
                <div className="space-y-3">
                  {friends.map((friendship) => (
                    <FriendCard
                      key={friendship.id}
                      profile={friendship.friend}
                      friendshipId={friendship.id}
                      status="accepted"
                      onRemove={handleRemoveFriend}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                illustration={emptyFriends}
                title={strings.friendsTitle}
                body={t('workflow.peopleEmpty')}
              >
                {pendingRequests.length > 0 && (
                  <AppButton variant="secondary" onClick={() => setActiveTab('requests')}>
                    {t('invite.viewRequests', { count: pendingRequests.length })}
                  </AppButton>
                )}
              </EmptyState>
            )}
          </section>
        )}

        {/* Requests List */}
        {!initialFriendsLoading && !error && activeTab === 'requests' && (
          <section className="space-y-6">
            {/* Incoming Requests */}
            {pendingRequests.length > 0 && (
              <div>
                <SectionHeader title={t('friends.incomingRequests')} count={pendingRequests.length} className="mb-4" />
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
                <SectionHeader title={t('friends.sentRequests')} count={sentRequests.length} className="mb-4" />
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
              <EmptyState
                icon={<UserPlus />}
                title={t('friends.noRequestsTitle')}
                body={t('friends.noRequestsMessage')}
              >
                <AppButton variant="secondary" onClick={() => setActiveTab('friends')}>
                  {t('friends.viewFriends')}
                </AppButton>
              </EmptyState>
            )}
          </section>
        )}

          {/* Confirmation Modal for Cancelling Sent Request */}
          {showCancelModal && (
            <ConfirmModal
              isOpen={showCancelModal}
              onClose={handleCloseCancelModal}
              onConfirm={handleConfirmCancelRequest}
              title={t('friends.cancelRequestTitle')}
              message={t('friends.cancelRequestMessage')}
              variant="danger"
              confirmLabel={t('friends.cancelRequestConfirm')}
              loadingLabel={t('friends.cancelRequestLoading')}
              loading={isCancelling}
            />
          )}
        </PageBody>
      </PageContainer>
    </PullToRefresh>
  );
}
