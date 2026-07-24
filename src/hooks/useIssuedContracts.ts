// src/hooks/useIssuedContracts.ts
// Custom hook to fetch contracts issued by the current user.
// Now joins with 'profiles' table to fetch creator and assignee display_name and avatars.
// Added a refetch function to allow manual data refreshing.
// Wave B: stale-while-revalidate keeps populated boards mounted during refetches.
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useTasksRealtime } from './useTasksRealtime';
import { Database } from '../types/database';

// Define BaseTask directly from the Database type for clarity and correctness
type BaseTask = Database['public']['Tables']['tasks']['Row'];

export interface ProfileLite {
  display_name: string | null;
  avatar_url: string | null;
}

export interface IssuedContract extends BaseTask {
  creator: ProfileLite | null;
  assignee: ProfileLite | null;
  // assignee_credits?: number; // Temporarily removed as direct join is not possible
}

export function useIssuedContracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<IssuedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const loadedUserIdRef = useRef<string | null>(null);

  const fetchContracts = useCallback(async () => {
    if (!user?.id) {
      setContracts([]); // Clear contracts if no user
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
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select(`
          *,
          creator:profiles!tasks_created_by_fkey(display_name, avatar_url),
          assignee:profiles!tasks_assigned_to_fkey(display_name, avatar_url)
        `)
        .eq('created_by', user.id)
        .eq('is_archived', false);

      if (fetchError) {
        setError(fetchError.message);
        if (isInitialLoad) setContracts([]);
      } else {
        setContracts(data || []);
        hasLoadedRef.current = true;
        loadedUserIdRef.current = user.id;
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unexpected error occurred.');
      }
      if (isInitialLoad) setContracts([]);
    } finally {
      if (isInitialLoad) setLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]); // fetchContracts is the dependency for this useEffect

  // Keep the list live: any change on `tasks` (RLS-scoped) triggers a refetch.
  useTasksRealtime(user?.id, 'useIssuedContracts', fetchContracts);

  return { contracts, loading, isRefreshing, error, refetch: fetchContracts };
}
