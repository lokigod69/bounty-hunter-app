// src/pages/RewardsStorePage.tsx
// Displays available bounties and provides an interface for creating new ones.
// P1: Updated page header title to use theme strings.
// P4: Added credits summary, theme-aware labels, and aspirational design.
// Wave B: Refreshes preserve populated grids; reward claims use debit-appropriate feedback.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useFormatters } from '../hooks/useFormatters';
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
import { AppButton, EmptyState, PageState, ConfirmModal, TabBar } from '../components/ui';
import { feedback } from '../utils/feedback';
import { Coin } from '../components/visual/Coin';
import emptyStore from '../assets/generated/empty-store.webp';
// R14: CreditDisplay removed - using simplified balance layout with just the number

type Tab = 'available' | 'created' | 'collected';

const RewardsStorePage: React.FC = () => {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const [searchParams] = useSearchParams();
  const { strings } = useThemeStrings();
  const { user } = useAuth();
  const { rewards, isLoadingRewards, rewardsError, fetchRewards } = useRewardsStore();
  const { purchaseBounty, isLoading: isPurchasing } = usePurchaseBounty();
  const { deleteBounty, isLoading: isDeleting } = useDeleteBounty();
  const {
    credits: userCredits,
    totalEarned,
    loading: creditsLoading,
    refetch: refetchCredits,
  } = useUserCredits();
  const { collectedRewards, isLoading: isLoadingCollected, error: collectedError, fetchCollectedRewards, markRedeemed } = useCollectedRewards();

  // State for modals
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  const [selectedBounty, setSelectedBounty] = useState<Reward | null>(null);
  const [bountyToDelete, setBountyToDelete] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('available');
  const claimingRef = useRef(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  // Phase 2.8: track which collected reward is mid-redeem to guard double-clicks
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

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

  const handleRefresh = async () => {
    await fetchRewards();
    refetchCredits(); // R29: Always refresh credits on pull-to-refresh
    await fetchCollectedRewards(); // Always fetch to update exclusion filter
  };

  const handleClaim = async (rewardId: string) => {
    if (claimingRef.current) return;
    claimingRef.current = true;
    setClaimingId(rewardId);
    try {
      const result = await purchaseBounty(rewardId);
      if (result?.success) {
        feedback.success();
        await Promise.all([fetchRewards(), refetchCredits(), fetchCollectedRewards()]);
        setActiveTab('collected');
        categoriesRef.current?.scrollIntoView({ block: 'start' });
      }
    } finally {
      claimingRef.current = false;
      setClaimingId(null);
    }
  };

  // Phase 2.8: toggle a collected reward's redeemed/delivered state
  const handleMarkRedeemed = async (collectionId: string, redeemed: boolean) => {
    if (redeemingId) return; // guard against double-clicks
    setRedeemingId(collectionId);
    try {
      await markRedeemed(collectionId, redeemed);
      if (redeemed) feedback.success();
      toast.success(redeemed ? t('rewards.redeemSuccess') : t('rewards.redeemUndoSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('rewards.redeemError');
      toast.error(message || t('rewards.redeemError'));
    } finally {
      setRedeemingId(null);
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
    if (activeTab !== 'collected' && isLoadingRewards && rewards.length === 0) {
      return <PageState state="loading" message={t('rewards.loading')} />;
    }

    if (activeTab !== 'collected' && rewardsError) {
      return <PageState state="error" message={rewardsError} onRetry={() => fetchRewards()} />;
    }

    // Handle collected tab separately (uses different data source)
    if (activeTab === 'collected') {
      if (collectedError) return <PageState state="error" message={collectedError} onRetry={fetchCollectedRewards} />;
      if (isLoadingCollected && collectedRewards.length === 0) {
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
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 spacing-grid">
          {collectedRewards.map((reward) => (
            <RewardCard
              key={reward.collection_id}
              reward={reward as Reward}
              view="collected"
              collectedAt={reward.collected_at}
              redeemedAt={reward.redeemed_at}
              onMarkRedeemed={(next) => handleMarkRedeemed(reward.collection_id, next)}
              isRedeeming={redeemingId === reward.collection_id}
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
          illustration={emptyStore}
          title={strings.storeEmptyTitle}
          body={t(`rewards.empty.${activeTab}`)}
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

    // My Bounties and Available: Grid layout with RewardCards.
    // One column below 420px: two 140px-wide cards side by side on a 360px
    // phone clipped the claim/edit actions, and the card needs ~170px to lay
    // its action row out. Every phone from 420px up still gets two.
    return (
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 spacing-grid">
        {filteredRewards.map(reward => (
          <RewardCard
            key={reward.id}
            reward={reward}
            view={activeTab}
            onAction={handleClaim}
            onEdit={handleEdit}
            onDelete={handleDelete}
            currentCredits={userCredits ?? 0}
            isClaiming={claimingId === reward.id}
            claimDisabled={isPurchasing || claimingId !== null}
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
          actions={<AppButton variant="cta" icon={<Plus size={18} />} onClick={() => setCreateModalOpen(true)}>{t('rewards.createBountyButton')}</AppButton>}
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
                  {typeof totalEarned === 'number' && (
                    <span className="mt-2 text-xs text-white/45 tabular-nums">
                      {t('rewards.lifetimeEarned')} · {fmt.number(totalEarned)}
                    </span>
                  )}
                </div>
                {/* R32: Coin with value is now the primary balance display */}
                <Coin size="lg" value={userCredits ?? 0} />
              </div>
            </BaseCard>
          </div>
        )}

        {/* Tabs */}
        <div ref={categoriesRef} className="reward-categories">
        <TabBar
          fullWidth
          tabs={[
            { id: 'available', label: t('rewards.tabs.available') },
            { id: 'created', label: t('rewards.tabs.created') },
            { id: 'collected', label: t('rewards.tabs.collected') },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as Tab)}
          className="mb-6 sm:mb-8 max-w-xl mx-auto"
          aria-label={t('rewards.tabs.label')}
        />
        </div>

        <PageBody>
          {renderContent()}
        </PageBody>

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
