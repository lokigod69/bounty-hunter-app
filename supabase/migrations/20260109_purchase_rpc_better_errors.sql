-- supabase/migrations/20260109_purchase_rpc_better_errors.sql
-- Improves error visibility and security in purchase_reward_store_item RPC.
-- v3: Uses auth.uid(), enforces assigned_to, sets is_active=false after collection.

-- Drop old versions
DROP FUNCTION IF EXISTS purchase_reward_store_item(UUID, UUID);
DROP FUNCTION IF EXISTS purchase_reward_store_item(UUID);

CREATE OR REPLACE FUNCTION purchase_reward_store_item(p_reward_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_collector_id UUID := auth.uid();
  reward_info RECORD;
  can_decrement BOOLEAN;
  new_collection_id UUID;
BEGIN
  -- Auth check
  IF v_collector_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Not authenticated.');
  END IF;

  -- 1. Check if the reward exists, is active, and get its details including assigned_to
  SELECT id, name, credit_cost, creator_id, assigned_to INTO reward_info
  FROM public.rewards_store
  WHERE id = p_reward_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Reward not found or is not active.');
  END IF;

  -- 2. Enforce assigned_to: only the assigned user can collect this reward
  IF reward_info.assigned_to IS DISTINCT FROM v_collector_id THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'This reward is not assigned to you.');
  END IF;

  -- 3. Check if the collector is trying to buy their own reward
  IF reward_info.creator_id = v_collector_id THEN
     RETURN jsonb_build_object('success', FALSE, 'message', 'You cannot collect your own reward.');
  END IF;

  -- 4. Check if the user has already collected this reward
  IF EXISTS (
    SELECT 1 FROM public.collected_rewards
    WHERE reward_id = p_reward_id AND collector_id = v_collector_id
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'You have already collected this reward.');
  END IF;

  -- 5. Attempt to decrement user credits
  SELECT decrement_user_credits(v_collector_id, reward_info.credit_cost) INTO can_decrement;

  IF NOT can_decrement THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Insufficient credits or error deducting credits.');
  END IF;

  -- 6. Insert into collected_rewards (explicitly set collected_at)
  BEGIN
    INSERT INTO public.collected_rewards (reward_id, collector_id, collected_at)
    VALUES (p_reward_id, v_collector_id, now())
    RETURNING id INTO new_collection_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to insert into collected_rewards. Reward ID: %, Collector ID: %, Error: %', p_reward_id, v_collector_id, SQLERRM;
      -- Attempt to refund
      PERFORM increment_user_credits(v_collector_id, reward_info.credit_cost);
      RETURN jsonb_build_object('success', FALSE, 'message', 'Failed to record reward collection: ' || SQLERRM);
  END;

  -- 7. Mark reward as inactive (moves it from Available to Collected at DB level)
  UPDATE public.rewards_store
  SET is_active = FALSE, updated_at = now()
  WHERE id = p_reward_id;

  -- 8. Success
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Reward collected successfully!',
    'collection_id', new_collection_id,
    'reward_name', reward_info.name
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in purchase_reward_store_item: %', SQLERRM;
    RETURN jsonb_build_object('success', FALSE, 'message', 'Purchase failed: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION purchase_reward_store_item(UUID) TO authenticated;

COMMENT ON FUNCTION purchase_reward_store_item(UUID) IS 'Allows an authenticated user to collect a reward assigned to them. v3: Enforces assigned_to check, sets is_active=false after collection, uses auth.uid() for security.';
