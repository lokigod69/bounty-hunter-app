-- ============================================================
-- Minimal Test Seed Data for Bounty Hunter App
-- ============================================================
-- Purpose: Seed data for local testing of RLS policies and app functionality
-- Created: 2025-01-25
-- ============================================================

BEGIN;

-- Clean existing data (for idempotent seeding)
TRUNCATE TABLE
  public.collected_rewards,
  public.credit_transactions,
  public.user_credits,
  public.tasks,
  public.friendships,
  public.rewards_store,
  public.profiles
CASCADE;

-- ============================================================
-- STEP 1: Create Two Test Users
-- ============================================================

-- User A: "Alice" (Creator/Issuer)
INSERT INTO public.profiles (id, email, display_name, avatar_url, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'alice@bountytest.local',
  'Alice Creator',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
  'user'
);

-- User B: "Bob" (Hunter/Assignee)
INSERT INTO public.profiles (id, email, display_name, avatar_url, role)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'bob@bountytest.local',
  'Bob Hunter',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
  'user'
);

-- ============================================================
-- STEP 2: Create Friendship Between Alice and Bob
-- ============================================================

INSERT INTO public.friendships (id, user1_id, user2_id, status, requested_by)
VALUES (
  'ffffffff-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',  -- Alice
  '22222222-2222-2222-2222-222222222222',  -- Bob
  'accepted',
  '11111111-1111-1111-1111-111111111111'   -- Alice requested
);

-- ============================================================
-- STEP 3: Initialize User Credits
-- ============================================================

-- Alice starts with 500 credits
INSERT INTO public.user_credits (user_id, balance, total_earned)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  500,
  500
);

-- Bob starts with 100 credits
INSERT INTO public.user_credits (user_id, balance, total_earned)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  100,
  100
);

-- ============================================================
-- STEP 4: Create One Task (Alice → Bob)
-- ============================================================

-- Alice creates task for Bob: "Clean the garage"
INSERT INTO public.tasks (
  id,
  created_by,
  assigned_to,
  title,
  description,
  status,
  reward_type,
  reward_text,
  proof_required,
  deadline
)
VALUES (
  'aaaaaaaa-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',  -- Alice (creator)
  '22222222-2222-2222-2222-222222222222',  -- Bob (assignee)
  'Clean the garage',
  'Sweep floor, organize tools, take out trash. Photo proof required.',
  'pending',
  'credits',
  '50 credits',
  true,  -- proof_required
  CURRENT_DATE + INTERVAL '7 days'
);

-- ============================================================
-- STEP 5: Bob Submits Proof
-- ============================================================

-- Update task: Bob submitted proof (status → 'review')
UPDATE public.tasks
SET
  status = 'review',
  proof_url = 'https://example.com/storage/bounty-proofs/garage_clean.jpg',
  proof_type = 'image',
  proof_description = 'Garage cleaned - floor swept and tools organized'
WHERE id = 'aaaaaaaa-1111-1111-1111-111111111111';

-- ============================================================
-- STEP 6: Alice Approves Task
-- ============================================================

-- Update task: Alice approves (status → 'completed')
-- This triggers award_credits_on_completion trigger
UPDATE public.tasks
SET
  status = 'completed',
  completed_at = NOW()
WHERE id = 'aaaaaaaa-1111-1111-1111-111111111111';

-- Manually award credits (since trigger may not run in seed context)
-- NOTE: In production, this is done by trigger automatically
UPDATE public.user_credits
SET
  balance = balance + 50,
  total_earned = total_earned + 50,
  updated_at = NOW()
WHERE user_id = '22222222-2222-2222-2222-222222222222';  -- Bob

-- Log transaction
INSERT INTO public.credit_transactions (user_id, task_id, amount, transaction_type)
VALUES (
  '22222222-2222-2222-2222-222222222222',  -- Bob
  'aaaaaaaa-1111-1111-1111-111111111111',  -- Task ID
  50,
  'earned'
);

-- ============================================================
-- STEP 7: Create One Bounty (Alice's Reward for Bob)
-- ============================================================

-- Alice creates a bounty "Movie Tickets" for Bob
INSERT INTO public.rewards_store (
  id,
  name,
  description,
  image_url,
  credit_cost,
  creator_id,
  assigned_to,
  is_active
)
VALUES (
  'bbbbbbbb-1111-1111-1111-111111111111',
  'Movie Tickets (2x)',
  'Two tickets to any showing at AMC Theater',
  'https://api.dicebear.com/7.x/icons/svg?seed=Ticket',
  100,  -- costs 100 credits
  '11111111-1111-1111-1111-111111111111',  -- Alice (creator)
  '22222222-2222-2222-2222-222222222222',  -- Bob (assigned_to)
  true
);

-- ============================================================
-- STEP 8: Bob Claims the Bounty
-- ============================================================

-- Bob collects the movie tickets bounty
INSERT INTO public.collected_rewards (
  id,
  reward_id,
  collector_id,
  collected_at
)
VALUES (
  'cccccccc-1111-1111-1111-111111111111',
  'bbbbbbbb-1111-1111-1111-111111111111',  -- Movie tickets
  '22222222-2222-2222-2222-222222222222',  -- Bob
  NOW()
);

-- Deduct credits from Bob
UPDATE public.user_credits
SET
  balance = balance - 100,
  updated_at = NOW()
WHERE user_id = '22222222-2222-2222-2222-222222222222';  -- Bob

-- Log transaction
INSERT INTO public.credit_transactions (user_id, amount, transaction_type)
VALUES (
  '22222222-2222-2222-2222-222222222222',  -- Bob
  -100,
  'spent'
);

COMMIT;

-- ============================================================
-- Verification Queries
-- ============================================================

-- Check profiles created
SELECT id, display_name, email FROM public.profiles ORDER BY display_name;
-- Expected: 2 rows (Alice, Bob)

-- Check friendship
SELECT user1.display_name AS user1, user2.display_name AS user2, status
FROM public.friendships f
JOIN public.profiles user1 ON f.user1_id = user1.id
JOIN public.profiles user2 ON f.user2_id = user2.id;
-- Expected: 1 row (Alice ↔ Bob, accepted)

-- Check credits
SELECT p.display_name, uc.balance, uc.total_earned
FROM public.user_credits uc
JOIN public.profiles p ON uc.user_id = p.id
ORDER BY p.display_name;
-- Expected: Alice (500, 500), Bob (50, 150)
--   Note: Bob earned 50 from task + 100 initial = 150 total_earned
--         Bob spent 100 on bounty: 150 - 100 = 50 balance

-- Check task
SELECT
  creator.display_name AS creator,
  assignee.display_name AS assignee,
  t.title,
  t.status,
  t.proof_required
FROM public.tasks t
JOIN public.profiles creator ON t.created_by = creator.id
JOIN public.profiles assignee ON t.assigned_to = assignee.id;
-- Expected: 1 row (Alice → Bob, "Clean the garage", completed, true)

-- Check reward
SELECT
  creator.display_name AS creator,
  assigned.display_name AS assigned_to,
  r.name,
  r.credit_cost,
  r.is_active
FROM public.rewards_store r
JOIN public.profiles creator ON r.creator_id = creator.id
JOIN public.profiles assigned ON r.assigned_to = assigned.id;
-- Expected: 1 row (Alice → Bob, "Movie Tickets (2x)", 100, true)

-- Check collected reward
SELECT
  collector.display_name AS collector,
  reward.name AS reward_name,
  cr.collected_at
FROM public.collected_rewards cr
JOIN public.profiles collector ON cr.collector_id = collector.id
JOIN public.rewards_store reward ON cr.reward_id = reward.id;
-- Expected: 1 row (Bob, "Movie Tickets (2x)", timestamp)

-- Check credit transactions
SELECT
  p.display_name,
  ct.amount,
  ct.transaction_type,
  t.title AS task_title
FROM public.credit_transactions ct
JOIN public.profiles p ON ct.user_id = p.id
LEFT JOIN public.tasks t ON ct.task_id = t.id
ORDER BY ct.created_at;
-- Expected: 2 rows
--   1. Bob, +50, earned, "Clean the garage"
--   2. Bob, -100, spent, NULL

-- ============================================================
-- Test RLS Policies (Run these as authenticated users)
-- ============================================================

-- As Bob (22222222-2222-2222-2222-222222222222):
--   SET LOCAL auth.jwt_claims.sub TO '22222222-2222-2222-2222-222222222222';
--   SELECT * FROM tasks WHERE assigned_to = auth.uid();
--   -- Should return: 1 task (Clean the garage)
--
--   SELECT * FROM collected_rewards WHERE collector_id = auth.uid();
--   -- Should return: 1 reward (Movie Tickets)
--
--   SELECT * FROM user_credits WHERE user_id = auth.uid();
--   -- Should return: 1 row (balance=50, total_earned=150)

-- As Alice (11111111-1111-1111-1111-111111111111):
--   SET LOCAL auth.jwt_claims.sub TO '11111111-1111-1111-1111-111111111111';
--   SELECT * FROM tasks WHERE created_by = auth.uid();
--   -- Should return: 1 task (Clean the garage)
--
--   SELECT * FROM rewards_store WHERE creator_id = auth.uid();
--   -- Should return: 1 reward (Movie Tickets)

-- ============================================================
-- Cleanup (if needed)
-- ============================================================
-- TRUNCATE TABLE public.collected_rewards, public.credit_transactions, public.user_credits, public.tasks, public.friendships, public.rewards_store, public.profiles CASCADE;
