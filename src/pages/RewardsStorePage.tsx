// src/pages/RewardsStorePage.tsx
// Displays available bounties and provides an interface for creating new ones.
// P1: Updated page header title to use theme strings.
// P4: Added credits summary, theme-aware labels, and aspirational design.

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useThemeStrings } from '../hooks/useThemeStrings';
import { Plus, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useRewardsStore } from '../hooks/useRewardsStore';
import { usePurchaseBounty } from '../hooks/usePurchaseBounty';
import { useDeleteBounty } from '../hooks/useDeleteBounty';
import { useAuth } from '../hooks/useAuth';
import { useUserCredits } from '../hooks/useUserCredits';
import { useCollectedRewards } from '../hooks/useCollectedRewards';
import RewardCard, { Reward } from '../components/RewardCard';
import CreateBountyModal from '../components/CreateBountyModal';
import EditBountyModal from '../components/EditBountyModal';
import ConfirmDialog from '../components/ConfirmDialog';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { PageBody } from '../components/layout/PageBody';
import { BaseCard } from '../components/ui/BaseCard';
import { Coin } from '../components/visual/Coin';
// R14: CreditDisplay removed - using simplified balance layout with just the number

type Tab = 'available' | 'created' | 'collected';

const RewardsStorePage: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { strings } = useThemeStrings();
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
      return <div className="text-center text-slate-400">{t('rewards.loading')}</div>;
    }

    if (rewardsError) {
      return (
        <BaseCard className="bg-red-900/20 border-red-500/30">
          <div className="text-center py-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-subtitle text-white font-semibold mb-2">Cannot load rewards right now</h3>
            <p className="text-body text-white/70 mb-4">{rewardsError}</p>
            <button
              onClick={() => fetchRewards()}
              className="btn-primary flex items-center justify-center gap-2 mx-auto"
            >
              <ShoppingCart size={20} />
              Retry
            </button>
          </div>
        </BaseCard>
      );
    }

    // Handle collected tab separately (uses different data source)
    if (activeTab === 'collected') {
      if (isLoadingCollected) {
        return (
          <BaseCard className="transition-all duration-200">
            <div className="text-center py-12">
              <div className="w-12 h-12 border-2 border-t-teal-500 border-white/10 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-body text-white/70">Loading collected {strings.rewardPlural}...</p>
            </div>
          </BaseCard>
        );
      }

      if (collectedRewards.length === 0) {
        return (
          <BaseCard className="transition-all duration-200 hover:shadow-lg">
            <div className="text-center py-12">
              <ShoppingCart size={64} className="mx-auto mb-4 text-teal-400/50" />
              <h3 className="text-subtitle text-white/90 mb-2">No collected {strings.rewardPlural} yet</h3>
              <p className="text-body text-white/70 mb-6">
                {theme.id === 'guild' && `Complete ${strings.missionPlural} to earn ${strings.tokenPlural} and claim ${strings.rewardPlural}.`}
                {theme.id === 'family' && `Complete ${strings.missionPlural} to earn ${strings.tokenPlural} and claim ${strings.rewardPlural}.`}
                {theme.id === 'couple' && `Complete ${strings.missionPlural} to earn ${strings.tokenPlural} and claim ${strings.rewardPlural}.`}
              </p>
              <button
                onClick={() => setActiveTab('available')}
                className="btn-primary flex items-center justify-center gap-2 mx-auto min-h-[44px] transition-all duration-200 hover:scale-105"
              >
                <ShoppingCart size={20} />
                Browse {strings.rewardPlural}
              </button>
            </div>
          </BaseCard>
        );
      }

      // R33: Use same grid layout as Available/My Bounties for consistency
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 spacing-grid">
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
        <BaseCard className="transition-all duration-200 hover:shadow-lg">
          <div className="text-center py-12">
            <ShoppingCart size={64} className="mx-auto mb-4 text-teal-400/50" />
            <h3 className="text-subtitle text-white/90 mb-2">{strings.storeEmptyTitle}</h3>
            <p className="text-body text-white/70 mb-6">{strings.storeEmptyBody}</p>
            {user && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="btn-primary flex items-center justify-center gap-2 mx-auto min-h-[44px] transition-all duration-200 hover:scale-105"
              >
                <Plus size={20} />
                {strings.storeCreateFirstButton}
              </button>
            )}
          </div>
        </BaseCard>
      );
    }

    // My Bounties and Available: Grid layout with RewardCards
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 spacing-grid">
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
        {!creditsLoading && (
          <div className="mb-6">
            <BaseCard className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col">
                <span className="text-xs text-white/50 uppercase tracking-wide mb-1">
                  {strings.storeCreditsLabel}
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
                  <span className="text-sm text-white/70 mt-1">
                    {((cheapestUnaffordable.credit_cost || 0) - (userCredits ?? 0))} more to "{cheapestUnaffordable.name}"
                  </span>
                ) : null}
              </div>
              {/* R32: Coin with value is now the primary balance display */}
              <Coin size="xl" variant="subtle-spin" value={userCredits ?? 0} />
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
                  ? 'text-teal-400 border-b-2 border-teal-400' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {t('rewards.tabs.available')}
            </button>
            <button 
              onClick={() => setActiveTab('created')} 
              className={`px-4 py-2 sm:py-3 text-sm sm:text-lg font-medium min-h-[44px] transition-all duration-200 whitespace-nowrap ${
                activeTab === 'created' 
                  ? 'text-teal-400 border-b-2 border-teal-400' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {t('rewards.tabs.created')}
            </button>
            <button 
              onClick={() => setActiveTab('collected')} 
              className={`px-4 py-2 sm:py-3 text-sm sm:text-lg font-medium min-h-[44px] transition-all duration-200 whitespace-nowrap ${
                activeTab === 'collected' 
                  ? 'text-teal-400 border-b-2 border-teal-400' 
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
      <button
        onClick={() => setCreateModalOpen(true)}
        className="fixed z-fab rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-500 bg-teal-500 hover:bg-teal-600 text-white p-4 min-w-[56px] min-h-[56px] flex items-center justify-center bottom-4 right-4 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto"
        aria-label={t('rewards.createBountyButton')}
      >
        <Plus size={24} />
      </button>

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

        <ConfirmDialog
          isOpen={isConfirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
          onConfirm={onConfirmDelete}
          title={t('rewards.confirmDialog.deleteTitle')}
          message={t('rewards.confirmDialog.deleteMessage')}
          isLoading={isDeleting}
        />
      </PageContainer>
    </PullToRefresh>
  );
};

export default RewardsStorePage;
