-- supabase/migrations/YYYYMMDDHHMMSS_create_reward_store_item_rpc.sql
-- Adds an RPC function for users to create new items in the rewards store.

CREATE OR REPLACE FUNCTION create_reward_store_item(
  p_name TEXT,
  p_description TEXT,
  p_image_url TEXT,
  p_credit_cost INTEGER,
  p_creator_id UUID
)
RETURNS JSONB AS $$
DECLARE
  new_reward_id UUID;
BEGIN
  -- Validate inputs (basic checks)
  IF p_name IS NULL OR p_name = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Reward name cannot be empty.');
  END IF;

  IF p_credit_cost IS NULL OR p_credit_cost <= 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Credit cost must be a positive integer.');
  END IF;

  IF p_creator_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Creator ID must be provided.');
  END IF;

  -- Insert the new reward
  INSERT INTO public.rewards_store (name, description, image_url, credit_cost, creator_id)
  VALUES (p_name, p_description, p_image_url, p_credit_cost, p_creator_id)
  RETURNING id INTO new_reward_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Reward created successfully!',
    'reward_id', new_reward_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in create_reward_store_item: %', SQLERRM;
    RETURN jsonb_build_object('success', FALSE, 'message', 'An unexpected error occurred while creating the reward.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
-- This allows any authenticated user to call this function.
-- Ensure RLS policies on 'rewards_store' table correctly enforce that 'creator_id' matches 'auth.uid()'
GRANT EXECUTE ON FUNCTION create_reward_store_item(TEXT, TEXT, TEXT, INTEGER, UUID) TO authenticated;

COMMENT ON FUNCTION create_reward_store_item(TEXT, TEXT, TEXT, INTEGER, UUID) IS 'Allows an authenticated user to create a new reward store item. Returns a JSONB object with success status and the new reward ID.';
