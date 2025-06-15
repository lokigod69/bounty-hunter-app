-- supabase/migrations/YYYYMMDDHHMMSS_create_bounty_rpc.sql
-- Adds an RPC function for users to create new bounties.

CREATE OR REPLACE FUNCTION create_bounty(
  p_name TEXT,
  p_description TEXT,
  p_image_url TEXT,
  p_credit_cost INTEGER,
  p_creator_id UUID
)
RETURNS JSONB AS $$
DECLARE
  new_bounty_id UUID;
BEGIN
  -- Validate inputs (basic checks)
  IF p_name IS NULL OR p_name = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Bounty name cannot be empty.');
  END IF;

  IF p_credit_cost IS NULL OR p_credit_cost < 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Credit cost must be a non-negative integer.');
  END IF;

  IF p_creator_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Creator ID must be provided.');
  END IF;

  -- Insert the new bounty
  INSERT INTO public.bounties (name, description, image_url, credit_cost, creator_id)
  VALUES (p_name, p_description, p_image_url, p_credit_cost, p_creator_id)
  RETURNING id INTO new_bounty_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Bounty created successfully!',
    'bounty_id', new_bounty_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in create_bounty: %', SQLERRM;
    RETURN jsonb_build_object('success', FALSE, 'message', 'An unexpected error occurred while creating the bounty.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
-- This allows any authenticated user to call this function.
-- Ensure RLS policies on 'bounties' table correctly enforce that 'creator_id' matches 'auth.uid()'
-- The INSERT policy for 'bounties' table already has: WITH CHECK (auth.uid() = creator_id)
GRANT EXECUTE ON FUNCTION create_bounty(TEXT, TEXT, TEXT, INTEGER, UUID) TO authenticated;

COMMENT ON FUNCTION create_bounty(TEXT, TEXT, TEXT, INTEGER, UUID) IS 'Allows an authenticated user to create a new bounty. Returns a JSONB object with success status and the new bounty ID.';
