// src/pages/ArchivePage.tsx
// Wave B: The ledger includes both issued and assigned archived contracts.
// This page displays a history of archived tasks — a "Contract Ledger" / trophy view.

import React from 'react';
import { useArchivedContracts } from '../hooks/useArchivedContracts';
import { useAuth } from '../hooks/useAuth';
import { useThemeStrings } from '../hooks/useThemeStrings';
import TaskCard from '../components/TaskCard';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { PageBody } from '../components/layout/PageBody';
import { PageState, EmptyState } from '../components/ui';
import emptyArchive from '../assets/generated/empty-archive.webp';

const ArchivePage: React.FC = () => {
  const { user } = useAuth();
  const { archivedTasks, loading, error, refetch: refetchArchivedTasks } = useArchivedContracts();
  const { strings } = useThemeStrings();

  if (loading && archivedTasks.length === 0) {
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

  return (
    <PageContainer>
      <PageHeader title={strings.archiveTitle} subtitle={strings.archiveSubtitle} />
      <PageBody>
        {archivedTasks.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 spacing-grid">
              {archivedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isCreatorView={task.created_by === user?.id}
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
            illustration={emptyArchive}
            title={strings.archiveEmptyTitle}
            body={strings.archiveEmptyBody}
          />
        )}
      </PageBody>
    </PageContainer>
  );
};

export default ArchivePage;
