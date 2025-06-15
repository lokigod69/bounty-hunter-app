-- supabase/migrations/YYYYMMDDHHMMSS_decrement_user_credits_rpc.sql
-- Adds an RPC function to decrement user credits, ensuring balance doesn't go below zero.

CREATE OR REPLACE FUNCTION decrement_user_credits(user_id_param UUID, amount_param INT)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INT;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance FROM public.user_credits
  WHERE user_id = user_id_param;

  -- If user has no credit record or amount_param is negative, treat as insufficient funds or invalid operation
  IF NOT FOUND OR amount_param < 0 THEN
    RETURN FALSE;
  END IF;

  -- Check if sufficient balance
  IF current_balance >= amount_param THEN
    UPDATE public.user_credits
    SET balance = balance - amount_param
    WHERE user_id = user_id_param;
    RETURN TRUE;
  ELSE
    -- Insufficient funds
    RETURN FALSE;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error or handle as needed
    RAISE WARNING 'Error in decrement_user_credits: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission. 
-- SECURITY DEFINER is used because we are modifying user_credits which might have RLS.
-- Ensure this function is called from trusted server-side logic (like another RPC or edge function) 
-- or has appropriate checks if called directly by users.
GRANT EXECUTE ON FUNCTION decrement_user_credits(UUID, INT) TO authenticated;

COMMENT ON FUNCTION decrement_user_credits(UUID, INT) IS 'Decrements a user''s credit balance by a specified amount, returns true on success, false on failure (e.g., insufficient funds).';
