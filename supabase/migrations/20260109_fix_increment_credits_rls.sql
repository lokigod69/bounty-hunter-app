-- Fix RLS issue: Creator approving task cannot update assignee's credits
-- Solution: Make increment_user_credits a SECURITY DEFINER function
-- This allows the function to bypass RLS when called by authenticated users

-- Drop existing function if it exists (to recreate with correct settings)
DROP FUNCTION IF EXISTS public.increment_user_credits(uuid, integer);

-- Create the function as SECURITY DEFINER
-- This runs with the privileges of the function owner (postgres), bypassing RLS
CREATE OR REPLACE FUNCTION public.increment_user_credits(
  user_id_param uuid,
  amount_param integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance integer;
BEGIN
  -- Validate inputs
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'user_id_param cannot be null';
  END IF;

  IF amount_param IS NULL OR amount_param <= 0 THEN
    RAISE EXCEPTION 'amount_param must be a positive integer';
  END IF;

  -- Verify the caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user_credits record exists, create if not
  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_id = user_id_param;

  IF NOT FOUND THEN
    -- Insert new record for user
    INSERT INTO user_credits (user_id, balance, total_earned)
    VALUES (user_id_param, amount_param, amount_param);
  ELSE
    -- Update existing record
    UPDATE user_credits
    SET
      balance = balance + amount_param,
      total_earned = total_earned + amount_param,
      updated_at = now()
    WHERE user_id = user_id_param;
  END IF;
END;
$$;

-- Revoke all permissions first (security best practice)
REVOKE ALL ON FUNCTION public.increment_user_credits(uuid, integer) FROM PUBLIC;

-- Grant execute only to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_user_credits(uuid, integer) TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION public.increment_user_credits(uuid, integer) IS
'Awards credits to a user. Uses SECURITY DEFINER to bypass RLS, allowing task creators to award credits to assignees on task approval.';
