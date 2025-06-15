// src/components/ProofSubmissionModal.tsx
// A modal form for submitting a textual proof of completion (description) for a task instance.
// The 'onSubmit' prop handles the actual submission logic, typically by calling a function from 'useRecurringTasks'.

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TaskInstanceWithTemplate } from '../hooks/useRecurringTasks';

interface ProofSubmissionModalProps {
  instance: TaskInstanceWithTemplate;
  onClose: () => void;
  onSubmit: (instanceId: string, proof: string) => void;
  loading: boolean;
}

const ProofSubmissionModal: React.FC<ProofSubmissionModalProps> = ({ instance, onClose, onSubmit, loading }) => {
  const [proof, setProof] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proof.trim()) {
      // Basic validation, could add a toast or error message
      return;
    }
    onSubmit(instance.id, proof);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6 w-full max-w-md relative animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold text-teal-400 mb-2">Submit Proof of Completion</h2>
        <p className="text-slate-300 mb-6">Submitting proof for: <span className="font-semibold text-teal-300">{instance.recurring_task_templates?.title || 'Task'}</span></p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="proof" className="block text-sm font-medium text-slate-300 mb-1">Proof (URL or description)</label>
            <textarea
              id="proof"
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              className="input-glass w-full min-h-[100px]"
              placeholder="e.g., https://imgur.com/link-to-screenshot or 'Completed the task as requested.'"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="btn btn-secondary bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-50"
              disabled={loading || !proof.trim()}
            >
              {loading ? 'Submitting...' : 'Submit Proof'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProofSubmissionModal;
