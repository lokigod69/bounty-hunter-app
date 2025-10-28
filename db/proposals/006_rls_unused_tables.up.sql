-- Proposal 006: Add Minimal RLS to Unused Tables
-- Adds owner-only policies to marketplace_bounties and collected_bounties
-- These tables are unused (app uses rewards_store instead) but exist in schema
-- Minimal RLS prevents data leaks if tables are accidentally queried

BEGIN;

-- 1. Enable RLS on marketplace_bounties (if not already enabled)
ALTER TABLE public.marketplace_bounties ENABLE ROW LEVEL SECURITY;

-- 2. Add owner-only SELECT policy for marketplace_bounties
CREATE POLICY "mb_owner_select"
ON public.marketplace_bounties
FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

-- 3. Add owner-only write policy for marketplace_bounties (INSERT/UPDATE/DELETE)
CREATE POLICY "mb_owner_write"
ON public.marketplace_bounties
FOR ALL
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- 4. Enable RLS on collected_bounties
ALTER TABLE public.collected_bounties ENABLE ROW LEVEL SECURITY;

-- 5. Add owner-only SELECT policy for collected_bounties
CREATE POLICY "cb_owner_select"
ON public.collected_bounties
FOR SELECT
TO authenticated
USING (collector_id = auth.uid());

-- 6. Add owner-only write policy for collected_bounties (INSERT/UPDATE/DELETE)
CREATE POLICY "cb_owner_write"
ON public.collected_bounties
FOR ALL
TO authenticated
USING (collector_id = auth.uid())
WITH CHECK (collector_id = auth.uid());

COMMIT;

-- Note: These tables are NOT used by the app (app uses rewards_store + collected_rewards)
-- This migration adds minimal security to prevent accidental data exposure
-- Future proposal (001) will drop these tables entirely after data verification
