// src/pages/RewardsStorePage.tsx
// Displays available bounties and provides an interface for creating new ones.
// P1: Updated page header title to use theme strings.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Plus } from 'lucide-react';
import { useRewardsStore } from '../hooks/useRewardsStore';
import { usePurchaseBounty } from '../hooks/usePurchaseBounty';
import { useDeleteBounty } from '../hooks/useDeleteBounty';
import { useAuth } from '../hooks/useAuth';
import RewardCard, { Reward } from '../components/RewardCard';
import CreateBountyModal from '../components/CreateBountyModal';
import EditBountyModal from '../components/EditBountyModal';
import ConfirmDialog from '../components/ConfirmDialog';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { PageContainer, PageHeader, PageBody } from '../components/layout';

type Tab = 'available' | 'created' | 'collected';

const RewardsStorePage: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { rewards, isLoadingRewards, rewardsError, fetchRewards } = useRewardsStore();
  const { purchaseBounty, isLoading: isPurchasing } = usePurchaseBounty();
  const { deleteBounty, isLoading: isDeleting } = useDeleteBounty();

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
      return <div className="text-center text-red-500">{t('rewards.error', { error: rewardsError })}</div>;
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
      let message = t('rewards.empty.default');
      if (activeTab === 'available') message = t('rewards.empty.available');
      if (activeTab === 'created') message = t('rewards.empty.created');
      if (activeTab === 'collected') message = t('rewards.empty.collected');
      return <div className="text-center text-slate-400 pt-8">{message}</div>;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 spacing-grid">
        {filteredRewards.map(reward => (
          <RewardCard 
            key={reward.id} 
            reward={reward} 
            view={activeTab} 
            onAction={handleClaim} 
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    );
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <PageContainer>
        <PageHeader title={theme.strings.storeTitle} />

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
