// src/hooks/useArchivedContracts.ts
// Archived history includes both sides of the contract and revalidates in place.

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

import { useAuth } from './useAuth';
import { AssignedContract } from './useAssignedContracts';

export const useArchivedContracts = () => {
  const { user } = useAuth();
  const [archivedTasks, setArchivedTasks] = useState<AssignedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const loadedUserIdRef = useRef<string | null>(null);

  const fetchArchivedTasks = useCallback(async () => {
    if (!user?.id) {
      setArchivedTasks([]);
      setLoading(false);
      setIsRefreshing(false);
      hasLoadedRef.current = false;
      loadedUserIdRef.current = null;
      return;
    }

    const isInitialLoad =
      !hasLoadedRef.current || loadedUserIdRef.current !== user.id;
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, creator:profiles!tasks_created_by_fkey(display_name, avatar_url), assignee:profiles!tasks_assigned_to_fkey(display_name, avatar_url)')
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .eq('is_archived', true)
        .order('approved_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setArchivedTasks(data || []);
      hasLoadedRef.current = true;
      loadedUserIdRef.current = user.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      if (isInitialLoad) setLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchArchivedTasks();
  }, [fetchArchivedTasks]);

  return { archivedTasks, loading, isRefreshing, error, refetch: fetchArchivedTasks };
};
