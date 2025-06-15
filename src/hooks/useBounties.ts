// src/hooks/useBounties.ts
// This hook manages fetching, creating, and purchasing bounties for the Bounty Store, and triggers notifications.
// Fixed import path for supabase and explicitly typed catch block errors.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Bounty, NewBountyData } from '../types/database';
import { PostgrestError } from '@supabase/supabase-js';
import { useAuth } from './useAuth'; // To get the current user for creator_id
import { toast } from 'react-hot-toast';

export interface UseBountiesReturn {
  bounties: Bounty[];
  isLoadingBounties: boolean;
  bountiesError: string | null;
  fetchBounties: () => Promise<void>;
  createBounty: (bountyData: NewBountyData) => Promise<{ success: boolean; bounty_id?: string; message: string }>;
  isCreatingBounty: boolean;
  createBountyError: string | null;
  purchaseBounty: (bountyId: string) => Promise<{ success: boolean; message: string }>;
  isPurchasingBounty: boolean;
  purchaseBountyError: string | null;
  triggerNotification: (bountyId: string, collectorId: string) => Promise<void>;
}

export const useBounties = (): UseBountiesReturn => {
  const { user } = useAuth();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [isLoadingBounties, setIsLoadingBounties] = useState<boolean>(false);
  const [bountiesError, setBountiesError] = useState<string | null>(null);

  const [isCreatingBounty, setIsCreatingBounty] = useState<boolean>(false);
  const [createBountyError, setCreateBountyError] = useState<string | null>(null);

  const [isPurchasingBounty, setIsPurchasingBounty] = useState<boolean>(false);
  const [purchaseBountyError, setPurchaseBountyError] = useState<string | null>(null);

  const triggerNotification = async (bountyId: string, collectorId: string) => {
    try {
      const { error: functionError } = await supabase.functions.invoke('notify-bounty-creator', {
        body: { bounty_id: bountyId, collector_id: collectorId },
      });
      if (functionError) {
        throw functionError;
      }
      console.log('Successfully triggered notify-bounty-creator function.');
    } catch (err) {
      console.error('Error triggering notification function:', err);
      // Optionally, notify the user or log this more formally
      // For now, we'll just log it, as the primary purchase was successful.
    }
  };

  const fetchBounties = useCallback(async () => {
    setIsLoadingBounties(true);
    setBountiesError(null);
    try {
      const { data, error } = await supabase
        .from('bounties')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setBounties(data || []);
    } catch (err) {
      let errorMessage = 'Failed to fetch bounties.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      // Check if it's a PostgrestError for more specific details
      const postgrestError = err as PostgrestError;
      if (postgrestError && postgrestError.message) {
        errorMessage = postgrestError.message;
      }
      console.error('Error fetching bounties:', errorMessage);
      setBountiesError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsLoadingBounties(false);
    }
  }, []);

  useEffect(() => {
    // Optionally, fetch bounties on initial load if desired
    // fetchBounties(); 
  }, [fetchBounties]);

  const createBounty = async (bountyData: NewBountyData): Promise<{ success: boolean; bounty_id?: string; message: string }> => {
    if (!user) {
      const msg = 'User must be logged in to create a bounty.';
      toast.error(msg);
      return { success: false, message: msg };
    }

    setIsCreatingBounty(true);
    setCreateBountyError(null);

    try {
      const { data, error } = await supabase.rpc('create_bounty', {
        p_name: bountyData.name,
        p_description: bountyData.description,
        p_image_url: bountyData.image_url,
        p_credit_cost: bountyData.credit_cost,
        p_creator_id: user.id,
      });

      if (error) {
        throw error;
      }
      
      const result = data as { success: boolean; bounty_id?: string; message: string };

      if (result.success) {
        toast.success(result.message || 'Bounty created successfully!');
        fetchBounties(); // Refresh the list of bounties
        return { success: true, bounty_id: result.bounty_id, message: result.message };
      } else {
        throw new Error(result.message || 'Failed to create bounty.');
      }

    } catch (err) {
      let errorMessage = 'An unexpected error occurred while creating the bounty.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      // Check if it's a PostgrestError for more specific details
      const postgrestError = err as PostgrestError;
      if (postgrestError && postgrestError.message) {
        errorMessage = postgrestError.message;
      }
      console.error('Error creating bounty:', errorMessage);
      setCreateBountyError(errorMessage);
      toast.error(`Error creating bounty: ${errorMessage}`);
      return { success: false, message: errorMessage };
    } finally {
      setIsCreatingBounty(false);
    }
  };

  const purchaseBounty = async (bountyId: string): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      const msg = 'User must be logged in to purchase a bounty.';
      toast.error(msg);
      return { success: false, message: msg };
    }

    setIsPurchasingBounty(true);
    setPurchaseBountyError(null);
    let purchaseSuccessful = false; // Flag to track if RPC succeeded

    try {
      const { data, error } = await supabase.rpc('purchase_bounty', {
        p_bounty_id: bountyId,
        p_collector_id: user.id,
      });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; message: string };

      if (result.success) {
        toast.success(result.message || 'Bounty collected successfully!');
        // Potentially refresh user's credit balance display elsewhere
        // Optionally, could remove the bounty from the local list or mark as collected
        // For now, a full refetch of bounties might hide it if it's single-purchase (not implemented yet)
        fetchBounties(); // Or more targeted state update
        purchaseSuccessful = true; // Mark as successful before returning
        return { success: true, message: result.message };
      } else {
        throw new Error(result.message || 'Failed to purchase bounty.');
      }

    } catch (err) {
      let errorMessage = 'An unexpected error occurred while purchasing the bounty.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      const postgrestError = err as PostgrestError;
      if (postgrestError && postgrestError.message) {
        errorMessage = postgrestError.message;
      }
      console.error('Error purchasing bounty:', errorMessage);
      setPurchaseBountyError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
      return { success: false, message: errorMessage };
    } finally {
      setIsPurchasingBounty(false);
      if (purchaseSuccessful && user) {
        // If purchase was successful and user is available, trigger notification
        await triggerNotification(bountyId, user.id);
      }
    }
  };

  return {
    bounties,
    isLoadingBounties,
    bountiesError,
    fetchBounties,
    createBounty,
    isCreatingBounty,
    createBountyError,
    purchaseBounty,
    isPurchasingBounty,
    purchaseBountyError,
    triggerNotification, // Expose if needed directly, though usually internal
  };
};
