// src/components/RecurringTaskForm.tsx
// Form for creating or editing recurring contract templates. Uses useRecurringTasks hook for creation and update logic.
// Changes:
// - Added 'Proof Required' checkbox and associated logic.
// - Added detailed error logging in handleSubmit for template creation.
// - Updated to use createTemplate from useRecurringTasks hook.

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase'; // For fetching assignable users
import { Profile } from '../types/database';
import useRecurringTasks, { NewRecurringTemplateData, RecurringTemplateWithInstances } from '../hooks/useRecurringTasks';

interface RecurringTaskFormProps {
  onClose: () => void;
  templateToEdit?: RecurringTemplateWithInstances | null;
  // onSuccess or similar callback can be added if needed after template creation/update
}

const RecurringTaskForm: React.FC<RecurringTaskFormProps> = ({ onClose, templateToEdit }) => {
  const isEditMode = !!templateToEdit;
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creditValue, setCreditValue] = useState('');
  const [frequencyLimit, setFrequencyLimit] = useState(''); // Times per week
  const [assignedTo, setAssignedTo] = useState('');
  const [proofRequired, setProofRequired] = useState(false);

  useEffect(() => {
    if (isEditMode && templateToEdit) {
      setTitle(templateToEdit.title || '');
      setDescription(templateToEdit.description || '');
      setCreditValue(templateToEdit.credit_value?.toString() || '');
      setFrequencyLimit(templateToEdit.frequency_limit?.toString() || '');
      // Assignee cannot be changed in edit mode, so we clear and disable it
      setAssignedTo('');
      setProofRequired(templateToEdit.proof_required || false);
    } else {
      // Reset form for create mode
      setTitle('');
      setDescription('');
      setCreditValue('');
      setFrequencyLimit('');
      setAssignedTo('');
      setProofRequired(false);
    }
  }, [isEditMode, templateToEdit]);

  const [assignableUsers, setAssignableUsers] = useState<Profile[]>([]);
  // isLoading and error will be handled by the hook, but we can keep local ones for form-specific feedback if needed
  const [formError, setFormError] = useState<string | null>(null);
  const {
    createTemplate: createRecurringTemplate, // Renamed from addTemplate
    updateTemplate: updateRecurringTemplate,
    loading: hookLoading,
  } = useRecurringTasks();

  useEffect(() => {
    // Fetch users that this template can be assigned to (e.g., friends or all users)
    // For now, let's fetch all users except the current user as a placeholder
    const fetchUsers = async () => {
      if (!user) return;
      setFormError(null); // Clear previous form errors
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id); // Exclude self

      if (error) {
        console.error('Error fetching users:', error);
        setFormError('Could not load users to assign.');
      } else {
        setAssignableUsers(data || []);
      }
    };
    fetchUsers();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!user) {
      setFormError('You must be logged in.');
      return;
    }

    if (!title || !creditValue || !frequencyLimit) {
      setFormError('Title, Credits, and Weekly Quota are required.');
      return;
    }
    if (!isEditMode && !assignedTo) {
      setFormError('Assignee is required when creating a new template.');
      return;
    }

    if (isEditMode && templateToEdit) {
      // TODO: Add similar logging for update if needed
      const updatedData = {
        title,
        description: description || null,
        credit_value: Number(creditValue),
        frequency_limit: Number(frequencyLimit),
        proof_required: proofRequired,
      };
      const success = await updateRecurringTemplate(templateToEdit.id, updatedData);
      if (success) {
        onClose();
      }
    } else {
      // Create mode
      const templatePayload = {
        title,
        description: description || null,
        credit_value: Number(creditValue),
        frequency_limit: Number(frequencyLimit), // This corresponds to 'frequency' in the user's request context
        initial_assignee_id: assignedTo,
        proof_required: proofRequired, // This corresponds to 'requiresProof'
        // Fields from NewRecurringTemplateData that are not directly from form but have defaults or are set by hook:
        // frequency_counter: 0, (Likely handled by hook or backend)
        // period_reset_date: new Date().toISOString(), (Likely handled by hook or backend)
        // is_active: true, (Likely handled by hook or backend)
      };

      try {
        console.log('Attempting to create template with data:', templatePayload);
        
        // Construct the full NewRecurringTemplateData object for the hook
        // The hook might expect additional fields like frequency_counter, period_reset_date, is_active
        // For now, we pass what's directly gathered from the form and what was in the original call.
        // The hook `createRecurringTemplate` should handle setting defaults for other fields if necessary.
        const fullTemplateData: NewRecurringTemplateData = {
          title: templatePayload.title,
          description: templatePayload.description,
          credit_value: templatePayload.credit_value,
          frequency_limit: templatePayload.frequency_limit,
          initial_assignee_id: templatePayload.initial_assignee_id,
          proof_required: templatePayload.proof_required,
          // Assuming these are set by the hook or backend, or have sensible defaults there
          frequency_counter: 0, 
          period_reset_date: new Date().toISOString(),
          is_active: true,
        };

        await createRecurringTemplate(fullTemplateData);
        
        // Modal should close here
        onClose();
      } catch (error) {
        console.error('Failed to create template (in RecurringTaskForm):', error);
        // User-visible error handling will be added in Phase 4
        // For now, re-throw or set a local error state if one exists
        // setFormError(error.message || 'Failed to create contract'); // Example, actual implementation in Phase 4
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-md flex justify-center items-center z-40 p-4 animate-fade-in">
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-2xl p-8 w-full max-w-2xl relative animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>
        <h2 className="text-3xl font-bold mb-6 text-teal-300 text-center">{isEditMode ? 'Edit Recurring Contract' : 'Create New Recurring Contract'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">Title <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-slate-900/80 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
              placeholder="e.g., Daily Standup Summary"
              required 
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea 
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-slate-900/80 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
              placeholder="Describe the task requirements..."
              rows={3}
            />
          </div>

          <div className="flex justify-end items-center space-x-4 pt-4">
            <div>
              <label htmlFor="creditValue" className="block text-sm font-medium text-slate-300 mb-1">Credits Per Completion <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                id="creditValue"
                value={creditValue}
                onChange={(e) => setCreditValue(e.target.value)}
                className="w-full p-3 bg-slate-900/80 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                placeholder="e.g., 5"
                required 
                min="1"
              />
            </div>
            <div>
              <label htmlFor="frequencyLimit" className="block text-sm font-medium text-slate-300 mb-1">Weekly Quota <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                id="frequencyLimit"
                value={frequencyLimit}
                onChange={(e) => setFrequencyLimit(e.target.value)}
                className="w-full p-3 bg-slate-900/80 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                placeholder="e.g., 5 times per week"
                required 
                min="1"
                max="7"
              />
            </div>
          </div>

          <div>
            <label htmlFor="initial_assignee_id" className="block text-sm font-medium text-slate-300 mb-1">Assign To (First Instance) <span className="text-red-500">*</span></label>
            <select 
              id="initial_assignee_id"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full p-3 bg-slate-900/80 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={isEditMode} // Cannot change assignee in edit mode
            >
              <option value="" disabled>Select a user</option>
              {assignableUsers.map(u => (
                <option key={u.id} value={u.id}>{u.display_name || u.email}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              id="proofRequired"
              name="proofRequired"
              type="checkbox"
              checked={proofRequired}
              onChange={(e) => setProofRequired(e.target.checked)}
              className="h-4 w-4 text-teal-600 border-slate-600 rounded focus:ring-teal-500 bg-slate-700 cursor-pointer"
            />
            <label htmlFor="proofRequired" className="ml-2 block text-sm text-slate-300 cursor-pointer">
              Require proof for completion?
            </label>
          </div>

          {formError && <p className="text-red-500 text-sm text-center">{formError}</p>}
          <button type="button" onClick={onClose} className="btn btn-secondary bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-50" disabled={hookLoading}>Cancel</button>
          <button type="submit" className="btn btn-primary bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed" disabled={hookLoading}>{hookLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save Contract')}</button>
        </form>
      </div>
    </div>
  );
};

export default RecurringTaskForm;
