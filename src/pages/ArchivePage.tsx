// src/pages/ArchivePage.tsx
// This page displays a history of archived tasks.

import React from 'react';
import { useArchivedContracts } from '../hooks/useArchivedContracts';

import { useTranslation } from 'react-i18next';
import TaskCard from '../components/TaskCard';


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
    <div className="p-4 text-center">
      <h1 className="text-4xl font-bold app-title">{t('navigation.history', 'History')}</h1>
      <p className="text-white/70 mb-6 max-w-2xl mx-auto">{t('history.description', 'Review your history of completed and expired contracts.')}</p>
      <div className="space-y-4">
        {archivedTasks.length > 0 ? (
          archivedTasks.map(task => (
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
          ))
        ) : (
          <p className="text-white/70">No archived tasks found.</p>
        )}
      </div>
    </div>
  );
};

export default ArchivePage;
