// src/components/TaskInstanceCard.tsx
// Card component to display a single task instance from a recurring contract.
// It determines if proof is required based on the instance's template.
// The main action button's text changes to 'Submit Proof' or 'Mark Complete'.
// Clicking this button calls the 'onInitiateComplete' prop, which is handled by the parent page (DailyContractsPage.tsx)
// to either show a proof submission modal or complete the task directly.
// Changes:
// - Replaced lucide-react Coins icon with custom SpinningCoinIcon.
// - Clarified button behavior and reliance on onInitiateComplete prop for proof logic.

import React from 'react';

import type { TaskInstanceWithTemplate } from '../hooks/useRecurringTasks';
export type { TaskInstanceWithTemplate };
import { CheckSquare, UploadCloud, AlertTriangle, Info } from 'lucide-react';
import SpinningCoinIcon from './SpinningCoinIcon';

interface TaskInstanceCardProps {
  instance: TaskInstanceWithTemplate;
  onInitiateComplete: (instanceId: string) => void;
}

const getStatusStyles = (status: string | null) => {
  switch (status) {
    case 'pending':
      return { bg: 'bg-slate-600/50', text: 'text-slate-300', Icon: Info, label: 'ACTIVE CONTRACT' };
    case 'in_progress': // Assuming 'in_progress' might be used if user 'starts' it
      return { bg: 'bg-blue-500/30', text: 'text-blue-300', Icon: UploadCloud };
    case 'review':
      return { bg: 'bg-yellow-500/30', text: 'text-yellow-300', Icon: AlertTriangle };
    case 'completed':
      return { bg: 'bg-green-500/30', text: 'text-green-300', Icon: CheckSquare };
    case 'rejected':
      return { bg: 'bg-red-500/30', text: 'text-red-300', Icon: AlertTriangle };
    default:
      return { bg: 'bg-gray-700/50', text: 'text-gray-400', Icon: Info };
  }
};

const TaskInstanceCard: React.FC<TaskInstanceCardProps> = ({ instance, onInitiateComplete }) => {
  const proofIsRequired = instance.recurring_task_templates?.proof_required ?? true; // Default to true if undefined for safety
  const { bg, text, Icon, label } = getStatusStyles(instance.status);
  const scheduledDate = new Date(instance.scheduled_date!);
  const isPastDue = !['completed', 'review'].includes(instance.status || '') && scheduledDate < new Date() && scheduledDate.toDateString() !== new Date().toDateString();

  const handleCompleteClick = () => {
    if (instance.status === 'pending' || instance.status === 'in_progress') {
      onInitiateComplete(instance.id);
    }
  };

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all flex flex-col justify-between ${isPastDue ? 'border-l-4 border-red-500' : ''}`}>
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-sky-300 truncate pr-2" title={instance.recurring_task_templates?.title}>{instance.recurring_task_templates?.title || 'Daily Contract'}</h3>
          <span className={`px-3 py-1 text-xs rounded-full font-semibold flex items-center ${bg} ${text}`}>
            <Icon size={14} className="mr-1.5" />
            {label || (instance.status ? instance.status.replace('_', ' ').toUpperCase() : 'UNKNOWN')}
          </span>
        </div>
        
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-slate-400">Scheduled for: <span className="font-semibold text-slate-200">{scheduledDate.toLocaleDateString()}</span></p>
          <p className="text-slate-400 flex items-center">Credits: <SpinningCoinIcon size={16} className="inline w-4 h-4 mx-1" /> <span className="font-semibold text-teal-300">{instance.recurring_task_templates?.credit_value}</span></p>
          {isPastDue && (
            <p className="text-red-400 font-semibold">Past Due</p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-end space-x-2">
        { (instance.status === 'pending' || instance.status === 'in_progress') && (
          <button 
            onClick={handleCompleteClick}
            title={proofIsRequired ? 'Submit Proof' : 'Mark as Complete'}
            className="complete-button flex items-center bg-green-600/80 hover:bg-green-500/80 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm"
          >
            <CheckSquare size={18} className="mr-2" />
            {proofIsRequired ? 'Submit Proof' : 'Mark Complete'}
          </button>
        )}
        {/* Add more actions here if needed, e.g., view details */}
      </div>
    </div>
  );
};

export default TaskInstanceCard;
