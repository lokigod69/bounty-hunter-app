// src/hooks/useArchivedContracts.ts
// This hook is responsible for fetching and managing archived tasks.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

import { useAuth } from './useAuth';
import { AssignedContract } from './useAssignedContracts';

export const useArchivedContracts = () => {
  const { user } = useAuth();
  const [archivedTasks, setArchivedTasks] = useState<AssignedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArchivedTasks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, creator:profiles!tasks_created_by_fkey(display_name, avatar_url), assignee:profiles!tasks_assigned_to_fkey(display_name, avatar_url)')
        .eq('assigned_to', user.id)
        .eq('is_archived', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setArchivedTasks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchArchivedTasks();
  }, [fetchArchivedTasks]);

  return { archivedTasks, loading, error, refetch: fetchArchivedTasks };
};
