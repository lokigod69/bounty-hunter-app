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
  // Request epoch: only the newest in-flight request may commit state (see
  // useAssignedContracts for the cross-user-leak rationale).
  const requestSeqRef = useRef(0);

  const fetchArchivedTasks = useCallback(async () => {
    requestSeqRef.current += 1;
    const seq = requestSeqRef.current;

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
      setArchivedTasks([]); // identity changed — never show the previous user's history
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

      if (seq !== requestSeqRef.current) return; // superseded by a newer request

      setArchivedTasks(data || []);
      hasLoadedRef.current = true;
      loadedUserIdRef.current = user.id;
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      // Background refresh failures keep the populated list (initial only).
      if (isInitialLoad) {
        setError(message);
      } else if (import.meta.env.DEV) {
        console.warn('useArchivedContracts background refresh failed:', message);
      }
    } finally {
      if (seq === requestSeqRef.current) {
        if (isInitialLoad) setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    fetchArchivedTasks();
  }, [fetchArchivedTasks]);

  return { archivedTasks, loading, isRefreshing, error, refetch: fetchArchivedTasks };
};
