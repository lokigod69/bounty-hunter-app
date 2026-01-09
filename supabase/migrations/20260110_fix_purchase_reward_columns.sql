-- Fix purchase_reward function to use correct column names
-- Issue: credit_transactions table uses 'amount' not 'delta', 'transaction_type' not 'reason'
-- Original proposal 008 had wrong column names

BEGIN;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.purchase_reward(UUID, UUID);

-- Create corrected atomic purchase function
CREATE OR REPLACE FUNCTION public.purchase_reward(
  p_reward_id UUID,
  p_collector_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reward_cost INTEGER;
  v_reward_creator UUID;
  v_current_balance INTEGER;
  v_reward_name TEXT;
BEGIN
  -- Step 1: Lock the user's credit row and get current balance
  SELECT balance INTO v_current_balance
  FROM public.user_credits
  WHERE user_id = p_collector_id
  FOR UPDATE;  -- Lock row for transaction duration

  -- If user has no credit record, treat as zero balance
  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;

  -- Step 2: Get reward details and verify it exists and is active
  SELECT credit_cost, creator_id, name
  INTO v_reward_cost, v_reward_creator, v_reward_name
  FROM public.rewards_store
  WHERE id = p_reward_id AND is_active = true;

  IF v_reward_cost IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'REWARD_NOT_FOUND',
      'message', 'Reward not found or inactive'
    );
  END IF;

  -- Step 3: Prevent self-purchase
  IF v_reward_creator = p_collector_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'SELF_PURCHASE',
      'message', 'Cannot purchase your own reward'
    );
  END IF;

  -- Step 4: Check sufficient balance
  IF v_current_balance < v_reward_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INSUFFICIENT_FUNDS',
      'message', 'Insufficient credits',
      'required', v_reward_cost,
      'available', v_current_balance
    );
  END IF;

  -- Step 5: Insert into collected_rewards (UNIQUE constraint prevents duplicates)
  BEGIN
    INSERT INTO public.collected_rewards (reward_id, collector_id)
    VALUES (p_reward_id, p_collector_id);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN json_build_object(
        'success', false,
        'error', 'ALREADY_COLLECTED',
        'message', 'You have already collected this reward'
      );
  END;

  -- Step 6: Record transaction in credit_transactions
  -- FIXED: Use correct column names (amount, transaction_type) not (delta, reason)
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    task_id  -- NULL for reward purchases
  ) VALUES (
    p_collector_id,
    -v_reward_cost,  -- Negative amount for purchase/spent
    'spent',
    NULL
  );

  -- Step 7: Deduct credits from user_credits
  UPDATE public.user_credits
  SET balance = balance - v_reward_cost,
      updated_at = NOW()
  WHERE user_id = p_collector_id;

  -- Step 8: Mark reward as redeemed (is_active = false)
  UPDATE public.rewards_store
  SET is_active = false
  WHERE id = p_reward_id;

  -- Success response
  RETURN json_build_object(
    'success', true,
    'message', 'Reward purchased successfully',
    'reward_id', p_reward_id,
    'reward_name', v_reward_name,
    'cost', v_reward_cost,
    'new_balance', v_current_balance - v_reward_cost
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.purchase_reward(UUID, UUID) TO authenticated;

COMMIT;
