// src/components/TaskForm.tsx
// Form for creating new tasks and editing existing ones.
// Applied galactic theme: .glass-card (inherited), .modal-icon-button, themed labels, themed error messages. Input fields use enhanced .input-field.
// Fixed TypeScript error for taskPayload.reward_text to ensure it's string | undefined.

import React, { useState, useEffect } from 'react';
import { X, Calendar, Award, Users } from 'lucide-react';
import { useFriends } from '../hooks/useFriends';
import { RewardType, Task, NewTaskData } from '../types/database';

interface TaskFormProps {
  userId: string;
  onClose: () => void;
  onSubmit: (taskData: NewTaskData, taskId?: string) => Promise<void>;
  editingTask?: Task | null;
}

export default function TaskForm({ userId, onClose, onSubmit, editingTask }: TaskFormProps) {
  const { friends, loading } = useFriends(userId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(''); // Added description state
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [rewardType, setRewardType] = useState<RewardType | ''>('');
  const [rewardText, setRewardText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Set default assignee if there's only one friend
    if (friends.length === 1 && !assignedTo && !editingTask) { // Only set default if not editing and only one friend
      setAssignedTo(friends[0].friend.id);
    }
  }, [friends, assignedTo, editingTask]);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || '');
      setDescription(editingTask.description || ''); // Set description from editingTask
      setAssignedTo(editingTask.assigned_to || '');
      setDeadline(editingTask.deadline ? editingTask.deadline.split('T')[0] : '');
      setRewardType((editingTask.reward_type as RewardType | '') || '');
      setRewardText(editingTask.reward_text || '');
    } else {
      // Reset form for creation mode or if editingTask is cleared
      setTitle('');
      setDescription(''); // Reset description
      setAssignedTo(friends.length === 1 ? friends[0].friend.id : '');
      setDeadline('');
      setRewardType('');
      setRewardText('');
    }
  }, [editingTask, friends]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!assignedTo) {
      newErrors.assignedTo = 'Please select a friend';
    }
    
    if (rewardType && !rewardText.trim()) {
      newErrors.rewardText = 'Please describe the reward';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const taskPayload: NewTaskData = {
      title,
      description: description.trim() || null, // Use description state, allowing null for empty
      assigned_to: assignedTo,
      deadline: deadline || null,
      reward_type: (rewardType as RewardType) || null,
      reward_text: rewardText.trim() ? rewardText.trim() : undefined,
    };
    await onSubmit(taskPayload, editingTask ? editingTask.id : undefined);

    
    onClose();
  };

  // Get minimum date for deadline (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const rewardTypes: { value: RewardType; label: string }[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'service', label: 'Service' },
    { value: 'voucher', label: 'Voucher/Gift' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6 relative animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="modal-icon-button absolute top-4 right-4"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-semibold mb-5 gradient-text">{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Task Title*
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`input-field w-full ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="What needs to be done?"
            />
            {errors.title && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Task Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field w-full min-h-[80px] resize-y"
              placeholder="Add more details about the task..."
              rows={3}
            />
            {/* No error message for description as it's optional */}
          </div>
          
          {/* Assign To */}
          <div>
            <label htmlFor="assignedTo" className="flex items-center text-sm font-medium text-[var(--text-secondary)] mb-1">
              <Users size={16} className="mr-1" />
              Assign To*
            </label>
            {loading ? (
              <div className="animate-pulse h-10 bg-white/10 rounded-lg"></div>
            ) : friends.length === 0 ? (
              <p className="text-[var(--warning-orange)] text-sm">
                You need to add friends first to assign tasks.
              </p>
            ) : (
              <>
                <select
                  id="assignedTo"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className={`input-field w-full ${errors.assignedTo ? 'border-red-500 focus:ring-red-500' : ''}`}
                >
                  <option value="">Select a friend</option>
                  {friends.map((friendship) => (
                    <option key={friendship.friend.id} value={friendship.friend.id}>
                      {friendship.friend.display_name || friendship.friend.email}
                    </option>
                  ))}
                </select>
                {errors.assignedTo && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.assignedTo}</p>}
              </>
            )}
          </div>
          
          {/* Deadline */}
          <div>
            <label htmlFor="deadline" className="flex items-center text-sm font-medium text-[var(--text-secondary)] mb-1">
              <Calendar size={16} className="mr-1" />
              Deadline (Optional)
            </label>
            <input
              type="date"
              id="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={getMinDate()}
              className="input-field w-full"
            />
          </div>
          
          {/* Reward */}
          <div>
            <label htmlFor="rewardType" className="flex items-center text-sm font-medium text-[var(--text-secondary)] mb-1">
              <Award size={16} className="mr-1" />
              Reward (Optional)
            </label>
            <div className="flex space-x-2">
              <select
                id="rewardType"
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value as RewardType)}
                className="input-field w-1/3"
              >
                <option value="">None</option>
                {rewardTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={rewardText}
                onChange={(e) => setRewardText(e.target.value)}
                className={`input-field w-2/3 ${errors.rewardText ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder={rewardType ? `Describe the ${rewardType} reward` : 'No reward'}
                disabled={!rewardType}
              />
            </div>
            {errors.rewardText && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.rewardText}</p>}
          </div>
          
          {/* Submit Button */}
          <div className="pt-2">
            <button type="submit" className="btn-primary w-full">
              {editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}