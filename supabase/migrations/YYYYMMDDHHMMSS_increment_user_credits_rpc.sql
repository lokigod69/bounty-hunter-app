-- supabase/migrations/YYYYMMDDHHMMSS_increment_user_credits_rpc.sql
-- Adds an RPC function to increment user credits, creating a record if one doesn't exist.

CREATE OR REPLACE FUNCTION increment_user_credits(user_id_param UUID, amount_param INT)
RETURNS VOID AS $$
BEGIN
  -- Attempt to update the existing balance
  UPDATE public.user_credits
  SET balance = balance + amount_param
  WHERE user_id = user_id_param;

  -- If no row was updated (user didn't have a credits entry), insert a new one.
  IF NOT FOUND THEN
    INSERT INTO public.user_credits(user_id, balance)
    VALUES (user_id_param, amount_param);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Note: Adjust the YYYYMMDDHHMMSS prefix in the filename to the current timestamp before applying.
-- Example: 20231027153000_increment_user_credits_rpc.sql

-- Grant execute permission to the 'authenticated' role if you want users to call this directly.
-- Or rely on service_role key if calling from a secure backend context.
-- For now, assuming it might be called by authenticated users or via service role in backend hooks.
GRANT EXECUTE ON FUNCTION increment_user_credits(UUID, INT) TO authenticated;
-- If you have a specific service role that should be the only one to call this, grant to that role instead.
-- GRANT EXECUTE ON FUNCTION increment_user_credits(UUID, INT) TO service_role; 
