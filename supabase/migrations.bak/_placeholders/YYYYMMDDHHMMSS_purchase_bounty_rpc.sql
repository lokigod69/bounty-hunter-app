-- supabase/migrations/YYYYMMDDHHMMSS_purchase_reward_store_item_rpc.sql
-- Adds an RPC function for users to purchase/collect items from the rewards store.

CREATE OR REPLACE FUNCTION purchase_reward_store_item(p_reward_id UUID, p_collector_id UUID)
RETURNS JSONB AS $$
DECLARE
  reward_info RECORD;
  can_decrement BOOLEAN;
  new_collection_id UUID;
BEGIN
  -- 1. Check if the reward exists, is active, and get its cost
  SELECT id, name, credit_cost, creator_id INTO reward_info
  FROM public.rewards_store
  WHERE id = p_reward_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Reward not found or is not active.');
  END IF;

  -- 2. Check if the collector is trying to buy their own reward (optional rule, can be removed if not desired)
  IF reward_info.creator_id = p_collector_id THEN
     RETURN jsonb_build_object('success', FALSE, 'message', 'You cannot collect your own reward.');
  END IF;

  -- 3. Check if the user has already collected this reward
  IF EXISTS (
    SELECT 1 FROM public.collected_rewards
    WHERE reward_id = p_reward_id AND collector_id = p_collector_id
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'You have already collected this reward.');
  END IF;

  -- 4. Attempt to decrement user credits
  SELECT decrement_user_credits(p_collector_id, reward_info.credit_cost) INTO can_decrement;

  IF NOT can_decrement THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Insufficient credits or error deducting credits.');
  END IF;

  -- 5. Insert into collected_rewards
  BEGIN
    INSERT INTO public.collected_rewards (reward_id, collector_id)
    VALUES (p_reward_id, p_collector_id)
    RETURNING id INTO new_collection_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- If collection fails, we should ideally roll back the credit deduction.
      -- A more robust solution would involve a single transaction or ensuring decrement_user_credits is idempotent or reversible.
      -- For now, we'll proceed and log, but this is a point for future improvement if issues arise.
      RAISE WARNING 'Failed to insert into collected_rewards after deducting credits. Reward ID: %, Collector ID: %, Error: %', p_reward_id, p_collector_id, SQLERRM;
      -- Attempt to refund (best effort)
      PERFORM increment_user_credits(p_collector_id, reward_info.credit_cost);
      RETURN jsonb_build_object('success', FALSE, 'message', 'Failed to record reward collection. Credits may have been refunded.');
  END;

  -- 6. Success
  -- The email notification to the reward creator would typically be handled by a trigger on 'collected_rewards' table (insert) 
  -- that calls an edge function, or by client-side logic after successful purchase.
  RETURN jsonb_build_object(
    'success', TRUE, 
    'message', 'Reward collected successfully!', 
    'collection_id', new_collection_id,
    'reward_name', reward_info.name
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in purchase_reward_store_item: %', SQLERRM;
    RETURN jsonb_build_object('success', FALSE, 'message', 'An unexpected error occurred.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION purchase_reward_store_item(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION purchase_reward_store_item(UUID, UUID) IS 'Allows an authenticated user to purchase/collect a reward. Deducts credits and records the collection. Returns a JSONB object with success status and message.';
