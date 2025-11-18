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
import RewardCard, { Reward } from '../components/RewardCard';
import CreateBountyModal from '../components/CreateBountyModal';
import EditBountyModal from '../components/EditBountyModal';
import ConfirmDialog from '../components/ConfirmDialog';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { PageContainer, PageHeader, PageBody, StatsRow } from '../components/layout';
import { BaseCard } from '../components/ui/BaseCard';
import CreditDisplay from '../components/CreditDisplay';

type Tab = 'available' | 'created' | 'collected';

const RewardsStorePage: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { rewards, isLoadingRewards, rewardsError, fetchRewards } = useRewardsStore();
  const { purchaseBounty, isLoading: isPurchasing } = usePurchaseBounty();
  const { deleteBounty, isLoading: isDeleting } = useDeleteBounty();
  const { credits: userCredits, loading: creditsLoading } = useUserCredits();

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

    const filteredRewards = rewards.filter(reward => {
      if (activeTab === 'available') {
        // Bounties assigned to the current user by others
        return reward.assigned_to === user?.id;
      }
      if (activeTab === 'created') {
        // Bounties created by the current user for others
        return reward.creator_id === user?.id;
      }
      if (activeTab === 'collected') {
        // TODO: This will require fetching from the 'collected_rewards' table.
        return false;
      }
      return false;
    });

    if (filteredRewards.length === 0) {
      return (
        <BaseCard>
          <div className="text-center py-12">
            <ShoppingCart size={64} className="mx-auto mb-4 text-teal-400/50" />
            <h3 className="text-subtitle text-white/90 mb-2">{theme.strings.storeEmptyTitle}</h3>
            <p className="text-body text-white/70 mb-6">{theme.strings.storeEmptyBody}</p>
            {user && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="btn-primary flex items-center justify-center gap-2 mx-auto"
              >
                <Plus size={20} />
                Create first {theme.strings.rewardSingular}
              </button>
            )}
          </div>
        </BaseCard>
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

        {/* P4: Credits Summary */}
        {!creditsLoading && (
          <div className="mb-6">
            <BaseCard className={`${(userCredits ?? 0) > 0 ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border-teal-500/30' : 'bg-gray-800/50 border-gray-700/50'}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🪙</div>
                  <div>
                    <p className="text-meta text-white/70 mb-1">{theme.strings.storeCreditsLabel}</p>
                    <div className="flex items-center gap-2">
                      <CreditDisplay amount={userCredits ?? 0} size="large" />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {(userCredits ?? 0) === 0 ? (
                    <p className="text-body text-white/70">
                      Complete {theme.strings.missionPlural} to earn {theme.strings.tokenPlural}
                    </p>
                  ) : (
                    <>
                      {affordableCount > 0 && (
                        <p className="text-body text-white/90 mb-1">
                          {theme.strings.storeCanAffordLabel} {affordableCount} {affordableCount === 1 ? theme.strings.rewardSingular : theme.strings.rewardPlural}
                        </p>
                      )}
                      {cheapestUnaffordable && (
                        <p className="text-meta text-white/70">
                          {((cheapestUnaffordable.credit_cost || 0) - (userCredits ?? 0))} {theme.strings.tokenPlural} away from "{cheapestUnaffordable.name}"
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </BaseCard>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8 flex justify-center border-b border-gray-700">
          <button onClick={() => setActiveTab('available')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'available' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400'}`}>{t('rewards.tabs.available')}</button>
          <button onClick={() => setActiveTab('created')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'created' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400'}`}>{t('rewards.tabs.created')}</button>
          <button onClick={() => setActiveTab('collected')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'collected' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400'}`}>{t('rewards.tabs.collected')}</button>
        </div>

        <PageBody>
          {renderContent()}
        </PageBody>

      <button 
        onClick={() => setCreateModalOpen(true)}
        className="fixed bottom-8 right-8 bg-teal-500 text-black rounded-full p-4 shadow-lg hover:bg-teal-600 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-500"
        aria-label={t('rewards.createBountyButton')}
      >
        <Plus size={28} />
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
