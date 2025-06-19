// src/hooks/useIssuedContracts.ts
// Custom hook to fetch contracts issued by the current user.
// Now joins with 'profiles' table to fetch creator and assignee display_name and avatars.
// Added a refetch function to allow manual data refreshing.
// Addressed lint errors for 'any' type and useEffect dependencies.
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
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
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    if (!user?.id) {
      setContracts([]); // Clear contracts if no user
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select(`
          *,
          creator:profiles!tasks_created_by_fkey(display_name, avatar_url),
          assignee:profiles!tasks_assigned_to_fkey(display_name, avatar_url)
        `)
        .eq('created_by', user.id);

      if (fetchError) {
        console.error('Error fetching issued contracts:', fetchError);
        setError(fetchError.message);
        setContracts([]);
      } else {
        setContracts(data || []);
      }
    } catch (e: unknown) {
      console.error('Unexpected error fetching issued contracts:', e);
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unexpected error occurred.');
      }
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [user]); // user is the dependency for useCallback

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]); // fetchContracts is the dependency for this useEffect

  return { contracts, loading, error, refetch: fetchContracts };
}
