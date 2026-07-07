// src/pages/ArchivePage.tsx
// This page displays a history of archived tasks — a "Contract Ledger" / trophy view.

import React from 'react';
import { CheckCircle, Coins, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useArchivedContracts } from '../hooks/useArchivedContracts';
import { useThemeStrings } from '../hooks/useThemeStrings';
import TaskCard from '../components/TaskCard';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { PageBody } from '../components/layout/PageBody';
import { StatsRow } from '../components/layout/StatsRow';
import { PageState, EmptyState } from '../components/ui';

const ArchivePage: React.FC = () => {
  const { archivedTasks, loading, error, refetch: refetchArchivedTasks } = useArchivedContracts();
  const { strings } = useThemeStrings();
  const { t } = useTranslation();

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title={strings.archiveTitle} subtitle={strings.archiveSubtitle} />
        <PageBody>
          <PageState state="loading" />
        </PageBody>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader title={strings.archiveTitle} subtitle={strings.archiveSubtitle} />
        <PageBody>
          <PageState state="error" message={error} onRetry={refetchArchivedTasks} />
        </PageBody>
      </PageContainer>
    );
  }

  const totalCompleted = archivedTasks.length;
  const creditsEarned = archivedTasks.reduce(
    (sum, task) =>
      task.reward_type === 'credit' ? sum + (parseInt(task.reward_text ?? '', 10) || 0) : sum,
    0
  );

  return (
    <PageContainer>
      <PageHeader title={strings.archiveTitle} subtitle={strings.archiveSubtitle} />
      <PageBody>
        {archivedTasks.length > 0 ? (
          <>
            <StatsRow
              stats={[
                {
                  icon: <CheckCircle />,
                  value: totalCompleted,
                  label: t('contracts.completed'),
                  iconColor: 'text-green-400',
                },
                {
                  icon: <Coins />,
                  value: creditsEarned,
                  label: t('history.creditsEarned'),
                  iconColor: 'text-yellow-400',
                },
              ]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 spacing-grid">
              {archivedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isCreatorView={false}
                  onStatusUpdate={() => {}}
                  onProofUpload={async () => null}
                  onDeleteTaskRequest={() => {}}
                  uploadProgress={0}
                  refetchTasks={refetchArchivedTasks}
                  isArchived={true}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Trophy />}
            title={strings.archiveEmptyTitle}
            body={strings.archiveEmptyBody}
          />
        )}
      </PageBody>
    </PageContainer>
  );
};

export default ArchivePage;
