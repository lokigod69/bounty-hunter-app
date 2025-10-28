-- ============================================================
-- Proposal 003: Add RLS Policies to collected_rewards
-- ============================================================
-- Priority: P0 (CRITICAL)
-- Date: 2025-01-25
--
-- PROBLEM: collected_rewards has RLS enabled but ZERO policies
-- IMPACT: useCollectedRewards hook returns empty (broken feature)
-- SOLUTION: Add 3 policies + UNIQUE constraint
--
-- CHANGES:
-- 1. Policy: Users can view own collected rewards
-- 2. Policy: Users can collect rewards (via INSERT)
-- 3. Policy: Creators can view collections of their rewards
-- 4. UNIQUE constraint on (reward_id, collector_id) - prevents race conditions
--
-- ROLLBACK: See 003_rls_collected_rewards.down.sql
-- ============================================================

BEGIN;

-- Policy 1: Users can view their own collected rewards
CREATE POLICY "Users can view own collected rewards"
ON public.collected_rewards
FOR SELECT
TO authenticated
USING (collector_id = auth.uid());

-- Policy 2: System can insert collected rewards (via purchase_bounty RPC)
-- Note: INSERT is done by purchase_bounty RPC which runs as SECURITY DEFINER
-- This policy allows authenticated users to collect rewards through the RPC
CREATE POLICY "Users can collect rewards"
ON public.collected_rewards
FOR INSERT
TO authenticated
WITH CHECK (collector_id = auth.uid());

-- Policy 3: Creators can view who collected their rewards (optional - for notifications)
CREATE POLICY "Creators can view collections of their rewards"
ON public.collected_rewards
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rewards_store
    WHERE rewards_store.id = collected_rewards.reward_id
    AND rewards_store.creator_id = auth.uid()
  )
);

-- BONUS: Add missing UNIQUE constraint to prevent race conditions
-- (User requested in overview.md - Fast Fix #2)
ALTER TABLE public.collected_rewards
ADD CONSTRAINT collected_rewards_unique_claim
UNIQUE (reward_id, collector_id);

COMMENT ON CONSTRAINT collected_rewards_unique_claim ON public.collected_rewards IS
  'Prevents duplicate reward collection (race condition protection)';

COMMIT;
