// src/pages/RewardsStorePage.tsx
// Displays available bounties and provides an interface for creating new ones.
// P1: Updated page header title to use theme strings.
// P4: Added credits summary, theme-aware labels, and aspirational design.

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
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
import { StatsRow } from '../components/layout/StatsRow';
import { BaseCard } from '../components/ui/BaseCard';
// R14: CreditDisplay removed - using simplified balance layout with just the number

type Tab = 'available' | 'created' | 'collected';

const RewardsStorePage: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { rewards, isLoadingRewards, rewardsError, fetchRewards } = useRewardsStore();
  const { purchaseBounty, isLoading: isPurchasing } = usePurchaseBounty();
  const { deleteBounty, isLoading: isDeleting } = useDeleteBounty();
  const { credits: userCredits, loading: creditsLoading } = useUserCredits();
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
  }, [fetchRewards]);

  useEffect(() => {
    if (activeTab === 'collected') {
      fetchCollectedRewards();
    }
  }, [activeTab, fetchCollectedRewards]);

  // P4: Calculate affordable rewards and distance to next reward
  const { affordableCount, cheapestUnaffordable } = useMemo(() => {
    const currentCredits = userCredits ?? 0;
    const availableRewards = rewards.filter(reward => {
      if (activeTab === 'available') {
        return reward.assigned_to === user?.id;
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
  }, [rewards, userCredits, activeTab, user?.id]);

  const handleRefresh = async () => {
    await fetchRewards();
    if (activeTab === 'collected') {
      await fetchCollectedRewards();
    }
  };

  const handleClaim = async (rewardId: string) => {
    if (isPurchasing) return;

    const result = await purchaseBounty(rewardId);

    if (result?.success) {
      // Refetch to update the UI
      fetchRewards();
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
              <p className="text-body text-white/70">Loading collected {theme.strings.rewardPlural}...</p>
            </div>
          </BaseCard>
        );
      }

      if (collectedRewards.length === 0) {
        return (
          <BaseCard className="transition-all duration-200 hover:shadow-lg">
            <div className="text-center py-12">
              <ShoppingCart size={64} className="mx-auto mb-4 text-teal-400/50" />
              <h3 className="text-subtitle text-white/90 mb-2">No collected {theme.strings.rewardPlural} yet</h3>
              <p className="text-body text-white/70 mb-6">
                {theme.id === 'guild' && `Complete ${theme.strings.missionPlural} to earn ${theme.strings.tokenPlural} and claim ${theme.strings.rewardPlural}.`}
                {theme.id === 'family' && `Complete ${theme.strings.missionPlural} to earn ${theme.strings.tokenPlural} and claim ${theme.strings.rewardPlural}.`}
                {theme.id === 'couple' && `Complete ${theme.strings.missionPlural} to earn ${theme.strings.tokenPlural} and claim ${theme.strings.rewardPlural}.`}
              </p>
              <button
                onClick={() => setActiveTab('available')}
                className="btn-primary flex items-center justify-center gap-2 mx-auto min-h-[44px] transition-all duration-200 hover:scale-105"
              >
                <ShoppingCart size={20} />
                Browse {theme.strings.rewardPlural}
              </button>
            </div>
          </BaseCard>
        );
      }

      return (
        <div className="space-y-4">
          {collectedRewards.map((reward) => (
            <BaseCard key={reward.collection_id} className="transition-all duration-200 hover:shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-subtitle text-white font-semibold mb-1">{reward.name}</h3>
                  {reward.description && (
                    <p className="text-body text-white/70 mb-2 line-clamp-2">{reward.description}</p>
                  )}
                  <p className="text-meta text-white/60">
                    Collected {new Date(reward.collected_at).toLocaleDateString(undefined, { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {reward.image_url && (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={reward.image_url} 
                      alt={reward.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </BaseCard>
          ))}
        </div>
      );
    }

    // Handle available and created tabs (use rewards from rewards_store)
    const filteredRewards = rewards.filter(reward => {
      if (activeTab === 'available') {
        // Bounties assigned to the current user by others
        return reward.assigned_to === user?.id;
      }
      if (activeTab === 'created') {
        // Bounties created by the current user for others
        return reward.creator_id === user?.id;
      }
      return false;
    });

    if (filteredRewards.length === 0) {
      return (
        <BaseCard className="transition-all duration-200 hover:shadow-lg">
          <div className="text-center py-12">
            <ShoppingCart size={64} className="mx-auto mb-4 text-teal-400/50" />
            <h3 className="text-subtitle text-white/90 mb-2">{theme.strings.storeEmptyTitle}</h3>
            <p className="text-body text-white/70 mb-6">{theme.strings.storeEmptyBody}</p>
            {user && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="btn-primary flex items-center justify-center gap-2 mx-auto min-h-[44px] transition-all duration-200 hover:scale-105"
              >
                <Plus size={20} />
                Create first {theme.strings.rewardSingular}
              </button>
            )}
          </div>
        </BaseCard>
      );
    }

    // R14: "created" (My Bounties) tab uses centered column layout; "available" uses grid
    if (activeTab === 'created') {
      return (
        <div className="max-w-xl mx-auto flex flex-col gap-3">
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
    }

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
          title={theme.strings.storeTitle} 
          subtitle={theme.strings.storeSubtitle}
        />

        {/* R14: Simplified Balance Card - number is the focal point */}
        {!creditsLoading && (
          <div className="mb-6">
            <BaseCard className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col">
                <span className="text-xs text-white/50 uppercase tracking-wide mb-1">
                  {theme.strings.storeCreditsLabel}
                </span>
                <span className="text-3xl sm:text-4xl font-semibold text-white">
                  {userCredits ?? 0}
                </span>
                {/* R14: Contextual hint below balance */}
                {(userCredits ?? 0) === 0 ? (
                  <span className="text-xs text-white/50 mt-1">
                    Complete {theme.strings.missionPlural} to earn {theme.strings.tokenPlural}
                  </span>
                ) : affordableCount > 0 ? (
                  <span className="text-xs text-teal-400/80 mt-1">
                    {theme.strings.storeCanAffordLabel} {affordableCount} {affordableCount === 1 ? theme.strings.rewardSingular : theme.strings.rewardPlural}
                  </span>
                ) : cheapestUnaffordable ? (
                  <span className="text-xs text-white/50 mt-1">
                    {((cheapestUnaffordable.credit_cost || 0) - (userCredits ?? 0))} more to "{cheapestUnaffordable.name}"
                  </span>
                ) : null}
              </div>
              {/* R14: Single coin visual, scaled down */}
              <div className="text-4xl sm:text-5xl animate-proper-spin">🪙</div>
            </BaseCard>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 sm:mb-8 flex justify-center border-b border-gray-700 overflow-x-auto">
          <div className="flex gap-1 sm:gap-0">
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
