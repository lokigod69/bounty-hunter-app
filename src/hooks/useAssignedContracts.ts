// src/hooks/useAssignedContracts.ts
// Custom hook to fetch contracts assigned to the current user.
// Now joins with 'profiles' table to fetch creator and assignee display_name and avatars.
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

export interface AssignedContract extends BaseTask {
  creator: ProfileLite | null;
  assignee: ProfileLite | null;
  image_url?: string | null;
  // user_credits?: number; // Temporarily removed as direct join is not possible
}

export function useAssignedContracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<AssignedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const loadedUserIdRef = useRef<string | null>(null);

  const fetchAssignedContracts = useCallback(async () => {
    if (!user?.id) {
      setContracts([]);
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
      const { data, error: dbError } = await supabase
        .from('tasks')
        .select(`
          *,
          creator:profiles!tasks_created_by_fkey(display_name, avatar_url),
          assignee:profiles!tasks_assigned_to_fkey(display_name, avatar_url)
        `)
        .eq('assigned_to', user.id)
        .eq('is_archived', false);

      if (dbError) {
        setError(dbError.message);
        if (isInitialLoad) setContracts([]);
      } else {
        // FIXED: Remove double URL generation - proof_url is already a public URL from upload
        const processedContracts = data?.map(task => {
          // Validate proof_url if it exists
          if (task.proof_url) {
            try {
              // Basic URL validation
              const url = new URL(task.proof_url);
              if (!url.protocol.startsWith('http')) {
                return { ...task, proof_url: null };
              }
              return task;
            } catch {
              // Set proof_url to null for invalid URLs to prevent broken links
              return { ...task, proof_url: null };
            }
          }
          return task;
        }) || [];
        
        setContracts(processedContracts);
        hasLoadedRef.current = true;
        loadedUserIdRef.current = user.id;
      }
    } catch (e: unknown) {
      let message = 'An unexpected error occurred.';
      if (e instanceof Error) {
        message = e.message;
      }
      setError(message);
      if (isInitialLoad) setContracts([]);
    } finally {
      if (isInitialLoad) setLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]); // Add user.id as a dependency for useCallback

  useEffect(() => {
    fetchAssignedContracts();
  }, [fetchAssignedContracts]); // Now fetchAssignedContracts is a stable dependency

  // Keep the list live: any change on `tasks` (RLS-scoped) triggers a refetch.
  useTasksRealtime(user?.id, 'useAssignedContracts', fetchAssignedContracts);

  return { contracts, loading, isRefreshing, error, refetch: fetchAssignedContracts };
}
