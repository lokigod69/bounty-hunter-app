// src/pages/ArchivePage.tsx
// This page displays a history of archived tasks.

import React from 'react';
import { useArchivedContracts } from '../hooks/useArchivedContracts';
import TaskCard from '../components/TaskCard';


const ArchivePage: React.FC = () => {
  const { archivedTasks, loading, error, refetch: refetchArchivedTasks } = useArchivedContracts();

  if (loading) {
    return <div>Loading archived tasks...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Archived Tasks</h1>
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
            />
          ))
        ) : (
          <p>No archived tasks found.</p>
        )}
      </div>
    </div>
  );
};

export default ArchivePage;
