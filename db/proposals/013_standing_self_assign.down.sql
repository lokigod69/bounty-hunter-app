-- Proposal 013 ROLLBACK — restores the pre-013 state exactly.
--
-- All three functions keep their signatures across 013, so rollback is a pure
-- body swap: no policy churn, no client redeploy, no types regen. Re-running
-- the up.sql after this is safe and idempotent.
--
--   create_task  -> 012 body verbatim (drops the self-assigned-credit guard)
--   update_task  -> 012 body verbatim (drops the post-patch guard)
--   approve_task -> V3 body verbatim (20260109_approve_task_rpc_v3_no_streaks.sql)
--
-- NOTE: rolling back re-opens the standing self-assign hole by design. It does
-- not undo any total_earned that 013 prevented, and it does not restore any
-- credit that 013 declined to award — see 013_validation.sql query #5 if a
-- manual reconciliation is ever wanted.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. create_task — back to the 012 body.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_task(
  p_title text,
  p_description text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_deadline date DEFAULT NULL,
  p_reward_type text DEFAULT NULL,
  p_reward_text text DEFAULT NULL,
  p_proof_required boolean DEFAULT false,
  p_is_daily boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_task_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RETURN json_build_object('success', false, 'error', 'title_required');
  END IF;

  INSERT INTO public.tasks (
    title, description, assigned_to, deadline,
    reward_type, reward_text, proof_required, is_daily,
    created_by, status
  ) VALUES (
    p_title, p_description, p_assigned_to, p_deadline,
    p_reward_type, p_reward_text,
    COALESCE(p_proof_required, false), COALESCE(p_is_daily, false),
    v_uid, 'pending'
  )
  RETURNING id INTO v_task_id;

  RETURN json_build_object('success', true, 'task_id', v_task_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_task(text, text, uuid, date, text, text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_task(text, text, uuid, date, text, text, boolean, boolean) TO authenticated;
COMMENT ON FUNCTION public.create_task(text, text, uuid, date, text, text, boolean, boolean)
  IS 'Proposal 012: creator creates a task. Server sets created_by/status; returns task_id.';

-- ---------------------------------------------------------------------------
-- 2. update_task — back to the 012 body.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_task(
  p_task_id uuid,
  p_patch jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_task public.tasks%ROWTYPE;
  v_bad_keys text[];
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF p_patch IS NULL OR p_patch = '{}'::jsonb THEN
    RETURN json_build_object('success', true, 'unchanged', true);
  END IF;

  SELECT array_agg(k) INTO v_bad_keys
  FROM jsonb_object_keys(p_patch) AS k
  WHERE k NOT IN ('title', 'description', 'assigned_to', 'deadline',
                  'reward_type', 'reward_text', 'proof_required', 'is_daily');
  IF v_bad_keys IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'invalid_field',
                             'fields', array_to_json(v_bad_keys));
  END IF;

  IF p_patch ? 'title'
     AND (p_patch->>'title' IS NULL OR btrim(p_patch->>'title') = '') THEN
    RETURN json_build_object('success', false, 'error', 'title_required');
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'task_not_found');
  END IF;

  IF v_task.created_by IS DISTINCT FROM v_uid THEN
    RETURN json_build_object('success', false, 'error', 'not_creator');
  END IF;

  UPDATE public.tasks SET
    title          = CASE WHEN p_patch ? 'title'          THEN p_patch->>'title'                  ELSE title          END,
    description    = CASE WHEN p_patch ? 'description'    THEN p_patch->>'description'            ELSE description    END,
    assigned_to    = CASE WHEN p_patch ? 'assigned_to'    THEN (p_patch->>'assigned_to')::uuid    ELSE assigned_to    END,
    deadline       = CASE WHEN p_patch ? 'deadline'       THEN (p_patch->>'deadline')::date       ELSE deadline       END,
    reward_type    = CASE WHEN p_patch ? 'reward_type'    THEN p_patch->>'reward_type'            ELSE reward_type    END,
    reward_text    = CASE WHEN p_patch ? 'reward_text'    THEN p_patch->>'reward_text'            ELSE reward_text    END,
    proof_required = CASE WHEN p_patch ? 'proof_required' THEN COALESCE((p_patch->>'proof_required')::boolean, false) ELSE proof_required END,
    is_daily       = CASE WHEN p_patch ? 'is_daily'       THEN COALESCE((p_patch->>'is_daily')::boolean, false)       ELSE is_daily       END
  WHERE id = p_task_id;

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.update_task(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_task(uuid, jsonb) TO authenticated;
COMMENT ON FUNCTION public.update_task(uuid, jsonb)
  IS 'Proposal 012: creator edits own task via whitelisted jsonb patch. Lifecycle columns unreachable.';

-- ---------------------------------------------------------------------------
-- 3. approve_task — back to the V3 body verbatim.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_task(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task record;
  v_credit_amount integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  WITH updated AS (
    UPDATE tasks
    SET
      status = 'completed',
      completed_at = COALESCE(completed_at, now()),
      approved_at = now()
    WHERE id = p_task_id
      AND status = 'review'
      AND created_by = auth.uid()
    RETURNING id, assigned_to, reward_type, reward_text
  )
  SELECT * INTO v_task FROM updated;

  IF NOT FOUND THEN
    PERFORM 1 FROM tasks WHERE id = p_task_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Task not found';
    END IF;

    PERFORM 1 FROM tasks WHERE id = p_task_id AND created_by = auth.uid();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Not authorized: only task creator can approve';
    END IF;

    PERFORM 1 FROM tasks WHERE id = p_task_id AND status = 'completed';
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Task already completed'
      );
    END IF;

    RAISE EXCEPTION 'Task must be in review status to approve';
  END IF;

  IF v_task.reward_type = 'credit' AND v_task.reward_text IS NOT NULL AND v_task.assigned_to IS NOT NULL THEN
    v_credit_amount := v_task.reward_text::integer;

    IF v_credit_amount > 0 THEN
      PERFORM public.increment_user_credits(v_task.assigned_to, v_credit_amount);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Task approved successfully'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_task(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_task(uuid) TO authenticated;

COMMENT ON FUNCTION public.approve_task(uuid) IS
'V3: Simplified approve_task - no streak tracking. Updates task status and awards base credits. Uses SECURITY DEFINER to bypass RLS.';

COMMIT;
