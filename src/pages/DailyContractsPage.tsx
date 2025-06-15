// src/pages/DailyContractsPage.tsx
// Manages the display and interaction for daily recurring tasks (contracts).
// Key functionalities:
// - Fetches and displays recurring task templates and their instances.
// - Allows creation and editing of recurring task templates.
// - Handles task completion flow:
//   - If proof is required for a task instance, a modal is shown for proof submission.
//   - If proof is not required, the task can be marked complete directly.
//   - Calls 'complete_task_instance' RPC via useRecurringTasks hook for backend processing.
// - Manages UI state for forms, modals, and loading/error states.
// Page for managing and viewing daily/recurring contracts. Uses useRecurringTasks hook and displays data using RecurringTemplateCard and TaskInstanceCard components.
// Allows users to create new recurring templates and view instances assigned to them or created by them.
// Changes:
// - Made the 'Created by Me' section collapsible.
// - Added a toggle button for the 'Created by Me' section.
// - Modified handleShowProofModal to conditionally show modal or complete task directly if proof is not required.
// - Updated 'Assigned to Me (This Week)' heading to 'Assigned to Me'.
// - Added refetch call on RecurringTaskForm close to refresh template list.
// - Fixed lint error by calling updateTaskInstanceStatus correctly when no proof is required.

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PlusCircle } from 'lucide-react';
// import { useAuth } from '../hooks/useAuth'; // useAuth is used within useRecurringTasks
import useRecurringTasks, { RecurringTemplateWithInstances, TaskInstanceWithTemplate } from '../hooks/useRecurringTasks';
import RecurringTaskForm from '../components/RecurringTaskForm';
import RecurringTemplateCard from '../components/RecurringTemplateCard';
import TaskInstanceCard from '../components/TaskInstanceCard';
import ProofSubmissionModal from '../components/ProofSubmissionModal';
import ConfirmationModal from '../components/ConfirmationModal';

const DailyContractsPage: React.FC = () => {
  // const { user } = useAuth(); // Uncomment when auth is integrated
  const {
    templates: createdTemplates,
    taskInstances: assignedInstances,
    loading,
    error,
    completeTaskInstance: updateTaskInstanceStatus,
    deleteTemplate: deleteRecurringTemplate,
    toggleTemplateActive,
    refetch, // Added refetch from the hook
  } = useRecurringTasks();

  // Placeholder action handlers - to be wired up with hook functions
  const handleShowEditForm = (templateId: string) => {
    const template = createdTemplates.find(t => t.id === templateId);
    if (template) {
      setEditingTemplate(template);
      setIsFormOpen(true);
    } else {
      toast.error('Could not find the template to edit.');
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    console.log('Requesting confirmation to delete template:', templateId);
    setTemplateToDeleteId(templateId);
    setIsConfirmDeleteModalOpen(true);
  };

  const confirmDeleteTemplateAndCloseModal = async () => {
    if (templateToDeleteId) {
      try {
        await deleteRecurringTemplate(templateToDeleteId);
        // Toast notifications are handled by the hook
      } catch {
        // Error is handled by the hook's toast
      }
      handleCloseConfirmDeleteModal();
    }
  };

  const handleCloseConfirmDeleteModal = () => {
    setIsConfirmDeleteModalOpen(false);
    setTemplateToDeleteId(null);
  };

  const handleToggleTemplateActive = async (templateId: string, newIsActiveState: boolean) => {
    try {
      await toggleTemplateActive(templateId, newIsActiveState);
      // Toast is handled by the hook
    } catch {
      // Error is handled by the hook's toast
    }
  };

  const handleProofSubmit = async (instanceId: string, proof: string) => {
    try {
      await updateTaskInstanceStatus(instanceId, proof);
      handleCloseProofModal(); // Close modal on successful submission
    } catch {
      // Error toast is handled by the hook
    }
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplateWithInstances | null>(null);

  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [completingInstance, setCompletingInstance] = useState<TaskInstanceWithTemplate | null>(null);

  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [templateToDeleteId, setTemplateToDeleteId] = useState<string | null>(null);
  const [isCreatedByMeCollapsed, setIsCreatedByMeCollapsed] = useState(false);

  const handleShowProofModal = async (instanceId: string) => {
    const instance = assignedInstances.find(i => i.id === instanceId);
    if (instance) {
      const proofIsRequired = instance.recurring_task_templates?.proof_required ?? true; // Default to true if undefined

      if (proofIsRequired) {
        setCompletingInstance(instance);
        setIsProofModalOpen(true);
      } else {
        // Proof not required, complete directly
        try {
          await updateTaskInstanceStatus(instanceId); // This calls the RPC via the hook
          // The hook/RPC should handle success toasts. A specific one here might be for UI feedback if needed.
          // For now, relying on hook's toast. Example: toast.success(`'${instance.recurring_task_templates?.title || 'Contract'}' marked complete!`);
        } catch (e) {
          // Error toast is handled by the useRecurringTasks hook when it calls the RPC.
          console.error("Error completing task instance directly in DailyContractsPage: ", e);
        }
      }
    }
  };

  const handleCloseProofModal = () => {
    setIsProofModalOpen(false);
    setCompletingInstance(null);
  };

  const handleShowCreateForm = () => {
    setEditingTemplate(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTemplate(null);
    refetch(); // Force refresh of templates
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-teal-400 text-center mb-4">Daily Contracts</h1>
      <div className="flex justify-center mb-8">
        <button
          onClick={handleShowCreateForm}
          className="btn btn-primary flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
        >
          <PlusCircle size={20} className="mr-2" />
          Create Daily Contract
        </button>
      </div>

      {isFormOpen && (
        <RecurringTaskForm 
          onClose={handleCloseForm} 
          templateToEdit={editingTemplate} 
        />
      )}

      {isProofModalOpen && completingInstance && (
        <ProofSubmissionModal 
          instance={completingInstance}
          onClose={handleCloseProofModal}
          onSubmit={handleProofSubmit}
          loading={loading} // Pass loading state to disable submit button
        />
      )}

      {isConfirmDeleteModalOpen && (
        <ConfirmationModal
          isOpen={isConfirmDeleteModalOpen}
          onClose={handleCloseConfirmDeleteModal}
          onConfirm={confirmDeleteTemplateAndCloseModal}
          title="Confirm Deletion"
          message="Are you sure you want to delete this recurring contract template and its pending instances? This action cannot be undone."
          confirmButtonText="Delete"
          loading={loading} // Use loading state from hook
        />
      )}

      {loading && <p className="text-center text-slate-300 py-8">Loading daily contracts...</p>}
      {error && <p className="text-center text-red-500 py-8">Error loading data: {(error as Error).message}</p>}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assigned to Me Section */}
          <div> 
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Assigned to Me</h2>
            {assignedInstances.length === 0 ? (
              <p className="text-slate-400 italic">No contracts assigned to you for this week yet.</p>
            ) : (
              <div className="space-y-4"> 
                {assignedInstances.map((instance) => (
                  <TaskInstanceCard 
                    key={instance.id} 
                    instance={instance} 
                    onInitiateComplete={handleShowProofModal} 
                  />
                ))}
              </div>
            )}
          </div>

          {/* Created by Me Section */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-purple-400">Created by Me</h2>
              <button 
                onClick={() => setIsCreatedByMeCollapsed(!isCreatedByMeCollapsed)}
                className="text-purple-400 hover:text-purple-300 transition-colors"
                aria-label={isCreatedByMeCollapsed ? 'Expand Created by Me section' : 'Collapse Created by Me section'}
              >
                {isCreatedByMeCollapsed ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
              </button>
            </div>
            {loading && <p className="text-slate-400">Loading your created contracts...</p>}
            {error && <p className="text-red-400">Error loading templates: {(error as Error).message}</p>}
            {!isCreatedByMeCollapsed && (
              <>
                {loading && <p className="text-slate-400">Loading your created contracts...</p>}
                {error && <p className="text-red-400">Error loading templates: {(error as Error).message}</p>}
                {!loading && createdTemplates.length === 0 && (
                  <p className="text-slate-500 italic">You haven't created any daily contracts yet.</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {createdTemplates.map((template) => (
                    <RecurringTemplateCard 
                      key={template.id} 
                      template={template} 
                      onEdit={handleShowEditForm}
                      onDelete={handleDeleteTemplate}
                      onToggleActive={handleToggleTemplateActive}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



export default DailyContractsPage;
