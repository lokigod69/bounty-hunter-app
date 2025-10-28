-- Rollback Proposal 006: Remove RLS from Unused Tables
-- Removes policies and disables RLS on marketplace_bounties and collected_bounties

BEGIN;

-- 1. Drop policies for marketplace_bounties
DROP POLICY IF EXISTS "mb_owner_select" ON public.marketplace_bounties;
DROP POLICY IF EXISTS "mb_owner_write" ON public.marketplace_bounties;

-- 2. Disable RLS on marketplace_bounties
ALTER TABLE public.marketplace_bounties DISABLE ROW LEVEL SECURITY;

-- 3. Drop policies for collected_bounties
DROP POLICY IF EXISTS "cb_owner_select" ON public.collected_bounties;
DROP POLICY IF EXISTS "cb_owner_write" ON public.collected_bounties;

-- 4. Disable RLS on collected_bounties
ALTER TABLE public.collected_bounties DISABLE ROW LEVEL SECURITY;

COMMIT;

-- Note: This rollback restores tables to unsecured state
-- Only use if migration causes issues with planned table drops (Proposal 001)
