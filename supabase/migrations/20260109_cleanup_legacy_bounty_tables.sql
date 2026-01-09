-- supabase/migrations/20260109_cleanup_legacy_bounty_tables.sql
-- Eliminates the "two universes" problem by removing legacy bounty tables.
--
-- CANONICAL TABLES (keep these):
--   - public.rewards_store
--   - public.collected_rewards
--
-- LEGACY TABLES (remove these):
--   - public.marketplace_bounties
--   - public.collected_bounties
--
-- The frontend already uses rewards_store + collected_rewards exclusively.
-- The purchase_reward_store_item RPC already inserts into collected_rewards.
-- Legacy tables are ghost data that cause confusion.

-- ============================================================
-- STEP 1: Drop legacy RPCs that write to legacy tables
-- ============================================================

-- Drop the old purchase_bounty RPC (writes to marketplace_bounties/collected_bounties)
DROP FUNCTION IF EXISTS public.purchase_bounty(UUID, UUID);

-- Drop the old create_bounty RPC (writes to marketplace_bounties)
DROP FUNCTION IF EXISTS public.create_bounty(TEXT, TEXT, TEXT, INTEGER, UUID);

-- Drop any handle_bounties_updated_at trigger function if it exists
DROP FUNCTION IF EXISTS public.handle_bounties_updated_at() CASCADE;

-- ============================================================
-- STEP 2: Drop legacy tables
-- ============================================================

-- Must drop collected_bounties first due to FK constraint to marketplace_bounties
DROP TABLE IF EXISTS public.collected_bounties CASCADE;
DROP TABLE IF EXISTS public.marketplace_bounties CASCADE;

-- ============================================================
-- STEP 3: Add comments for clarity
-- ============================================================

COMMENT ON TABLE public.rewards_store IS 'Canonical rewards/bounties table. Items assigned by friends for users to claim with credits.';
COMMENT ON TABLE public.collected_rewards IS 'Canonical collection records. Links collectors to rewards they have redeemed.';

-- ============================================================
-- VERIFICATION QUERIES (run these after migration to confirm)
-- ============================================================
--
-- 1. Confirm only canonical tables exist:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public' AND table_name IN ('rewards_store', 'collected_rewards', 'marketplace_bounties', 'collected_bounties');
--    Expected: rewards_store, collected_rewards only
--
-- 2. Confirm purchase RPC signature:
--    SELECT proname, pg_get_function_arguments(oid)
--    FROM pg_proc WHERE proname = 'purchase_reward_store_item';
--    Expected: purchase_reward_store_item(p_reward_id uuid)
--
-- 3. Test a select from collected_rewards:
--    SELECT id, reward_id, collector_id, collected_at FROM collected_rewards LIMIT 5;
--
-- 4. Confirm legacy RPCs are gone:
--    SELECT proname FROM pg_proc WHERE proname IN ('purchase_bounty', 'create_bounty');
--    Expected: empty result
