// src/hooks/useFriends.ts
// Custom hook for managing friendships
// Changes:
// - Added `cancelSentRequest` function to allow users to cancel their own pending sent friend requests.
// - Updated respondToFriendRequest to re-fetch friendships on success for immediate UI update.
// - Addressed lint errors: removed unused FriendshipStatus, fixed useEffect dependencies, handled unused variables, reordered function for 'used before declaration'.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database'; // Removed FriendshipStatus

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

  // Memoize setupRealtimeSubscription to stabilize its reference for useEffect
  // Moved before useEffect to prevent 'used before declaration' error.
  const setupRealtimeSubscription = useCallback(() => {
    supabase // Removed 'const friendshipsChannel =' assignment
      .channel('friendships-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => { // Removed _payload as it's unused and assuming the signature allows a no-arg callback
          // Refresh friendships when there's any change
          if (userId) {
            fetchFriendships(userId);
          }
        }
      )
      .subscribe();
  }, [userId]); // Added userId as a dependency for useCallback as fetchFriendships (called inside) depends on it

  useEffect(() => {
    if (userId) {
      fetchFriendships(userId);
      setupRealtimeSubscription();
    }

    return () => {
      supabase.removeAllChannels();
    };
  }, [userId, setupRealtimeSubscription]); // Added setupRealtimeSubscription to dependencies

  const fetchFriendships = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get all friendships where user is involved
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (error) throw error;

      // Process friendships
      const acceptedFriends: FriendWithProfile[] = [];
      const received: FriendWithProfile[] = [];
      const sent: FriendWithProfile[] = [];

      for (const friendship of data) {
        // Determine which user is the friend
        const friendId = friendship.user1_id === userId ? friendship.user2_id : friendship.user1_id;
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
          if (friendship.requested_by === userId) {
            sent.push(friendWithProfile);
          } else {
            received.push(friendWithProfile);
          }
        }
      }

      setFriends(acceptedFriends);
      setPendingRequests(received);
      setSentRequests(sent);
    } catch (e) { // Changed 'error' to 'e' for clarity
      let errorMessage: string | null = null;
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      } else {
        errorMessage = 'An unexpected error occurred while fetching friendships.';
      }
      setError(errorMessage);
      console.error('Error fetching friendships:', e); // Log the original error object
    } finally {
      setLoading(false);
    }
  };

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