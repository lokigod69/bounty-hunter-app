-- supabase/migrations/20260109_fix_collected_at_default.sql
-- Fixes the collected_at column and enforces one-time global claim per reward.
--
-- Problem: collected_rewards.collected_at was NULL for existing records because:
-- 1. The column had no default value
-- 2. The RPC was not setting it explicitly on insert
--
-- Solution:
-- 1. Add default now() to collected_at column
-- 2. Backfill NULL values using created_at (if exists) or now()
-- 3. Add UNIQUE constraint on reward_id for one-time global claim

-- Step 1: Add default to collected_at
ALTER TABLE public.collected_rewards
  ALTER COLUMN collected_at SET DEFAULT now();

-- Step 2: Backfill NULL values
-- Use created_at if available, otherwise use now()
UPDATE public.collected_rewards
SET collected_at = COALESCE(created_at, now())
WHERE collected_at IS NULL;

-- Step 3: Make collected_at NOT NULL now that all values are populated
ALTER TABLE public.collected_rewards
  ALTER COLUMN collected_at SET NOT NULL;

-- Step 4: Add UNIQUE constraint on reward_id (each reward can only be collected once globally)
-- Drop existing constraint if it exists, then add
ALTER TABLE public.collected_rewards
  DROP CONSTRAINT IF EXISTS collected_rewards_reward_id_unique;
ALTER TABLE public.collected_rewards
  ADD CONSTRAINT collected_rewards_reward_id_unique UNIQUE (reward_id);

-- Add comments for clarity
COMMENT ON COLUMN public.collected_rewards.collected_at IS 'Timestamp when reward was collected/redeemed. Defaults to now().';
COMMENT ON CONSTRAINT collected_rewards_reward_id_unique ON public.collected_rewards IS 'Each reward can only be collected once globally (one-time claim).';
