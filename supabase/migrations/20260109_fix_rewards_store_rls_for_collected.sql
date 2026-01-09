-- supabase/migrations/20260109_fix_rewards_store_rls_for_collected.sql
-- Fixes RLS on rewards_store to allow collectors to read redeemed (inactive) rewards.
--
-- Problem: After redeeming a reward (is_active=false), the collector cannot read
-- the reward data because RLS only allows SELECT where is_active=true.
-- This breaks the Collected tab join from collected_rewards -> rewards_store.
--
-- Solution: Private visibility model:
--   1. Creator can always read their own bounties (active + redeemed)
--   2. Assignee can read their assigned bounties ONLY while active (Available tab)
--   3. Collector can read bounties they collected (Collected tab), even after deactivation
--
-- IMPORTANT: We do NOT use "is_active = true" alone, as that would let ANY
-- authenticated user see ALL active bounties, breaking assigned-only visibility.

-- ============================================================
-- STEP 1: Ensure RLS is enabled
-- ============================================================

ALTER TABLE public.rewards_store ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 2: Drop ALL existing SELECT policies on rewards_store
-- ============================================================

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'rewards_store'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.rewards_store;', r.policyname);
  END LOOP;
END$$;

-- ============================================================
-- STEP 3: Create the correct private SELECT policy
-- ============================================================

CREATE POLICY "rewards_store_select_private"
ON public.rewards_store
FOR SELECT
TO authenticated
USING (
  -- Creator can always read their own bounties (for My Bounties management)
  creator_id = auth.uid()

  -- Assignee can read their assigned bounties while they're active (Available tab)
  OR (assigned_to = auth.uid() AND is_active = true)

  -- Collector can read bounties they collected (Collected tab), even after deactivation
  OR EXISTS (
    SELECT 1
    FROM public.collected_rewards cr
    WHERE cr.reward_id = rewards_store.id
      AND cr.collector_id = auth.uid()
  )
);

-- ============================================================
-- Add comment for documentation
-- ============================================================

COMMENT ON POLICY "rewards_store_select_private" ON public.rewards_store IS
'Private visibility: creator always, assignee only while active, collector via collected_rewards join. Fixes Collected tab not showing redeemed rewards while maintaining privacy.';
