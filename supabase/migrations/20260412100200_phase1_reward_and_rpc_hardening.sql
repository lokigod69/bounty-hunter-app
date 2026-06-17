-- supabase/migrations/20260412100200_phase1_reward_and_rpc_hardening.sql
-- Phase 1 hardening: canonical reward RPCs, purchase integrity fixes, and legacy backend cleanup.

BEGIN;

-- Remove legacy trigger/function paths that depend on deprecated bounty flows.
DROP TRIGGER IF EXISTS on_new_task_assignment ON public.tasks;
DO $$
BEGIN
  IF to_regclass('public.marketplace_bounties') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_bounties_updated ON public.marketplace_bounties';
  END IF;
END;
$$;
DROP FUNCTION IF EXISTS public.notify_new_bounty();
DROP FUNCTION IF EXISTS public.handle_bounties_updated_at();

-- Remove legacy bounty/reward purchase RPC variants.
DROP FUNCTION IF EXISTS public.purchase_reward_store_item(uuid, uuid);
DROP FUNCTION IF EXISTS public.purchase_reward_store_item(uuid);
DROP FUNCTION IF EXISTS public.purchase_bounty(uuid, uuid);
DROP FUNCTION IF EXISTS public.create_bounty(text, text, text, integer, uuid);
DROP FUNCTION IF EXISTS public.decrement_user_credits(uuid, integer);

CREATE OR REPLACE FUNCTION public.create_reward_store_item(
  p_name text,
  p_description text,
  p_image_url text,
  p_credit_cost integer,
  p_assigned_to uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_id uuid;
  v_are_friends boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Reward name cannot be empty');
  END IF;

  IF p_assigned_to IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Assignee is required');
  END IF;

  IF p_credit_cost IS NULL OR p_credit_cost < 1 OR p_credit_cost > 1000000 THEN
    RETURN json_build_object('success', false, 'error', 'Credit cost must be between 1 and 1,000,000');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (user1_id = auth.uid() AND user2_id = p_assigned_to)
        OR (user2_id = auth.uid() AND user1_id = p_assigned_to)
      )
  ) INTO v_are_friends;

  IF NOT v_are_friends THEN
    RETURN json_build_object('success', false, 'error', 'Can only create rewards for accepted friends');
  END IF;

  INSERT INTO public.rewards_store (
    name,
    description,
    image_url,
    credit_cost,
    creator_id,
    assigned_to
  ) VALUES (
    p_name,
    nullif(p_description, ''),
    nullif(p_image_url, ''),
    p_credit_cost,
    auth.uid(),
    p_assigned_to
  )
  RETURNING id INTO v_new_id;

  RETURN json_build_object('success', true, 'reward_id', v_new_id, 'message', 'Reward created successfully');
END;
$$;

REVOKE ALL ON FUNCTION public.create_reward_store_item(text, text, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_reward_store_item(text, text, text, integer, uuid) TO authenticated;

COMMENT ON FUNCTION public.create_reward_store_item(text, text, text, integer, uuid) IS
'Canonical reward creation RPC. Uses auth.uid() as creator and enforces accepted friendship for assigned_to.';

CREATE OR REPLACE FUNCTION public.update_reward_store_item(
  p_bounty_id uuid,
  p_name text,
  p_description text,
  p_image_url text,
  p_credit_cost integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_bounty_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Reward id is required');
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Reward name cannot be empty');
  END IF;

  IF p_credit_cost IS NULL OR p_credit_cost < 1 OR p_credit_cost > 1000000 THEN
    RETURN json_build_object('success', false, 'error', 'Credit cost must be between 1 and 1,000,000');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.rewards_store
    WHERE id = p_bounty_id
      AND creator_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE public.rewards_store
  SET
    name = p_name,
    description = nullif(p_description, ''),
    image_url = nullif(p_image_url, ''),
    credit_cost = p_credit_cost,
    updated_at = now()
  WHERE id = p_bounty_id;

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.update_reward_store_item(uuid, text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_reward_store_item(uuid, text, text, text, integer) TO authenticated;

COMMENT ON FUNCTION public.update_reward_store_item(uuid, text, text, text, integer) IS
'Canonical reward update RPC. Retains p_bounty_id arg for frontend compatibility.';

CREATE OR REPLACE FUNCTION public.delete_reward_store_item(
  p_reward_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_reward_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Reward id is required');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.rewards_store
    WHERE id = p_reward_id
      AND creator_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized or reward not found');
  END IF;

  DELETE FROM public.collected_rewards
  WHERE reward_id = p_reward_id;

  DELETE FROM public.rewards_store
  WHERE id = p_reward_id;

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_reward_store_item(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_reward_store_item(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_reward_store_item(uuid) IS
'Canonical reward delete RPC. Deletes dependent collected_rewards rows first.';

CREATE OR REPLACE FUNCTION public.purchase_reward(
  p_reward_id uuid,
  p_collector_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reward_cost integer;
  v_reward_creator uuid;
  v_current_balance integer;
  v_reward_name text;
  v_collection_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'NOT_AUTHENTICATED',
      'message', 'Not authenticated'
    );
  END IF;

  IF auth.uid() IS DISTINCT FROM p_collector_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'FORBIDDEN',
      'message', 'collector_id must match authenticated user'
    );
  END IF;

  SELECT balance
  INTO v_current_balance
  FROM public.user_credits
  WHERE user_id = p_collector_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;

  SELECT credit_cost, creator_id, name
  INTO v_reward_cost, v_reward_creator, v_reward_name
  FROM public.rewards_store
  WHERE id = p_reward_id
    AND is_active = true
  FOR UPDATE;

  IF v_reward_cost IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'REWARD_NOT_FOUND',
      'message', 'Reward not found or inactive'
    );
  END IF;

  IF v_reward_creator = p_collector_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'SELF_PURCHASE',
      'message', 'Cannot purchase your own reward'
    );
  END IF;

  IF v_current_balance < v_reward_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INSUFFICIENT_FUNDS',
      'message', 'Insufficient credits',
      'required', v_reward_cost,
      'available', v_current_balance
    );
  END IF;

  BEGIN
    INSERT INTO public.collected_rewards (reward_id, collector_id)
    VALUES (p_reward_id, p_collector_id)
    RETURNING id INTO v_collection_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN json_build_object(
        'success', false,
        'error', 'ALREADY_COLLECTED',
        'message', 'You have already collected this reward'
      );
  END;

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    task_id
  ) VALUES (
    p_collector_id,
    -v_reward_cost,
    'spent',
    NULL
  );

  UPDATE public.user_credits
  SET
    balance = balance - v_reward_cost,
    updated_at = now()
  WHERE user_id = p_collector_id;

  UPDATE public.rewards_store
  SET
    is_active = false,
    updated_at = now()
  WHERE id = p_reward_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Reward purchased successfully',
    'collection_id', v_collection_id,
    'reward_id', p_reward_id,
    'reward_name', v_reward_name,
    'cost', v_reward_cost,
    'new_balance', v_current_balance - v_reward_cost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_reward(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_reward(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.purchase_reward(uuid, uuid) IS
'Canonical reward purchase RPC. Enforces auth.uid() == p_collector_id and returns collection_id for downstream notifications.';

COMMIT;
