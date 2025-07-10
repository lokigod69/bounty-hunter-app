// src/hooks/useAssignedContracts.ts
// Custom hook to fetch contracts assigned to the current user.
// Now joins with 'profiles' table to fetch creator and assignee display_name and avatars.
// Added a refetch function (wrapped in useCallback) to allow manual refreshing of contract data and satisfy useEffect dependencies.
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
  const [error, setError] = useState<string | null>(null);

  const fetchAssignedContracts = useCallback(async () => {
    if (!user?.id) {
      setContracts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
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
        console.error('Error fetching assigned contracts:', dbError);
        setError(dbError.message);
        setContracts([]);
      } else {
        // FIXED: Remove double URL generation - proof_url is already a public URL from upload
        console.log('[useAssignedContracts] Fetched contracts with proof URLs:', data?.map(t => ({ id: t.id, proof_url: t.proof_url })));
        
        const processedContracts = data?.map(task => {
          // Validate proof_url if it exists
          if (task.proof_url) {
            try {
              // Basic URL validation
              const url = new URL(task.proof_url);
              if (!url.protocol.startsWith('http')) {
                console.warn('[useAssignedContracts] Invalid proof URL protocol:', task.proof_url);
                return { ...task, proof_url: null };
              }
              
              console.log('[useAssignedContracts] Valid proof URL for task', task.id, ':', task.proof_url);
              return task;
            } catch (urlError) {
              console.error('[useAssignedContracts] Invalid proof URL for task', task.id, ':', task.proof_url, urlError);
              // Set proof_url to null for invalid URLs to prevent broken links
              return { ...task, proof_url: null };
            }
          }
          return task;
        }) || [];
        
        setContracts(processedContracts);
      }
    } catch (e: unknown) {
      console.error('Unexpected error fetching assigned contracts:', e);
      let message = 'An unexpected error occurred.';
      if (e instanceof Error) {
        message = e.message;
      }
      setError(message);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // Add user.id as a dependency for useCallback

  useEffect(() => {
    fetchAssignedContracts();
  }, [fetchAssignedContracts]); // Now fetchAssignedContracts is a stable dependency

  return { contracts, loading, error, refetch: fetchAssignedContracts };
}
