// src/pages/RewardsStorePage.tsx
// Displays available bounties and provides an interface for creating new ones.
// P1: Updated page header title to use theme strings.
// P4: Added credits summary, theme-aware labels, and aspirational design.

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeStrings } from '../hooks/useThemeStrings';
import { Plus, ShoppingCart } from 'lucide-react';
import { useRewardsStore } from '../hooks/useRewardsStore';
import { usePurchaseBounty } from '../hooks/usePurchaseBounty';
import { useDeleteBounty } from '../hooks/useDeleteBounty';
import { useAuth } from '../hooks/useAuth';
import { useUserCredits } from '../hooks/useUserCredits';
import { useCollectedRewards } from '../hooks/useCollectedRewards';
import RewardCard, { Reward } from '../components/RewardCard';
import CreateBountyModal from '../components/CreateBountyModal';
import EditBountyModal from '../components/EditBountyModal';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { PageBody } from '../components/layout/PageBody';
import { BaseCard } from '../components/ui/BaseCard';
import { AppButton, EmptyState, PageState, Fab, ConfirmModal } from '../components/ui';
import { useUI } from '../context/UIContext';
import { Coin } from '../components/visual/Coin';
// R14: CreditDisplay removed - using simplified balance layout with just the number

type Tab = 'available' | 'created' | 'collected';

const RewardsStorePage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { strings } = useThemeStrings();
  const { isMobileMenuOpen } = useUI();
  const { user } = useAuth();
  const { rewards, isLoadingRewards, rewardsError, fetchRewards } = useRewardsStore();
  const { purchaseBounty, isLoading: isPurchasing } = usePurchaseBounty();
  const { deleteBounty, isLoading: isDeleting } = useDeleteBounty();
  const { credits: userCredits, loading: creditsLoading, refetch: refetchCredits } = useUserCredits();
  const { collectedRewards, isLoading: isLoadingCollected, fetchCollectedRewards } = useCollectedRewards();

  // State for modals
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  const [selectedBounty, setSelectedBounty] = useState<Reward | null>(null);
  const [bountyToDelete, setBountyToDelete] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('available');

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab === 'available' || requestedTab === 'created' || requestedTab === 'collected') {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchRewards();
    fetchCollectedRewards(); // Always fetch so we can exclude from Available
  }, [fetchRewards, fetchCollectedRewards]);

  // Set of already-collected reward IDs to exclude from Available
  const collectedRewardIds = useMemo(() => {
    return new Set(collectedRewards.map(r => r.id));
  }, [collectedRewards]);

  // P4: Calculate affordable rewards and distance to next reward
  const { affordableCount, cheapestUnaffordable } = useMemo(() => {
    const currentCredits = userCredits ?? 0;
    const availableRewards = rewards.filter(reward => {
      if (activeTab === 'available') {
        // Assigned to me AND not already collected
        return reward.assigned_to === user?.id && !collectedRewardIds.has(reward.id);
      }
      if (activeTab === 'created') {
        return reward.creator_id === user?.id;
      }
      return false;
    });

    const affordable = availableRewards.filter(r => (r.credit_cost || 0) <= currentCredits);
    const unaffordable = availableRewards.filter(r => (r.credit_cost || 0) > currentCredits);
    const cheapest = unaffordable.length > 0
      ? unaffordable.reduce((min, r) => (r.credit_cost || 0) < (min.credit_cost || 0) ? r : min, unaffordable[0])
      : null;

    return {
      affordableCount: affordable.length,
      cheapestUnaffordable: cheapest,
    };
  }, [rewards, userCredits, activeTab, user?.id, collectedRewardIds]);

  const handleRefresh = async () => {
    await fetchRewards();
    refetchCredits(); // R29: Always refresh credits on pull-to-refresh
    await fetchCollectedRewards(); // Always fetch to update exclusion filter
  };

  const handleClaim = async (rewardId: string) => {
    if (isPurchasing) return;

    const result = await purchaseBounty(rewardId);

    if (result?.success) {
      // R29: Refetch all affected data after successful claim
      fetchRewards();        // Remove from available list
      refetchCredits();      // Update balance display
      fetchCollectedRewards(); // Update collected tab
    }
  };

  const handleEdit = (reward: Reward) => {
    setSelectedBounty(reward);
    setEditModalOpen(true);
  };

  const handleDelete = (rewardId: string) => {
    setBountyToDelete(rewardId);
    setConfirmDialogOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!bountyToDelete) return;
    const result = await deleteBounty(bountyToDelete);
    if (result.success) {
      fetchRewards();
    }
    setConfirmDialogOpen(false);
    setBountyToDelete(null);
  };

  const onEditSuccess = () => {
    fetchRewards();
  };

  const renderContent = () => {
    if (isLoadingRewards) {
      return <PageState state="loading" message={t('rewards.loading')} />;
    }

    if (rewardsError) {
      return <PageState state="error" message={rewardsError} onRetry={() => fetchRewards()} />;
    }

    // Handle collected tab separately (uses different data source)
    if (activeTab === 'collected') {
      if (isLoadingCollected) {
        return <PageState state="loading" message={`Loading collected ${strings.rewardPlural}...`} />;
      }

      if (collectedRewards.length === 0) {
        return (
          <EmptyState
            icon={<ShoppingCart />}
            title={`No collected ${strings.rewardPlural} yet`}
            body={`Complete ${strings.missionPlural} to earn ${strings.tokenPlural} and claim ${strings.rewardPlural}.`}
          >
            <AppButton
              variant="cta"
              icon={<ShoppingCart size={20} />}
              onClick={() => setActiveTab('available')}
            >
              Browse {strings.rewardPlural}
            </AppButton>
          </EmptyState>
        );
      }

      // R33: Use same grid layout as Available/My Bounties for consistency
      return (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 spacing-grid">
          {collectedRewards.map((reward) => (
            <RewardCard
              key={reward.collection_id}
              reward={reward as Reward}
              view="collected"
              collectedAt={reward.collected_at}
            />
          ))}
        </div>
      );
    }

    // Handle available and created tabs (use rewards from rewards_store)
    const filteredRewards = rewards.filter(reward => {
      if (activeTab === 'available') {
        // Bounties assigned to me, still active, and not already collected
        return reward.assigned_to === user?.id && reward.is_active !== false && !collectedRewardIds.has(reward.id);
      }
      if (activeTab === 'created') {
        // Only active bounties I created (redeemed ones are hidden)
        return reward.creator_id === user?.id && reward.is_active !== false;
      }
      return false;
    });

    if (filteredRewards.length === 0) {
      return (
        <EmptyState
          icon={<ShoppingCart />}
          title={strings.storeEmptyTitle}
          body={strings.storeEmptyBody}
        >
          {user && (
            <AppButton
              variant="cta"
              icon={<Plus size={20} />}
              onClick={() => setCreateModalOpen(true)}
            >
              {strings.storeCreateFirstButton}
            </AppButton>
          )}
        </EmptyState>
      );
    }

    // My Bounties and Available: Grid layout with RewardCards
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 spacing-grid">
        {filteredRewards.map(reward => (
          <RewardCard
            key={reward.id}
            reward={reward}
            view={activeTab}
            onAction={handleClaim}
            onEdit={handleEdit}
            onDelete={handleDelete}
            currentCredits={userCredits ?? 0}
          />
        ))}
      </div>
    );
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <PageContainer>
        <PageHeader 
          title={strings.storeTitle} 
          subtitle={strings.storeSubtitle}
        />

        {/* R32: Balance Card - coin with value is the focal point */}
        {/* V1: Vault hero - gold accent ring + subtle gradient make the balance aspirational */}
        {!creditsLoading && (
          <div className="mb-6">
            <BaseCard
              className="relative overflow-hidden border-yellow-500/30 px-4 py-4 sm:px-6 sm:py-5"
              style={{
                background:
                  'linear-gradient(135deg, rgba(245,215,110,0.08) 0%, rgba(245,215,110,0) 55%)',
                boxShadow: 'inset 0 1px 0 0 rgba(245,215,110,0.25)',
              }}
            >
              {/* Gold top accent line */}
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(245,215,110,0) 0%, rgba(245,215,110,0.7) 50%, rgba(245,215,110,0) 100%)',
                }}
              />
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-white/50 uppercase tracking-wide mb-1">
                    {strings.storeCreditsLabel}
                  </span>
                  {/* V1: Gold shimmering balance number is the currency identity */}
                  <span className="text-display font-bold leading-none animate-shimmer-credit">
                    {userCredits ?? 0}
                  </span>
                  {/* R32: Contextual hint about balance - only show affordability hints on Available tab */}
                  {(userCredits ?? 0) === 0 ? (
                    <span className="text-sm text-white/70 mt-1">
                      Complete {strings.missionPlural} to earn {strings.tokenPlural}
                    </span>
                  ) : activeTab === 'available' && affordableCount > 0 ? (
                    <span className="text-sm text-teal-400/80 mt-1">
                      {strings.storeCanAffordLabel} {affordableCount} {affordableCount === 1 ? strings.rewardSingular : strings.rewardPlural}
                    </span>
                  ) : activeTab === 'available' && cheapestUnaffordable ? (
                    <>
                      <span className="text-sm text-white/70 mt-1">
                        {((cheapestUnaffordable.credit_cost || 0) - (userCredits ?? 0))} more to "{cheapestUnaffordable.name}"
                      </span>
                      {/* V1: Progress-to-next-reward bar (gold fill, clamped 0-100%) */}
                      <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-yellow-400 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, ((userCredits ?? 0) / (cheapestUnaffordable.credit_cost || 1)) * 100))}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
                {/* R32: Coin with value is now the primary balance display */}
                <Coin size="xl" variant="subtle-spin" value={userCredits ?? 0} />
              </div>
            </BaseCard>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 sm:mb-8 flex justify-center border-b border-gray-700 overflow-x-auto px-2">
          <div className="flex gap-0 sm:gap-2">
            <button 
              onClick={() => setActiveTab('available')} 
              className={`px-4 py-2 sm:py-3 text-sm sm:text-lg font-medium min-h-[44px] transition-all duration-200 whitespace-nowrap ${
                activeTab === 'available' 
                  ? 'text-[var(--mode-accent)] border-b-2 border-[var(--mode-accent)]'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {t('rewards.tabs.available')}
            </button>
            <button 
              onClick={() => setActiveTab('created')} 
              className={`px-4 py-2 sm:py-3 text-sm sm:text-lg font-medium min-h-[44px] transition-all duration-200 whitespace-nowrap ${
                activeTab === 'created' 
                  ? 'text-[var(--mode-accent)] border-b-2 border-[var(--mode-accent)]'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {t('rewards.tabs.created')}
            </button>
            <button 
              onClick={() => setActiveTab('collected')} 
              className={`px-4 py-2 sm:py-3 text-sm sm:text-lg font-medium min-h-[44px] transition-all duration-200 whitespace-nowrap ${
                activeTab === 'collected' 
                  ? 'text-[var(--mode-accent)] border-b-2 border-[var(--mode-accent)]'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {t('rewards.tabs.collected')}
            </button>
          </div>
        </div>

        <PageBody>
          {renderContent()}
        </PageBody>

      {/* R14: FAB - mobile: bottom-right, desktop: centered bottom */}
      {!isMobileMenuOpen && (
        <Fab
          onClick={() => setCreateModalOpen(true)}
          label={t('rewards.createBountyButton')}
          icon={<Plus size={24} />}
        />
      )}

      <CreateBountyModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        onSuccess={() => {
          setCreateModalOpen(false);
          fetchRewards();
          setActiveTab('created'); // Switch to the 'My Bounties' tab
        }}
      />

      <EditBountyModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={onEditSuccess}
        bounty={selectedBounty}
      />

        <ConfirmModal
          isOpen={isConfirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
          onConfirm={onConfirmDelete}
          title={t('rewards.confirmDialog.deleteTitle')}
          message={t('rewards.confirmDialog.deleteMessage')}
          variant="danger"
          loading={isDeleting}
          confirmLabel={t('rewards.confirmDialog.confirmButton')}
          cancelLabel={t('rewards.confirmDialog.cancelButton')}
          loadingLabel={t('rewards.confirmDialog.deletingButton')}
        />
      </PageContainer>
    </PullToRefresh>
  );
};

export default RewardsStorePage;
