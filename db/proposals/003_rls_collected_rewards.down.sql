-- ============================================================
-- ROLLBACK: Proposal 003 - Remove collected_rewards Policies
-- ============================================================
-- Reverts all changes from 003_rls_collected_rewards.up.sql
-- USE ONLY IF MIGRATION CAUSES ISSUES
-- ============================================================

BEGIN;

-- Remove policies
DROP POLICY IF EXISTS "Users can view own collected rewards" ON public.collected_rewards;
DROP POLICY IF EXISTS "Users can collect rewards" ON public.collected_rewards;
DROP POLICY IF EXISTS "Creators can view collections of their rewards" ON public.collected_rewards;

-- Remove unique constraint
ALTER TABLE public.collected_rewards
DROP CONSTRAINT IF EXISTS collected_rewards_unique_claim;

COMMIT;
