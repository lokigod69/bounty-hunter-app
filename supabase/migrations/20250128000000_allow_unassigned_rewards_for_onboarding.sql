-- Migration: Allow unassigned rewards for onboarding
-- This enables users to create rewards during onboarding without requiring friendships

-- Step 1: Make assigned_to nullable to allow unassigned rewards
ALTER TABLE public.rewards_store 
  ALTER COLUMN assigned_to DROP NOT NULL;

-- Step 2: Add RLS policy for creating unassigned rewards during onboarding
-- This allows users to create rewards with assigned_to = NULL if they are the creator
CREATE POLICY "Create unassigned rewards for onboarding"
ON public.rewards_store
FOR INSERT
TO authenticated
WITH CHECK (
  creator_id = auth.uid() 
  AND assigned_to IS NULL
);

-- Note: The existing "Create bounties for friends" policy still applies for assigned rewards
-- This new policy allows unassigned rewards, giving users flexibility during onboarding

