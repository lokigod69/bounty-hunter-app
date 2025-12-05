// src/hooks/useFriends.ts
// Custom hook for managing friendships
// R8 FIX: Fixed Supabase realtime subscription to prevent "subscribe multiple times" error
// - Use unique channel name per user
// - Only unsubscribe this specific channel on cleanup (not removeAllChannels)
// - Create channel once per userId change

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Define type aliases locally
type Friendship = Database['public']['Tables']['friendships']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface FriendWithProfile extends Friendship {
  friend: Profile;
}

export function useFriends(userId: string | undefined) {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // R8 FIX: Track channel ref to properly cleanup only this channel
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Memoize fetchFriendships so it can be called from subscription callback
  const fetchFriendships = useCallback(async (uid: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get all friendships where user is involved
      const { data, error: fetchError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user1_id.eq.${uid},user2_id.eq.${uid}`);

      if (fetchError) throw fetchError;

      // Process friendships
      const acceptedFriends: FriendWithProfile[] = [];
      const received: FriendWithProfile[] = [];
      const sent: FriendWithProfile[] = [];

      for (const friendship of data || []) {
        // Determine which user is the friend
        const friendId = friendship.user1_id === uid ? friendship.user2_id : friendship.user1_id;
        if (!friendId) continue;

        // Get friend's profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', friendId)
          .single();

        if (profileError) continue;

        const friendWithProfile = {
          ...friendship,
          friend: profileData,
        };

        // Categorize the friendship
        if (friendship.status === 'accepted') {
          acceptedFriends.push(friendWithProfile);
        } else if (friendship.status === 'pending') {
          if (friendship.requested_by === uid) {
            sent.push(friendWithProfile);
          } else {
            received.push(friendWithProfile);
          }
        }
      }

      setFriends(acceptedFriends);
      setPendingRequests(received);
      setSentRequests(sent);
    } catch (e) {
      let errorMessage: string | null = null;
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      } else {
        errorMessage = 'An unexpected error occurred while fetching friendships.';
      }
      setError(errorMessage);
      console.error('Error fetching friendships:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // R8 FIX: Single useEffect for data fetching and subscription
  useEffect(() => {
    if (!userId) {
      setFriends([]);
      setPendingRequests([]);
      setSentRequests([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchFriendships(userId);

    // R8 FIX: Create unique channel name for this user to avoid conflicts
    // R10: Added logging for debugging subscribe issues
    const channelName = `friendships-${userId}`;
    console.log(`[useFriends] subscribing to channel ${channelName}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => {
          // Refresh friendships when there's any change
          fetchFriendships(userId);
        }
      )
      .subscribe();

    channelRef.current = channel;

    // R8 FIX: Cleanup only this specific channel, not all channels
    // R10: Added logging for debugging
    return () => {
      if (channelRef.current) {
        console.log(`[useFriends] cleanup channel ${channelName}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, fetchFriendships]);

  const sendFriendRequest = async (friendEmail: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!userId) throw new Error('User not authenticated');

      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', friendEmail)
        .single();

      if (userError) throw new Error('User not found');
      if (userData.id === userId) throw new Error('You cannot add yourself as a friend');

      // Check if friendship already exists
      const { data: existingFriendship, error: checkError } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user1_id.eq.${userId},user2_id.eq.${userData.id}),and(user1_id.eq.${userData.id},user2_id.eq.${userId})`)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingFriendship) throw new Error('Friendship already exists');

      // Create new friendship request
      const { data, error } = await supabase
        .from('friendships')
        .insert({
          user1_id: userId,
          user2_id: userData.id,
          status: 'pending',
          requested_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      if (userId) {
        await fetchFriendships(userId); // Re-fetch friendships to update UI
      }
      return data;
    } catch (error) {
      setError((error as Error).message ?? null);
      console.error('Error sending friend request:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const respondToFriendRequest = async (friendshipId: string, accept: boolean) => {
    try {
      setLoading(true);
      setError(null);

      if (accept) {
        // Accept the request
        const { data, error } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', friendshipId)
          .select()
          .single();

        if (error) throw error;
        if (userId) await fetchFriendships(userId); // Re-fetch after successful update
        return data;
      } else {
        // Reject by deleting the request
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('id', friendshipId);

        if (error) throw error;
        if (userId) await fetchFriendships(userId); // Re-fetch after successful delete
        return null;
      }
    } catch (error) {
      setError((error as Error).message ?? null);
      console.error('Error responding to friend request:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancelSentRequest = async (friendshipId: string) => {
    if (!userId) {
      setError('User not authenticated');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)
        .eq('requested_by', userId) // Ensure the current user is the sender
        .eq('status', 'pending');    // Ensure the request is still pending

      if (deleteError) throw deleteError;

      // Re-fetch friendships to update the UI
      await fetchFriendships(userId);
      return true;
    } catch (error) {
      setError((error as Error).message ?? null);
      console.error('Error cancelling sent friend request:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async (friendshipId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      if (userId) {
        await fetchFriendships(userId);
      }
      return true;
    } catch (error) {
      setError((error as Error).message ?? null);
      console.error('Error removing friend:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    friends,
    pendingRequests,
    sentRequests,
    loading,
    error,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    cancelSentRequest,
    refreshFriends: () => userId && fetchFriendships(userId),
  };
}