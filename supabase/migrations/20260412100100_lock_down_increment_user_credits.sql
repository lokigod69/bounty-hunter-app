-- supabase/migrations/20260412100100_lock_down_increment_user_credits.sql
-- Phase 1 hardening: lock down increment_user_credits so clients cannot mint credits directly.

BEGIN;

CREATE OR REPLACE FUNCTION public.increment_user_credits(
  user_id_param uuid,
  amount_param integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'user_id_param cannot be null';
  END IF;

  IF amount_param IS NULL OR amount_param <= 0 THEN
    RAISE EXCEPTION 'amount_param must be a positive integer';
  END IF;

  INSERT INTO public.user_credits (user_id, balance, total_earned, updated_at)
  VALUES (user_id_param, amount_param, amount_param, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = public.user_credits.balance + EXCLUDED.balance,
    total_earned = public.user_credits.total_earned + EXCLUDED.total_earned,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_credits(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_user_credits(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.increment_user_credits(uuid, integer) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.increment_user_credits(uuid, integer) TO service_role;

COMMENT ON FUNCTION public.increment_user_credits(uuid, integer) IS
'Server-only credit increment helper. Credits must be awarded via trusted SECURITY DEFINER RPCs (for example approve_task).';

COMMIT;
