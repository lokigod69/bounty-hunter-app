// src/pages/Dashboard.tsx
// Main dashboard component to display user tasks and related information.
// Changes:
// - Removed floating "Bounties" page title and central purple "+" button (Phase 5A, Step 1).
// - Added 'NEW CONTRACT' button handling (Phase 5A, Step 2).
// - Added 'ACTIVE CONTRACTS' contextual page header (Phase 5A, Step 3).
// - Changed main page title to "Bounties" (before removal).
// - Replaced "Rewards Summary" card with a "Hunter's Creed" card (formerly "Daily Quote"), now powered by useDailyQuote hook for dynamic quotes (Phase 5B, Step 4). Corrected variable name and accessed .text property for display.
// Phase 5B (cont.): Corrected title in error block. Changed 'Under Review' to 'Guild Verification'. Updated stats card titles ('Hunter's Creed', 'Contract Status') and delete confirmation modal text.
// - Renamed page title from "Username's Dashboard" to "Username's Hitlist" (intermediate step).
// - Set "Created Tasks" (active, non-review/completed) to be collapsed by default.
// - Renamed "Open Tasks" tab to "Active Contracts".
// - Renamed "Sent Tasks" tab to "Issued Bounties".
// - Renamed "My Active Tasks" section title to "My Bounties".
// - Reordered sections in 'Active Contracts' (formerly 'My Tasks') tab: 'My Bounties' now appears before 'Under Review'.
// - Renamed 'Awaiting Approval' section title to 'Under Review'.
// - Renamed 'My Bounties' section to 'My Contracts' under 'Active Contracts' tab.
// - Renamed 'Other Active Tasks' section to 'My Bounties' under 'Open Bounties' tab (Open sub-tab).
// - Renamed 'Issued Bounties' main tab to 'Open Bounties'.
// - Renamed 'Active' sub-tab under 'Open Bounties' to 'Open'.
// - Fixed lint errors: removed unused 'Award' import, 'rewards' variable/calculation, and 'profile' variable.
// - Previous changes include: useTasks hook, proof upload, TaskStatus import, type fixes, createTask mapping,
//   tab names, empty states, switch button logic, loading skeletons, 'review' status tasks,
//   collapsible completed tasks, task deletion/editing, sub-tabs for created tasks.
// Phase 7 (UI Improvement): Renamed 'Guild Verification' to 'Verifying'. Implemented 'My Contracts' & 'Verifying' sub-tabs. Removed duplicated helpers. Comprehensively restored 'createdTasks' tab structure, stats cards, and modals. Fixed all outstanding JSX parsing errors and ensured correct component layout. This resolves issues from previous incomplete/corrupted edits. Added missing function closing brace, icon/modal imports, state variables. Corrected daily quote hook usage, ConfirmDeleteModal props, and task setter calls in handlers. Removed unused TaskStatus import. Removed unused taskToDeleteId state, fixed task list var in handleDeleteTaskRequest, added toast import, typed 't' param, and simplified dailyQuote display. Removed unused editingTask state and replaced its remaining usages.
// Phase 8: Updated error display for useTasks hook. Removed defaultCollapsed prop from TaskCard instances as it's no longer used.
// Mobile Terminology Alignment: Changed 'MY TASKS' to 'ACTIVE CONTRACTS', 'My Tasks' tab to 'Active Contracts', 'My Contracts' sub-tab to 'Contracts', and 'Verifying' sub-tab to 'Review' for mobile view consistency.
// Card Styling: Standardized stats cards to use Tailwind glassmorphism (bg-gray-800/50, backdrop-blur, border, p-6, hover:border-gray-600).
// Linting Note: The inline style around line ~420 for setting CSS custom properties (`--laser-color`, `--random-x`, `--random-y`) is a deliberate and necessary choice. It allows dynamic JavaScript values to be passed to CSS for animations defined in `index.css`. This is a standard React pattern for such dynamic styling requirements.

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useLocation, useNavigate } from 'react-router-dom';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import TaskCardSkeleton from '../components/TaskCardSkeleton';
import { Plus, ChevronLeft, Clock, AlertTriangle, CheckCircle, ScrollText, DatabaseZap } from 'lucide-react';
import { useDailyQuote } from '../hooks/useDailyQuote'; // Added Daily Quote Hook
import { toast } from 'react-hot-toast';
import type { Task, ProofType, NewTaskData } from '../types/database';



export default function Dashboard() {
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [createdTasksView, setCreatedTasksView] = useState<'active' | 'review' | 'completed'>('active');
  const [activeContractTab, setActiveContractTab] = useState<'my' | 'verifying' | 'completed'>('my'); // New state for sub-tabs in Active Contracts
  const [mobileActiveSection, setMobileActiveSection] = useState<'contracts' | 'bounties'>('contracts');
  const [isMobile, setIsMobile] = useState(false);
  const [laserBeams, setLaserBeams] = useState<Array<{id: number, color: string, randomX: number, randomY: number}>>([]);
  const [boxDestroyed, setBoxDestroyed] = useState(false);
  const [breakoutThreshold] = useState(Math.floor(Math.random() * 16) + 5); // 5-20, for future use in Phase 2
  const dailyQuote = useDailyQuote(); // Hook returns Quote | null directly

  const laserColors = ['#00ffff', '#ff0000', '#ffff00', '#00ff00']; // cyan, red, yellow, green
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const triggerBreakout = (currentBeamCount: number) => {
    if (currentBeamCount < breakoutThreshold || boxDestroyed) return;

    const box = document.querySelector('.laser-divider-container');
    if (box) {
      box.classList.add('breaking-out');
    }
    
    setTimeout(() => {
      setBoxDestroyed(true);
    }, 2000); // Duration of escape + dissolve animations
  };

  const handleLaserBoxClick = () => {
    if (boxDestroyed) return;

    // If we are already at the threshold, the next click triggers the breakout immediately.
    if (laserBeams.length >= breakoutThreshold) {
      triggerBreakout(laserBeams.length);
      return;
    }

    const colorIndex = laserBeams.length % laserColors.length;
    const newLaser = {
      id: Date.now() + Math.random(),
      color: laserColors[colorIndex],
      randomX: (Math.random() - 0.5) * 2,
      randomY: (Math.random() - 0.5) * 2,
    };

    const newBeams = [...laserBeams, newLaser];
    setLaserBeams(newBeams);

    // Check if the new laser meets or exceeds the threshold
    if (newBeams.length >= breakoutThreshold) {
      // Use a short timeout to allow the final laser to render before starting the breakout
      setTimeout(() => triggerBreakout(newBeams.length), 100);
    }
  };

  useEffect(() => {
    if (location.state?.openNewContractForm) {
      setShowTaskForm(true);
      // Clear the state to prevent re-opening on refresh or back navigation
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const handleDeleteTaskRequest = (taskId: string) => {
    const task = assignedTasks.find((t: Task) => t.id === taskId) || createdTasks.find((t: Task) => t.id === taskId);
    if (task) {
      setTaskToDelete(task);
      setIsDeleteModalOpen(true);
    } else {
      console.error('Task not found for deletion:', taskId);
      toast.error('Could not find task to delete.');
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTaskToDelete(null); // Clear the task object
    setIsDeleting(false); // Reset deleting state when modal closes
  };

  const handleConfirmDeleteTask = async () => {
    if (taskToDelete && taskToDelete.id) {
      setIsDeleting(true);
      await deleteTask(taskToDelete.id);
      handleCloseDeleteModal();
    }
  };


  const handleEditTaskRequest = (task: Task) => {
    setTaskToEdit(task);
    setIsEditFormOpen(true);
    setShowTaskForm(false); // Ensure create form is not also open
  };

  const handleCloseEditForm = () => {
    setIsEditFormOpen(false);
    setTaskToEdit(null);
  };

  const handleFormSubmit = async (taskData: NewTaskData, taskId?: string) => {
    if (!user?.id) return;

    if (taskId && taskToEdit) { // Editing existing task
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
  const createdActiveSubFilter = createdTasks.filter((task: Task) => task.status === 'pending' || task.status === 'in_progress');
  const createdReviewTasks = createdTasks.filter(task => task.status === 'review');
  const createdCompletedSubFilter = createdTasks.filter((task: Task) => task.status === 'completed');

  // Determine tasks to display based on activeTab and createdTasksView
  const tasksToDisplayPending = activeTab === 'myTasks' ? myPendingTasks : (createdTasksView === 'active' ? createdActiveSubFilter.filter(t => t.status === 'pending' || t.status === 'in_progress') : []);
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
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all">
            <div className="h-6 bg-slate-700 rounded w-3/5 mb-4"></div> {/* Card Title */}
            <div className="space-y-2">
              <div className="h-4 bg-slate-700 rounded w-4/5"></div>
              <div className="h-4 bg-slate-700 rounded w-3/5"></div>
              <div className="h-4 bg-slate-700 rounded w-4/5"></div>
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all">
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
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all text-center">
          <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-semibold mb-2 text-red-400">A Problem Occurred</h3>
          <p className="text-white/70 mb-4">
            {typeof error === 'string' ? error : 'An unexpected error occurred while loading data.'}
          </p>
          <p className="mt-3 text-sm text-red-400/80">Please try refreshing the page. If the issue persists, the system might be experiencing difficulties.</p>
        </div>
      </div>
    );
  }

  // The main loading check is below. The error check above handles critical data loading errors from useTasks.
  if (loading) {
  return (
    <div className="container mx-auto p-4 md:p-6 min-h-screen text-white">
      {/* Skeleton for Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="h-9 bg-slate-700 rounded w-1/2 sm:w-1/3"></div> {/* Title placeholder */}
        <div className="h-10 bg-slate-700 rounded w-full sm:w-auto sm:px-16"></div> {/* Button placeholder */}
      </div>

      {/* Skeleton for Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all">
          <div className="h-6 bg-slate-700 rounded w-3/5 mb-4"></div> {/* Card Title */}
          <div className="space-y-2">
            <div className="h-4 bg-slate-700 rounded w-4/5"></div>
            <div className="h-4 bg-slate-700 rounded w-3/5"></div>
            <div className="h-4 bg-slate-700 rounded w-4/5"></div>
          </div>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all">
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
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all text-center">
        <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
        <h3 className="text-lg font-semibold mb-2 text-red-400">An Error Occurred</h3>
        {dailyQuote ? (
          <p className="text-white/70 mb-4">{dailyQuote.text}</p>
        ) : (
          <p className="text-white/70 mb-4">{error}</p>
        )}
      </div>
    </div>
  );
}

return (
  <div className="max-w-4xl mx-auto p-4 md:p-6">
    {/* Mobile header - simpler */}
    {isMobile && (
      <h1 className="text-2xl font-bold text-center text-teal-400 mb-6">
        {mobileActiveSection === 'contracts' ? 'ACTIVE CONTRACTS' : 'OPEN BOUNTIES'}
      </h1>
    )}

    {/* Desktop headers with laser - only show on desktop */}
    {!isMobile && (
      <div className="desktop-header-section flex justify-between items-center relative mb-8">
        {/* Left Header */}
        <h1 className="text-3xl font-bold text-teal-400 uppercase tracking-wider">
          Active Contracts
        </h1>
        
        {/* Enhanced Laser Divider Box */}
        {!boxDestroyed && (
          <div 
            className={`laser-divider-box ${laserBeams.length >= breakoutThreshold && !boxDestroyed ? 'ready-to-break' : ''}`}
            onClick={handleLaserBoxClick} // Make it clickable
          >
            {laserBeams.map((laser, index) => (
              <div 
                key={laser.id}
                className={`laser-beam laser-beam-${(index % 3) + 1}`} // Cycle through 3 existing animation styles
                style={{
                  // This inline style is necessary for dynamically setting CSS custom properties.
                  // These properties (--laser-color, --random-x, --random-y) are used by
                  // animations and styles defined in src/index.css to control the appearance
                  // and behavior of the laser beams. This is a standard React pattern.
                  '--laser-color': laser.color,
                  '--random-x': laser.randomX,
                  '--random-y': laser.randomY,
                } as React.CSSProperties} 
              />
            ))}
            {/* Static vertical laser can be added here if desired, or removed if dynamic beams replace it fully */}
            {laserBeams.length === 0 && (
              <>
                {/* Show placeholder/initial lasers if no dynamic ones yet, or a central static one */}
                {/* For now, let's keep the original vertical laser if no dynamic beams exist */}
                <div className="vertical-laser"></div>
              </>
            )}
          </div>
        )}
        
        {/* Right Header */}
        <h1 className="text-3xl font-bold text-teal-400 uppercase tracking-wider">
          Open Bounties
        </h1>
      </div>
    )}

    {/* Tabs */} 
    {isMobile ? (
      <div className="mobile-tab-container mb-4">
        {/* Main Section Toggles */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMobileActiveSection('contracts')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold ${
              mobileActiveSection === 'contracts'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            Active Contracts
          </button>
          <button
            onClick={() => setMobileActiveSection('bounties')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold ${
              mobileActiveSection === 'bounties'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            Open Bounties
          </button>
        </div>

        {/* Sub-tabs for active section */} 
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2"> {/* Added pb-2 for scrollbar visibility if it appears */}
          {mobileActiveSection === 'contracts' ? (
            <>
              <button 
                onClick={() => { setActiveTab('myTasks'); setActiveContractTab('my'); }}
                className={`px-3 py-2 rounded text-sm whitespace-nowrap ${
                  activeTab === 'myTasks' && activeContractTab === 'my'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Contracts ({myPendingTasks.length})
              </button>
              <button 
                onClick={() => { setActiveTab('myTasks'); setActiveContractTab('verifying'); }}
                className={`px-3 py-2 rounded text-sm whitespace-nowrap ${
                  activeTab === 'myTasks' && activeContractTab === 'verifying'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Review ({myReviewTasks.length})
              </button>
              <button 
                onClick={() => { setActiveTab('myTasks'); setActiveContractTab('completed'); }}
                className={`px-3 py-2 rounded text-sm whitespace-nowrap ${
                  activeTab === 'myTasks' && activeContractTab === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Completed ({myCompletedTasks.length})
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => { setActiveTab('createdTasks'); setCreatedTasksView('active'); }}
                className={`px-3 py-2 rounded text-sm whitespace-nowrap ${
                  activeTab === 'createdTasks' && createdTasksView === 'active'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Active ({createdActiveSubFilter.length})
              </button>
              <button 
                onClick={() => { setActiveTab('createdTasks'); setCreatedTasksView('review'); }}
                className={`px-3 py-2 rounded text-sm whitespace-nowrap ${
                  activeTab === 'createdTasks' && createdTasksView === 'review'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Review ({createdReviewTasks.length})
              </button>
              <button 
                onClick={() => { setActiveTab('createdTasks'); setCreatedTasksView('completed'); }}
                className={`px-3 py-2 rounded text-sm whitespace-nowrap ${
                  activeTab === 'createdTasks' && createdTasksView === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Passed ({createdCompletedSubFilter.length})
              </button>
            </>
          )}
        </div>
      </div>
    ) : (
      // Desktop Layout - Keep existing 6-tab layout
      <div className="flex justify-between mb-6">
        {/* Active Contracts tabs (left aligned) */}
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setActiveTab('myTasks');
              setActiveContractTab('my');
            }}
            className={`tab-button px-4 py-2 rounded ${ 
              activeTab === 'myTasks' && activeContractTab === 'my'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-400 transition-colors duration-300 hover:bg-red-600/20'
            }`}
          >
            Contracts ({myPendingTasks.length})
          </button>
          
          <button 
            onClick={() => {
              setActiveTab('myTasks');
              setActiveContractTab('verifying');
            }}
            className={`tab-button px-4 py-2 rounded ${ 
              activeTab === 'myTasks' && activeContractTab === 'verifying'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-700 text-gray-400 transition-colors duration-300 hover:bg-amber-600/20'
            }`}
          >
            Review ({myReviewTasks.length})
          </button>
          
          <button 
            onClick={() => {
              setActiveTab('myTasks');
              setActiveContractTab('completed');
            }}
            className={`tab-button px-4 py-2 rounded ${ 
              activeTab === 'myTasks' && activeContractTab === 'completed'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-400 transition-colors duration-300 hover:bg-green-600/20'
            }`}
          >
            Completed ({myCompletedTasks.length})
          </button>
        </div>
        
        {/* Open Bounties tabs (right aligned) */}
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setActiveTab('createdTasks');
              setCreatedTasksView('active');
            }}
            className={`tab-button px-4 py-2 rounded ${ 
              activeTab === 'createdTasks' && createdTasksView === 'active'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-400 transition-colors duration-300 hover:bg-red-600/20'
            }`}
          >
            Bounties ({createdActiveSubFilter.length})
          </button>
          
          <button 
            onClick={() => {
              setActiveTab('createdTasks');
              setCreatedTasksView('review');
            }}
            className={`tab-button px-4 py-2 rounded ${ 
              activeTab === 'createdTasks' && createdTasksView === 'review'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-700 text-gray-400 transition-colors duration-300 hover:bg-amber-600/20'
            }`}
          >
            Verify ({createdReviewTasks.length})
          </button>

          <button 
            onClick={() => {
              setActiveTab('createdTasks');
              setCreatedTasksView('completed');
            }}
            className={`tab-button px-4 py-2 rounded ${ 
              activeTab === 'createdTasks' && createdTasksView === 'completed'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-400 transition-colors duration-300 hover:bg-green-600/20'
            }`}
          >
            Passed ({createdCompletedSubFilter.length})
          </button>
        </div>
      </div>
    )}

    {/* Sub-tabs for Created Tasks (Now handled by unified nav bar) */}
    {activeTab === 'createdTasks' && (
      <>
      </>
    )}

    {/* Active Contracts (My Tasks) Tab Content */}
    {activeTab === 'myTasks' && (
      <>
        

        {/* General Empty State for 'Active Contracts' tab if ALL (pending, review, AND completed) are empty */}
        {myPendingTasks.length === 0 && myReviewTasks.length === 0 && myCompletedTasks.length === 0 && (
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

        {/* Conditionally render sub-tab content OR completed tasks if not all empty */}
        {(myPendingTasks.length > 0 || myReviewTasks.length > 0 || myCompletedTasks.length > 0) && (
          <>
            {/* Content for 'my' sub-tab */}
            {activeContractTab === 'my' && (
              <>
                {myPendingTasks.length > 0 ? (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-white/90">
                      Contracts ({myPendingTasks.length})
                    </h2>
                    <div className="space-y-4">
                      {myPendingTasks.map((task) => (
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
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 glass-card-secondary">
                    <Clock size={32} className="mx-auto mb-3 text-teal-400" />
                    <h3 className="text-lg font-semibold text-white/90">No Active Contracts</h3>
                    <p className="text-sm text-white/70">You don't have any contracts currently in progress.</p>
                  </div>
                )}
              </>
            )}

            {/* Content for 'verifying' sub-tab */}
            {activeContractTab === 'verifying' && (
              <>
                {myReviewTasks.length > 0 ? (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-white/90 flex items-center">
                      <AlertTriangle size={20} className="mr-2 text-yellow-400" /> Review ({myReviewTasks.length})
                    </h2>
                    <div className="space-y-4">
                      {myReviewTasks.map((task) => (
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
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 glass-card-secondary">
                    <AlertTriangle size={32} className="mx-auto mb-3 text-yellow-400" />
                    <h3 className="text-lg font-semibold text-white/90">No Contracts to Review</h3>
                    <p className="text-sm text-white/70">There are no contracts awaiting your review.</p>
                  </div>
                )}
              </>
            )}

            {activeContractTab === 'completed' && (
              <>
                {myCompletedTasks.length > 0 ? (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-white/90">
                      Completed Contracts ({myCompletedTasks.length})
                    </h2>
                    <div className="space-y-4">
                      {myCompletedTasks.map(task => (
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
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 glass-card-secondary">
                    <CheckCircle size={32} className="mx-auto mb-3 text-green-400" />
                    <h3 className="text-lg font-semibold text-white/90">No Completed Contracts</h3>
                    <p className="text-sm text-white/70">You haven't completed any contracts yet.</p>
                  </div>
                )}
              </>
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
            {tasksToDisplayPending.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <CheckCircle size={32} className="text-teal-400 mx-auto" />
                <h2 className="text-xl font-semibold mt-4 mb-2 text-white/90">No Active Bounties</h2>
                <p className="text-white/70 mb-4">You have no bounties that are currently active.</p>
              </div>
            ) : (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-white/90">
                  My Bounties ({tasksToDisplayPending.length})
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
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {createdTasksView === 'review' && (
          <>
            {createdReviewTasks.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <CheckCircle size={32} className="text-yellow-400 mx-auto" />
                <h2 className="text-xl font-semibold mt-4 mb-2 text-white/90">Nothing to Review</h2>
                <p className="text-white/70 mb-4">No submissions are awaiting your review.</p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-white/90">
                  Awaiting Your Verification ({createdReviewTasks.length})
                </h2>
                <div className="space-y-4">
                  {createdReviewTasks.map(task => (
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
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {createdTasks.length > 0 && createdTasksView === 'completed' && (
          <>
            {tasksToDisplayCompleted.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <CheckCircle size={32} className="text-green-400 mx-auto" />
                <h2 className="text-xl font-semibold mt-4 mb-2 text-white/90">No Passed Contracts</h2>
                <p className="text-white/70 mb-4">No bounties you created have been completed and passed.</p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-white/90">
                  Passed Contracts ({tasksToDisplayCompleted.length})
                </h2>
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
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </>
    )}

    {/* Stats Cards - Relocated */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 mb-8">
      {/* Daily Quote Card */}
      <div className="glass-card p-6 bg-sky-600/10">
        <h3 className="flex items-center text-xl font-semibold mb-4 text-white/90">
          <ScrollText size={24} className="mr-3 text-sky-400" /> Hunter's Creed
        </h3>
        {dailyQuote ? (
          <p className="text-slate-300 italic">"{dailyQuote.text}" - {dailyQuote.author}</p>
        ) : (
          <p className="text-slate-500 italic">No creed for today... (or still loading)</p>
        )}
      </div>

      {/* Task Stats Card */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all">
        <h3 className="text-xl font-semibold mb-4 text-white/90 flex items-center">
          <DatabaseZap size={24} className="mr-3 text-purple-400" /> Contract Ledger
        </h3>
        <div className="space-y-3 text-white/80">
          <p className="flex justify-between items-center">Active Contracts: <span className="font-bold text-orange-400 text-lg">{myPendingTasks.length}</span></p>
          <p className="flex justify-between items-center">Awaiting Verification: <span className="font-bold text-yellow-400 text-lg">{myReviewTasks.length}</span></p>
          <p className="flex justify-between items-center">Completed Contracts: <span className="font-bold text-teal-400 text-lg">{myCompletedTasks.length}</span></p>
          <hr className="border-white/10 my-3" />
          <p className="flex justify-between items-center">Bounties Posted: <span className="font-bold text-indigo-400 text-lg">{createdTasks.length}</span></p>
        </div>
      </div>
    </div>

    {(showTaskForm || isEditFormOpen) && user && (
      <TaskForm
        userId={user.id}
        onSubmit={handleFormSubmit}
        onClose={isEditFormOpen ? handleCloseEditForm : () => setShowTaskForm(false)}
        editingTask={isEditFormOpen ? taskToEdit : undefined}
      />
    )}

    {isDeleteModalOpen && taskToDelete && (
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDeleteTask}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the contract "${taskToDelete.title}"? This action cannot be undone.`}
        isConfirming={isDeleting} // Pass isDeleting to isConfirming prop
      />
    )}
  </div>
);
}
