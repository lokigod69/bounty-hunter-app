-- Phase 2.8: let a collector mark a collected reward as redeemed/delivered.
--
-- The Collected tab is currently terminal — a reward you collected just shows a
-- "collected on <date>" badge with no further action, so gift/reward contracts
-- never feel "closed out". This adds a nullable `redeemed_at` timestamp and a
-- SECURITY DEFINER RPC the collector calls to toggle it. We use an RPC (not a
-- direct table UPDATE) because collected_rewards intentionally has no UPDATE
-- RLS policy — writes go through trusted server-side functions, same pattern as
-- purchase_reward.
--
-- SAFETY: additive column (nullable, no default) + one new function. No data is
-- modified. Idempotent (IF NOT EXISTS / CREATE OR REPLACE).

BEGIN;

ALTER TABLE public.collected_rewards
  ADD COLUMN IF NOT EXISTS redeemed_at timestamptz;

COMMENT ON COLUMN public.collected_rewards.redeemed_at IS
  'When the collector marked this collected reward redeemed/delivered (Phase 2.8). Null = not yet redeemed.';

CREATE OR REPLACE FUNCTION public.mark_reward_redeemed(
  p_collection_id uuid,
  p_redeemed boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_collector uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'NOT_AUTHENTICATED', 'message', 'Not authenticated');
  END IF;

  IF p_collection_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'BAD_REQUEST', 'message', 'collection_id is required');
  END IF;

  SELECT collector_id INTO v_collector
  FROM public.collected_rewards
  WHERE id = p_collection_id
  FOR UPDATE;

  IF v_collector IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Collected reward not found');
  END IF;

  IF v_collector IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Not your collected reward');
  END IF;

  UPDATE public.collected_rewards
  SET redeemed_at = CASE WHEN p_redeemed THEN now() ELSE NULL END
  WHERE id = p_collection_id;

  RETURN json_build_object('success', true, 'collection_id', p_collection_id, 'redeemed', p_redeemed);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_reward_redeemed(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_reward_redeemed(uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.mark_reward_redeemed(uuid, boolean) IS
  'Collector toggles redeemed_at on their own collected_rewards row (Phase 2.8). Enforces collector_id = auth.uid().';

COMMIT;
