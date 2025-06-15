-- supabase/migrations/YYYYMMDDHHMMSS_purchase_bounty_rpc.sql
-- Adds an RPC function for users to purchase/collect bounties.

CREATE OR REPLACE FUNCTION purchase_bounty(p_bounty_id UUID, p_collector_id UUID)
RETURNS JSONB AS $$
DECLARE
  bounty_info RECORD;
  can_decrement BOOLEAN;
  new_collection_id UUID;
BEGIN
  -- 1. Check if the bounty exists, is active, and get its cost
  SELECT id, name, credit_cost, creator_id INTO bounty_info
  FROM public.bounties
  WHERE id = p_bounty_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Bounty not found or is not active.');
  END IF;

  -- 2. Check if the collector is trying to buy their own bounty (optional rule, can be removed if not desired)
  IF bounty_info.creator_id = p_collector_id THEN
     RETURN jsonb_build_object('success', FALSE, 'message', 'You cannot collect your own bounty.');
  END IF;

  -- 3. Check if the user has already collected this bounty
  IF EXISTS (
    SELECT 1 FROM public.collected_bounties
    WHERE bounty_id = p_bounty_id AND collector_id = p_collector_id
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'You have already collected this bounty.');
  END IF;

  -- 4. Attempt to decrement user credits
  SELECT decrement_user_credits(p_collector_id, bounty_info.credit_cost) INTO can_decrement;

  IF NOT can_decrement THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Insufficient credits or error deducting credits.');
  END IF;

  -- 5. Insert into collected_bounties
  BEGIN
    INSERT INTO public.collected_bounties (bounty_id, collector_id, purchase_price)
    VALUES (p_bounty_id, p_collector_id, bounty_info.credit_cost)
    RETURNING id INTO new_collection_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- If collection fails, we should ideally roll back the credit deduction.
      -- However, plpgsql doesn't have easy transaction rollback within a function like this for the previous RPC call.
      -- A more robust solution would involve a single transaction or ensuring decrement_user_credits is idempotent or reversible.
      -- For now, we'll proceed and log, but this is a point for future improvement if issues arise.
      RAISE WARNING 'Failed to insert into collected_bounties after deducting credits. Bounty ID: %, Collector ID: %, Error: %', p_bounty_id, p_collector_id, SQLERRM;
      -- Attempt to refund (best effort)
      PERFORM increment_user_credits(p_collector_id, bounty_info.credit_cost);
      RETURN jsonb_build_object('success', FALSE, 'message', 'Failed to record bounty collection. Credits may have been refunded.');
  END;

  -- 6. Success
  -- The email notification to the bounty creator would typically be handled by a trigger on 'collected_bounties' table (insert) 
  -- that calls an edge function, or by client-side logic after successful purchase.
  RETURN jsonb_build_object(
    'success', TRUE, 
    'message', 'Bounty collected successfully!', 
    'collection_id', new_collection_id,
    'bounty_name', bounty_info.name
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in purchase_bounty: %', SQLERRM;
    RETURN jsonb_build_object('success', FALSE, 'message', 'An unexpected error occurred.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION purchase_bounty(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION purchase_bounty(UUID, UUID) IS 'Allows an authenticated user to purchase/collect a bounty. Deducts credits and records the collection. Returns a JSONB object with success status and message.';
