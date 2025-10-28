-- Validation Queries for Proposal 008: Atomic Purchase
-- These queries verify the migration was applied correctly and test concurrency

-- ========================================
-- Part 1: Schema Validation
-- ========================================

-- 1.1: Verify purchase_reward function exists
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_mode
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'purchase_reward';
-- Expected: 1 row with function_name = 'purchase_reward', security_mode = 'SECURITY DEFINER'

-- 1.2: Verify CHECK constraint exists
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.user_credits'::regclass
  AND conname = 'user_credits_balance_non_negative';
-- Expected: 1 row with constraint_type = 'c' (CHECK), definition = 'CHECK ((balance >= 0))'

-- 1.3: Verify trigger exists
SELECT
  tgname AS trigger_name,
  tgtype AS trigger_type,
  proname AS trigger_function
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'public.user_credits'::regclass
  AND t.tgname = 'enforce_non_negative_balance';
-- Expected: 1 row with trigger_name = 'enforce_non_negative_balance'

-- 1.4: Verify UNIQUE constraint on collected_rewards (from Proposal 003)
SELECT
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.collected_rewards'::regclass
  AND conname = 'collected_rewards_unique_claim';
-- Expected: 1 row with constraint_type = 'u' (UNIQUE)

-- ========================================
-- Part 2: Functional Testing
-- ========================================

-- 2.1: Test successful purchase (requires test data)
-- Prerequisites:
--   - Test user exists with sufficient balance (e.g., 100 credits)
--   - Test reward exists (e.g., costs 50 credits)
--
-- SELECT purchase_reward(
--   '<test_reward_id>'::UUID,
--   '<test_user_id>'::UUID
-- );
-- Expected: {"success": true, "message": "Reward purchased successfully", ...}

-- 2.2: Test insufficient funds error
-- Prerequisites:
--   - Test user exists with low balance (e.g., 10 credits)
--   - Test reward exists with high cost (e.g., 100 credits)
--
-- SELECT purchase_reward(
--   '<expensive_reward_id>'::UUID,
--   '<poor_user_id>'::UUID
-- );
-- Expected: {"success": false, "error": "INSUFFICIENT_FUNDS", ...}

-- 2.3: Test duplicate purchase prevention
-- Prerequisites:
--   - User has already purchased a specific reward
--
-- SELECT purchase_reward(
--   '<already_purchased_reward_id>'::UUID,
--   '<user_id>'::UUID
-- );
-- Expected: {"success": false, "error": "ALREADY_COLLECTED", ...}

-- 2.4: Test self-purchase prevention
-- Prerequisites:
--   - User is creator of a reward
--
-- SELECT purchase_reward(
--   '<own_reward_id>'::UUID,
--   '<creator_user_id>'::UUID
-- );
-- Expected: {"success": false, "error": "SELF_PURCHASE", ...}

-- ========================================
-- Part 3: Concurrency Testing (Manual)
-- ========================================

-- 3.1: Setup concurrency test
-- Create a test user with exactly 100 credits
-- Create two test rewards, each costing 60 credits

-- Run these two queries in PARALLEL sessions (using separate psql connections):
--
-- Session 1:
-- SELECT purchase_reward('<reward_1_id>'::UUID, '<test_user_id>'::UUID);
--
-- Session 2:
-- SELECT purchase_reward('<reward_2_id>'::UUID, '<test_user_id>'::UUID);
--
-- Expected Result:
--   - Exactly ONE purchase succeeds
--   - One returns: {"success": true, ...}
--   - Other returns: {"success": false, "error": "INSUFFICIENT_FUNDS", ...}
--   - Final balance = 40 (100 - 60)

-- 3.2: Verify no negative balances after concurrency test
SELECT user_id, balance
FROM public.user_credits
WHERE balance < 0;
-- Expected: 0 rows (no negative balances)

-- 3.3: Verify credit_transactions log
-- Check that all purchases have corresponding transaction records
SELECT
  ct.user_id,
  ct.delta,
  ct.reason,
  ct.reference_id AS reward_id,
  ct.created_at
FROM public.credit_transactions ct
WHERE ct.reason = 'reward_purchase'
ORDER BY ct.created_at DESC
LIMIT 10;
-- Expected: Each successful purchase has a corresponding negative delta transaction

-- ========================================
-- Part 4: Constraint Testing
-- ========================================

-- 4.1: Test CHECK constraint enforcement (should fail)
-- UPDATE public.user_credits
-- SET balance = -10
-- WHERE user_id = '<test_user_id>'::UUID;
-- Expected: ERROR - new row violates check constraint "user_credits_balance_non_negative"

-- 4.2: Test trigger enforcement (should fail)
-- UPDATE public.user_credits
-- SET balance = balance - 1000  -- Force negative
-- WHERE user_id = '<test_user_id>'::UUID;
-- Expected: ERROR - Balance cannot be negative

-- ========================================
-- Part 5: Data Integrity Verification
-- ========================================

-- 5.1: Verify all collected_rewards have corresponding transactions
SELECT
  cr.reward_id,
  cr.collector_id,
  cr.collected_at,
  ct.delta AS transaction_delta,
  ct.created_at AS transaction_time
FROM public.collected_rewards cr
LEFT JOIN public.credit_transactions ct
  ON ct.user_id = cr.collector_id
  AND ct.reference_id = cr.reward_id
  AND ct.reason = 'reward_purchase'
WHERE cr.collected_at > NOW() - INTERVAL '7 days'  -- Recent purchases
ORDER BY cr.collected_at DESC;
-- Expected: All rows have matching transaction_delta (should be negative)

-- 5.2: Verify balance integrity (sum of transactions = current balance)
SELECT
  uc.user_id,
  uc.balance AS current_balance,
  COALESCE(SUM(ct.delta), 0) AS calculated_balance,
  uc.balance - COALESCE(SUM(ct.delta), 0) AS discrepancy
FROM public.user_credits uc
LEFT JOIN public.credit_transactions ct ON ct.user_id = uc.user_id
GROUP BY uc.user_id, uc.balance
HAVING uc.balance - COALESCE(SUM(ct.delta), 0) <> 0;
-- Expected: 0 rows (no discrepancies between balance and transaction sum)
-- Note: This assumes all balance changes go through credit_transactions

-- ========================================
-- Summary Validation Checklist
-- ========================================
-- [ ] purchase_reward function exists with SECURITY DEFINER
-- [ ] CHECK constraint prevents negative balances
-- [ ] Trigger enforces non-negative balance on UPDATE
-- [ ] UNIQUE constraint prevents duplicate purchases
-- [ ] Successful purchase returns success JSON
-- [ ] Insufficient funds returns INSUFFICIENT_FUNDS error
-- [ ] Duplicate purchase returns ALREADY_COLLECTED error
-- [ ] Self-purchase returns SELF_PURCHASE error
-- [ ] Concurrent purchases: exactly 1 succeeds
-- [ ] No negative balances exist in database
-- [ ] All purchases have corresponding credit_transactions
-- [ ] Balance integrity verified (sum of transactions = balance)
