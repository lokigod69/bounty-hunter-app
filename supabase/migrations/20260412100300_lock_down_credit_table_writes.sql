-- Phase 1 follow-up hardening: prevent browser clients from writing credit balances directly.
-- Credit balance changes must go through trusted SECURITY DEFINER RPCs such as approve_task
-- and purchase_reward. This migration is intentionally non-destructive.

BEGIN;

DROP POLICY IF EXISTS "Users can insert own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;

REVOKE INSERT, UPDATE, DELETE ON public.user_credits FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_credits FROM authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_credits'
      AND policyname = 'Users can view own credits'
  ) THEN
    CREATE POLICY "Users can view own credits"
      ON public.user_credits
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.collected_rewards') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'collected_rewards'
        AND policyname = 'Users can view own collected rewards'
    ) THEN
    CREATE POLICY "Users can view own collected rewards"
      ON public.collected_rewards
      FOR SELECT
      TO authenticated
      USING (auth.uid() = collector_id);
  END IF;
END;
$$;

COMMENT ON TABLE public.user_credits IS
'Credit balances are read by the client but written only by trusted server-side RPCs.';

COMMIT;
