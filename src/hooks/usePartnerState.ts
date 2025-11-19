// src/hooks/usePartnerState.ts
// Hook for determining partner state in Couple Mode
// Returns explicit state machine states: NO_PARTNER, INVITE_SENT, INVITE_RECEIVED, PARTNERED

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Friendship = Database['public']['Tables']['friendships']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export type PartnerState = 'NO_PARTNER' | 'INVITE_SENT' | 'INVITE_RECEIVED' | 'PARTNERED';

export interface PartnerStateResult {
  state: PartnerState;
  partnerProfile: Profile | null;
  friendshipId: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for Couple Mode partner state management.
 * Determines the current partner relationship state based on friendships table.
 */
export function usePartnerState(userId: string | undefined): PartnerStateResult {
  const [state, setState] = useState<PartnerState>('NO_PARTNER');
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartnerState = useCallback(async () => {
    if (!userId) {
      setState('NO_PARTNER');
      setPartnerProfile(null);
      setFriendshipId(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get all friendships where user is involved
      const { data: friendships, error: fetchError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // For Couple Mode, we only care about the first/primary partner relationship
      // Find the most relevant friendship (accepted > pending sent > pending received)
      let acceptedFriendship: Friendship | null = null;
      let pendingSentFriendship: Friendship | null = null;
      let pendingReceivedFriendship: Friendship | null = null;

      for (const friendship of friendships || []) {
        const partnerId = friendship.user1_id === userId ? friendship.user2_id : friendship.user1_id;
        if (!partnerId) continue;

        if (friendship.status === 'accepted') {
          if (!acceptedFriendship) {
            acceptedFriendship = friendship;
          }
        } else if (friendship.status === 'pending') {
          if (friendship.requested_by === userId) {
            if (!pendingSentFriendship) {
              pendingSentFriendship = friendship;
            }
          } else {
            if (!pendingReceivedFriendship) {
              pendingReceivedFriendship = friendship;
            }
          }
        }
      }

      // Determine state and fetch partner profile
      let finalState: PartnerState = 'NO_PARTNER';
      let finalFriendship: Friendship | null = null;
      let finalPartnerId: string | null = null;

      if (acceptedFriendship) {
        finalState = 'PARTNERED';
        finalFriendship = acceptedFriendship;
        finalPartnerId = acceptedFriendship.user1_id === userId 
          ? acceptedFriendship.user2_id 
          : acceptedFriendship.user1_id;
      } else if (pendingReceivedFriendship) {
        finalState = 'INVITE_RECEIVED';
        finalFriendship = pendingReceivedFriendship;
        finalPartnerId = pendingReceivedFriendship.user1_id === userId 
          ? pendingReceivedFriendship.user2_id 
          : pendingReceivedFriendship.user1_id;
      } else if (pendingSentFriendship) {
        finalState = 'INVITE_SENT';
        finalFriendship = pendingSentFriendship;
        finalPartnerId = pendingSentFriendship.user1_id === userId 
          ? pendingSentFriendship.user2_id 
          : pendingSentFriendship.user1_id;
      }

      setState(finalState);
      setFriendshipId(finalFriendship?.id || null);

      // Fetch partner profile if we have a partner ID
      if (finalPartnerId) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', finalPartnerId)
          .single();

        if (profileError) {
          console.error('Error fetching partner profile:', profileError);
          setPartnerProfile(null);
        } else {
          setPartnerProfile(profile);
        }
      } else {
        setPartnerProfile(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch partner state';
      setError(errorMessage);
      console.error('Error fetching partner state:', err);
      setState('NO_PARTNER');
      setPartnerProfile(null);
      setFriendshipId(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPartnerState();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('partner-state-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => {
          fetchPartnerState();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPartnerState]);

  return {
    state,
    partnerProfile,
    friendshipId,
    isLoading,
    error,
    refresh: fetchPartnerState,
  };
}

