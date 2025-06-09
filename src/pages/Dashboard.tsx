// src/pages/Dashboard.tsx
// Main dashboard component to display user tasks and related information.
// Changes:
// - Changed main page title to "Bounties".
// - Replaced "Rewards Summary" card with a "Daily Quote" card, now powered by useDailyQuote hook for dynamic quotes.
// - Renamed page title from "Username's Dashboard" to "Username's Hitlist" (intermediate step).
// - Set "Created Tasks" (active, non-review/completed) to be collapsed by default.
// - Renamed "My Tasks" tab and "Assigned to Me" text to "Open Tasks" and "Open:" respectively.
// - Renamed "Created Tasks" tab and "Created by Me" text to "Sent Tasks" and "Sent:" respectively.
// - Fixed lint errors: removed unused 'Award' import, 'rewards' variable/calculation, and 'profile' variable.
// - Previous changes include: useTasks hook, proof upload, TaskStatus import, type fixes, createTask mapping,
//   tab names, empty states, switch button logic, loading skeletons, 'review' status tasks,
//   collapsible completed tasks, task deletion/editing, sub-tabs for created tasks.

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import TaskCardSkeleton from '../components/TaskCardSkeleton';
import { Plus, ChevronLeft, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useDailyQuote } from '../hooks/useDailyQuote'; // Added Daily Quote Hook
import type { Task, ProofType, NewTaskData } from '../types/database';



export default function Dashboard() {
  const { user } = useAuth();
  const {
    assignedTasks,
    createdTasks,
    loading,
    error,
    uploadProgress,
    createTask,
    updateTaskStatus,
    uploadProof,
    deleteTask,
    updateTask,
  } = useTasks(user);

  const [activeTab, setActiveTab] = useState<'myTasks' | 'createdTasks'>('myTasks');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [createdTasksView, setCreatedTasksView] = useState<'active' | 'completed'>('active');
  const dailyQuote = useDailyQuote(); // Call the daily quote hook

  const handleDeleteTaskRequest = (taskId: string) => {
    setTaskToDeleteId(taskId);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTaskToDeleteId(null);
    setIsDeleting(false); // Reset deleting state when modal closes
  };

  const handleConfirmDeleteTask = async () => {
    if (taskToDeleteId) {
      setIsDeleting(true);
      await deleteTask(taskToDeleteId);
      // No need to manually update tasks state here, useTasks hook handles it via realtime/refetch
      handleCloseDeleteModal(); // This will also reset isDeleting via its own logic
    }
  };


  const handleEditTaskRequest = (task: Task) => {
    setEditingTask(task);
    setIsEditFormOpen(true);
    setShowTaskForm(false); // Ensure create form is not also open
  };

  const handleCloseEditForm = () => {
    setIsEditFormOpen(false);
    setEditingTask(null);
  };

  const handleFormSubmit = async (taskData: NewTaskData, taskId?: string) => {
    if (!user?.id) return;

    if (taskId && editingTask) { // Editing existing task
      await updateTask(taskId, taskData);
    } else { // Creating new task
      await createTask(taskData);
    }
    setShowTaskForm(false);
    handleCloseEditForm();
  };

  // const activeTasks = activeTab === 'myTasks' ? assignedTasks : createdTasks; // No longer needed, specific empty states per tab/sub-tab
  // For "My Tasks" tab
  const myPendingTasks = assignedTasks.filter((task: Task) => task.status === 'pending' || task.status === 'in_progress');
  const myReviewTasks = assignedTasks.filter((task: Task) => task.status === 'review');
  const myCompletedTasks = assignedTasks.filter((task: Task) => task.status === 'completed');

  // For "Created Tasks" tab - these will be further filtered by createdTasksView
  const createdActiveSubFilter = createdTasks.filter((task: Task) => task.status === 'pending' || task.status === 'in_progress' || task.status === 'review');
  const createdCompletedSubFilter = createdTasks.filter((task: Task) => task.status === 'completed');

  // Determine tasks to display based on activeTab and createdTasksView
  const tasksToDisplayPending = activeTab === 'myTasks' ? myPendingTasks : (createdTasksView === 'active' ? createdActiveSubFilter.filter(t => t.status === 'pending' || t.status === 'in_progress') : []);
  const tasksToDisplayReview = activeTab === 'myTasks' ? myReviewTasks : (createdTasksView === 'active' ? createdActiveSubFilter.filter(t => t.status === 'review') : []);
  const tasksToDisplayCompleted = activeTab === 'myTasks' ? myCompletedTasks : (createdTasksView === 'completed' ? createdCompletedSubFilter : []);

  const handleProofUpload = async (file: File, taskId: string): Promise<string | null> => {
    try {
      let proofType: ProofType = 'document'; // Default proof type
      if (file.type.startsWith('image/')) {
        proofType = 'image';
      } else if (file.type.startsWith('video/')) {
        proofType = 'video';
      }
      // Add more specific types if needed, e.g., for 'link'

      const result = await uploadProof({ taskId, file, proofType });
      return result === false ? null : result; // Convert false to null
    } catch (e) {
      console.error("Failed to upload proof in Dashboard:", e);
      return null;
    }
  };
  
  const getEmptyStateIcon = () => {
    if (activeTab === 'myTasks') {
      return <CheckCircle size={32} className="text-teal-400" />;
    }
    return <Plus size={32} className="text-purple-400" />;
  };
  
  const getEmptyStateTitle = () => {
    return activeTab === 'myTasks' ? 'All caught up!' : 'No tasks created yet';
  };

  const getEmptyStateMessage = () => {
    if (activeTab === 'myTasks') {
      return "You don't have any tasks assigned to you yet.";
    }
    return "These are open tasks you've assigned to others. Create one now!";
  };

  const getEmptyStatePrimaryAction = () => {
    if (activeTab === 'myTasks') {
      return (
        <button
          onClick={() => setActiveTab('createdTasks')}
          className="tab-button"
        >
          Created Tasks ({createdTasks.length})
        </button>
      );
    }
    return (
      <button
        onClick={() => setShowTaskForm(true)}
        className="btn-primary mt-4 inline-flex items-center"
      >
        <Plus size={18} className="mr-2" /> Create a Task
      </button>
    );
  };

  const getEmptyStateSecondaryAction = () => {
    if (activeTab === 'createdTasks') {
      return (
        <button
          onClick={() => setActiveTab('myTasks')}
          className="btn-secondary mt-4 ml-2 inline-flex items-center"
        >
          <ChevronLeft size={18} className="mr-2" /> Switch to My Tasks
        </button>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 animate-pulse">
        {/* Skeleton for Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="h-9 bg-slate-700 rounded w-1/2 sm:w-1/3"></div> {/* Title placeholder */}
          <div className="h-10 bg-slate-700 rounded w-full sm:w-auto sm:px-16"></div> {/* Button placeholder */}
        </div>

        {/* Skeleton for Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="h-6 bg-slate-700 rounded w-3/5 mb-4"></div> {/* Card Title */}
            <div className="space-y-2">
              <div className="h-4 bg-slate-700 rounded w-4/5"></div>
              <div className="h-4 bg-slate-700 rounded w-3/5"></div>
              <div className="h-4 bg-slate-700 rounded w-4/5"></div>
            </div>
          </div>
          <div className="glass-card p-6">
            <div className="h-6 bg-slate-700 rounded w-3/5 mb-4"></div> {/* Card Title */}
            <div className="space-y-2">
              <div className="h-4 bg-slate-700 rounded w-4/5"></div>
              <div className="h-4 bg-slate-700 rounded w-3/5"></div>
              <div className="h-4 bg-slate-700 rounded w-4/5"></div>
            </div>
          </div>
        </div>

        {/* Skeleton for Tab Controls */}
        <div className="flex border-b border-white/10 mb-6">
          <div className="h-10 bg-slate-700 rounded-t-lg w-28 mr-1"></div>
          <div className="h-10 bg-slate-700 rounded-t-lg w-28"></div>
        </div>

        {/* Skeleton for Task List */}
        <div className="space-y-4">
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          <TaskCardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="glass-card p-6 text-center">
          <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-semibold mb-2 text-red-300">Error Loading Tasks</h2>
          <p className="text-white/70 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header Section */}
      <div className="text-center mb-4"> {/* Centering the heading */}
        <h1 className="text-3xl font-bold gradient-text inline-block">
          Bounties
        </h1>
      </div>
      {/* New Big Plus Button */}
      <div className="flex justify-center my-6"> {/* my-6 for vertical spacing */}
        <button
          onClick={() => setShowTaskForm(true)}
          title="Create New Task" // Accessibility: good to have a title if no text
          className="p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
        >
          <Plus size={32} strokeWidth={2.5} /> {/* Larger icon, slightly thicker stroke */}
        </button>
      </div>

      {/* Stats Cards - Relocated to bottom */}

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6">
        <button
          onClick={() => setActiveTab('myTasks')}
          className={`px-4 py-3 sm:px-6 font-semibold rounded-t-md transition-all duration-200 ease-in-out focus:outline-none flex-1 text-center text-sm sm:text-base
            ${
              activeTab === 'myTasks'
                ? 'bg-teal-500/20 text-teal-300 border-b-2 border-teal-400 shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
        >
          Open Tasks
        </button>
        <button
          onClick={() => setActiveTab('createdTasks')}
          className={`px-4 py-3 sm:px-6 font-semibold rounded-t-md transition-all duration-200 ease-in-out focus:outline-none flex-1 text-center text-sm sm:text-base
            ${
              activeTab === 'createdTasks'
                ? 'bg-purple-500/20 text-purple-300 border-b-2 border-purple-400 shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
        >
          Sent Tasks
        </button>
      </div>

      {/* Sub-tabs for Created Tasks */}
      {activeTab === 'createdTasks' && (
        <div className="flex border-b border-slate-700 mb-6 gap-x-4">
          <button
            onClick={() => setCreatedTasksView('active')}
            className={`px-4 py-2 rounded-t-md text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none ${createdTasksView === 'active' ? 'bg-green-500/80 text-white shadow-md border-b-2 border-green-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
          >
            Active ({createdActiveSubFilter.length})
          </button>
          <button
            onClick={() => setCreatedTasksView('completed')}
            className={`px-4 py-2 rounded-t-md text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none ${createdTasksView === 'completed' ? 'bg-blue-500/80 text-white shadow-md border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
          >
            Completed ({createdCompletedSubFilter.length})
          </button>
        </div>
      )}

      {/* Content Area */} 
      <div>
        {/* === MY TASKS TAB === */} 
        {activeTab === 'myTasks' && (
          <>
            {assignedTasks.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 mb-6">
                  {getEmptyStateIcon()}
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-white/90">{getEmptyStateTitle()}</h3>
                <p className="text-white/70 mb-6 max-w-md mx-auto">{getEmptyStateMessage()}</p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                  {getEmptyStatePrimaryAction()}
                  {getEmptyStateSecondaryAction()}
                </div>
              </div>
            ) : (
              <>
                {/* My Tasks - Review (Tasks assigned to me, proof submitted by me, awaiting creator approval) */} 
                {myReviewTasks.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-white/90 flex items-center">
                      <AlertTriangle size={20} className="mr-2 text-yellow-400" /> Awaiting Approval ({myReviewTasks.length})
                    </h2>
                    <div className="space-y-4">
                      {myReviewTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          isCreator={false} /* On 'My Tasks' tab, I am the assignee */ 
                          onStatusUpdate={updateTaskStatus}
                          onProofUpload={handleProofUpload}
                          uploadProgress={uploadProgress}
                          onDeleteTaskRequest={handleDeleteTaskRequest} /* Should not be available for assigned tasks? */ 
                          onEditTaskRequest={handleEditTaskRequest} /* Should not be available for assigned tasks? */ 
                        />
                      ))}
                    </div>
                  </div>
                )}
                {/* My Tasks - Pending & In Progress */} 
                {myPendingTasks.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-white/90">
                      My Active Tasks ({myPendingTasks.length})
                    </h2>
                    <div className="space-y-4">
                      {myPendingTasks.map((task) => {
                        const isTaskForReview = task.status === 'review';
                        const collapsibleValueToPass = true; // Explicitly true
                        return (
                          <TaskCard
                            key={task.id}
                            task={task}
                            isCreator={false}
                            onStatusUpdate={updateTaskStatus}
                            onProofUpload={handleProofUpload}
                            uploadProgress={uploadProgress}
                            onDeleteTaskRequest={handleDeleteTaskRequest}
                            onEditTaskRequest={handleEditTaskRequest}
                            collapsible={collapsibleValueToPass} // Use the variable
                            defaultCollapsed={isTaskForReview || task.status === 'completed'}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* My Tasks - Completed */} 
                {myCompletedTasks.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-white/90">
                      My Completed Tasks ({myCompletedTasks.length})
                    </h2>
                    <div className="space-y-4">
                      {myCompletedTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          isCreator={false}
                          onStatusUpdate={updateTaskStatus}
                          onProofUpload={handleProofUpload}
                          uploadProgress={uploadProgress}
                          onDeleteTaskRequest={handleDeleteTaskRequest}
                          onEditTaskRequest={handleEditTaskRequest}
                          collapsible={true}
                          defaultCollapsed={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* === CREATED TASKS TAB === */} 
        {activeTab === 'createdTasks' && (
          <>
            {createdTasks.length === 0 && (
              // Overall empty state for 'Created Tasks' if no tasks created at all
              <div className="glass-card p-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 mb-6">
                  {getEmptyStateIcon()} 
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-white/90">{getEmptyStateTitle()}</h3>
                <p className="text-white/70 mb-6 max-w-md mx-auto">{getEmptyStateMessage()}</p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                  {getEmptyStatePrimaryAction()}
                  {getEmptyStateSecondaryAction()}
                </div>
              </div>
            )}
            {createdTasks.length > 0 && createdTasksView === 'active' && (
              <>
                {tasksToDisplayReview.length === 0 && tasksToDisplayPending.length === 0 ? (
                  <div className="glass-card p-8 text-center">
                    <CheckCircle size={32} className="text-teal-400 mx-auto" />
                    <h2 className="text-xl font-semibold mt-4 mb-2 text-white/90">No Active Created Tasks</h2>
                    <p className="text-white/70 mb-4">You have no created tasks that are currently active or awaiting review.</p>
                  </div>
                ) : (
                  <>
                    {tasksToDisplayReview.length > 0 && (
                      <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4 text-white/90 flex items-center">
                          <AlertTriangle size={20} className="mr-2 text-yellow-400" /> Tasks Awaiting Your Review ({tasksToDisplayReview.length})
                        </h2>
                        <div className="space-y-4">
                          {tasksToDisplayReview.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              isCreator={true}
                              onStatusUpdate={updateTaskStatus}
                              onProofUpload={handleProofUpload}
                              uploadProgress={uploadProgress}
                              onDeleteTaskRequest={handleDeleteTaskRequest}
                              onEditTaskRequest={handleEditTaskRequest}
                              collapsible={true}
                              defaultCollapsed={true}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {tasksToDisplayPending.length > 0 && (
                      <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4 text-white/90">
                          Other Active Tasks ({tasksToDisplayPending.length})
                        </h2>
                        <div className="space-y-4">
                          {tasksToDisplayPending.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              isCreator={true}
                              onStatusUpdate={updateTaskStatus}
                              onProofUpload={handleProofUpload}
                              uploadProgress={uploadProgress}
                              onDeleteTaskRequest={handleDeleteTaskRequest}
                              onEditTaskRequest={handleEditTaskRequest}
                              collapsible={true}
                              defaultCollapsed={true}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {createdTasks.length > 0 && createdTasksView === 'completed' && (
              <>
                {tasksToDisplayCompleted.length === 0 ? (
                  <div className="glass-card p-8 text-center">
                    <CheckCircle size={32} className="text-teal-400 mx-auto" />
                    <h2 className="text-xl font-semibold mt-4 mb-2 text-white/90">No Completed Created Tasks</h2>
                    <p className="text-white/70 mb-4">You have not created any tasks that have been completed yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasksToDisplayCompleted.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isCreator={true}
                        onStatusUpdate={updateTaskStatus}
                        onProofUpload={handleProofUpload}
                        uploadProgress={uploadProgress}
                        onDeleteTaskRequest={handleDeleteTaskRequest}
                        onEditTaskRequest={handleEditTaskRequest}
                        collapsible={true}
                        defaultCollapsed={true}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Stats Cards - Relocated */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 mb-8"> {/* Added mt-12 */}
        {/* Daily Quote Card */}
        <div className="glass-card p-6 bg-sky-600/10">
          <h3 className="flex items-center text-xl font-semibold mb-4 text-white/90">
            {/* <Lightbulb size={22} className="mr-3 text-sky-400" /> Optional Icon */}
            Daily Quote
          </h3>
          <div className="text-center">
            {dailyQuote ? (
              <>
                <p className="text-lg italic text-white/80 mb-1">"{dailyQuote.text}"</p>
                <p className="text-sm text-white/60">- {dailyQuote.author}</p>
              </>
            ) : (
              <p className="text-white/70">Loading quote...</p>
            )}
          </div>
        </div>

        {/* Task Status Card */}
        <div className="glass-card p-6 bg-indigo-600/10">
          <h3 className="flex items-center text-xl font-semibold mb-4 text-white/90">
            <Clock size={22} className="mr-3 text-indigo-400" />
            Task Status
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <div className="border-b border-slate-600/70 pb-1 mb-2">
                <p className="text-sm text-white/70">Open:</p>
              </div>
              <p className="text-3xl font-bold text-indigo-300 mb-2">{assignedTasks.length}</p> {/* Added mb-2 for spacing before sub-counts */}
              <div className="mt-2 space-y-2">
                <div className="bg-slate-800/30 p-2 rounded border border-slate-700/50 shadow-sm">
                  <p className="text-xs text-white/70 flex justify-between">
                    <span>Pending:</span>
                    <span>{assignedTasks.filter((t: Task) => t.status === 'pending').length}</span>
                  </p>
                </div>
                <div className="bg-slate-800/30 p-2 rounded border border-slate-700/50 shadow-sm">
                  <p className="text-xs text-white/70 flex justify-between">
                    <span>Completed:</span>
                    <span>{assignedTasks.filter((t: Task) => t.status === 'completed').length}</span>
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="border-b border-slate-600/70 pb-1 mb-2">
                <p className="text-sm text-white/70">Sent:</p>
              </div>
              <p className="text-3xl font-bold text-pink-300 mb-2">{createdTasks.length}</p> {/* Added mb-2 for spacing before sub-counts */}
              <div className="mt-2 space-y-2">
                <div className="bg-slate-800/30 p-2 rounded border border-slate-700/50 shadow-sm">
                  <p className="text-xs text-white/70 flex justify-between">
                    <span>Pending:</span>
                    <span>{createdTasks.filter((t: Task) => t.status === 'pending').length}</span>
                  </p>
                </div>
                <div className="bg-slate-800/30 p-2 rounded border border-slate-700/50 shadow-sm">
                  <p className="text-xs text-white/70 flex justify-between">
                    <span>Completed:</span>
                    <span>{createdTasks.filter((t: Task) => t.status === 'completed').length}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(showTaskForm || isEditFormOpen) && user && (
        <TaskForm
          userId={user.id}
          editingTask={editingTask}
          onClose={() => { setShowTaskForm(false); handleCloseEditForm(); }}
          onSubmit={handleFormSubmit}
        />
      )}

      {isDeleteModalOpen && (
        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDeleteTask}
          title="Confirm Delete Task"
          message="Are you sure you want to delete this task? This action cannot be undone."
          confirmText="Delete Task"
          isConfirming={isDeleting}
        />
      )}
    </div>
  );
}
