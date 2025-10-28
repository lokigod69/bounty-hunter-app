-- Rollback Proposal 008: Remove Atomic Purchase Function
-- Restores database to state before purchase_reward was added

BEGIN;

-- 1. Revoke permissions
REVOKE EXECUTE ON FUNCTION public.purchase_reward(UUID, UUID) FROM authenticated;

-- 2. Drop trigger and trigger function
DROP TRIGGER IF EXISTS enforce_non_negative_balance ON public.user_credits;
DROP FUNCTION IF EXISTS public.prevent_negative_balance();

-- 3. Drop CHECK constraint
ALTER TABLE public.user_credits
DROP CONSTRAINT IF EXISTS user_credits_balance_non_negative;

-- 4. Drop purchase_reward function
DROP FUNCTION IF EXISTS public.purchase_reward(UUID, UUID);

COMMIT;

-- Rollback Notes:
-- - Old purchase_bounty function remains unchanged
-- - Removes all atomic purchase safety mechanisms
-- - Frontend must be updated to revert to old purchase_bounty RPC
-- - WARNING: Rollback removes protection against negative balances
