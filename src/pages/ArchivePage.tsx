// src/pages/ArchivePage.tsx
// This page displays a history of archived tasks.

import React from 'react';
import { useArchivedContracts } from '../hooks/useArchivedContracts';
import { useTranslation } from 'react-i18next';
import TaskCard from '../components/TaskCard';
import { PageContainer, PageHeader, PageBody } from '../components/layout';


const ArchivePage: React.FC = () => {
  const { archivedTasks, loading, error, refetch: refetchArchivedTasks } = useArchivedContracts();
  const { t } = useTranslation();

  if (loading) {
    return <div>Loading archived tasks...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <PageContainer>
      <PageHeader 
        title={t('navigation.history', 'History')} 
        subtitle={t('history.description', 'Review your history of completed and expired contracts.')} 
      />
      <PageBody>
        {archivedTasks.length > 0 ? (
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
        ) : (
          <div className="text-center py-10">
            <p className="text-body text-white/70">No archived tasks found.</p>
          </div>
        )}
      </PageBody>
    </PageContainer>
  );
};

export default ArchivePage;
