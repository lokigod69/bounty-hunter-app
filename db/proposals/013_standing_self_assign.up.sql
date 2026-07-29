-- Proposal 013: close the standing self-assign hole (DRAFT — DO NOT APPLY WITHOUT MICHAEL'S GO)
--
-- THE REGISTER §2 claims standing "cannot be self-awarded (approval requires
-- created_by = auth.uid() and pays assigned_to)". That is only true when the
-- creator and the assignee are different people. A user who creates a contract
-- assigned to THEMSELVES is simultaneously the creator (so approve_task's
-- created_by = auth.uid() check passes) and the assignee (so the credit is paid
-- to them) — they can mint unlimited total_earned, and therefore unlimited rank.
--
-- Two layers, deliberately:
--   Layer 1 (product, sections 1-2): create_task/update_task refuse to attach a
--     CREDIT reward to a self-assigned contract. The user never gets to make a
--     promise the system won't keep. Self-assigned contracts with a non-credit
--     reward (or no reward) keep working — the personal-todo use case survives.
--   Layer 2 (security spine, section 3): approve_task refuses to CREDIT when
--     created_by = assigned_to, whatever the row looks like. This is the only
--     function in the database that can reach increment_user_credits, so this
--     line — not layer 1 — is the actual guarantee. It also neutralises rows
--     created before this proposal applies.
--
-- Pattern follows 011/012: auth.uid() asserted, JSON {success,error} returns on
-- the new checks, approve_task keeps its v3 jsonb/RAISE contract exactly (the
-- client at useTasks.ts:424 reads {success,message} and ignores extra keys, so
-- the new keys are additive and safe).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. create_task — same as 012 plus the self-assigned-credit rejection.
--    Body is 012's verbatim except the new guard; signature is UNCHANGED so
--    no client type regen is needed for this function.
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

  -- 013: standing is earned from someone else's judgement, never from your own.
  -- A NULL assignee (unassigned contract) is fine — it cannot pay anyone until
  -- it is assigned, and assigning happens through update_task, which repeats
  -- this check on the post-patch values.
  IF p_reward_type = 'credit' AND p_assigned_to IS NOT NULL AND p_assigned_to = v_uid THEN
    RETURN json_build_object('success', false, 'error', 'self_assigned_credit_reward');
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
  IS 'Proposal 013: creator creates a task. Server sets created_by/status. Rejects credit rewards on self-assigned contracts.';

-- ---------------------------------------------------------------------------
-- 2. update_task — same as 012 plus the same rejection, evaluated on the
--    EFFECTIVE post-patch values. A patch can move the assignee, the reward
--    type, or both, so each must fall back to the stored value when absent;
--    checking only the patch keys would let a two-step edit walk around it
--    (create for a friend with a credit reward, then patch assigned_to to self).
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
  v_eff_assignee uuid;
  v_eff_reward_type text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Empty patch is an idempotent no-op success.
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

  -- 013: evaluate the self-assigned-credit rule on the post-patch row.
  v_eff_assignee := CASE WHEN p_patch ? 'assigned_to'
                         THEN (p_patch->>'assigned_to')::uuid
                         ELSE v_task.assigned_to END;
  v_eff_reward_type := CASE WHEN p_patch ? 'reward_type'
                            THEN p_patch->>'reward_type'
                            ELSE v_task.reward_type END;

  IF v_eff_reward_type = 'credit'
     AND v_eff_assignee IS NOT NULL
     AND v_eff_assignee = v_task.created_by THEN
    RETURN json_build_object('success', false, 'error', 'self_assigned_credit_reward');
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
  IS 'Proposal 013: creator edits own task via whitelisted jsonb patch. Rejects credit rewards on self-assigned contracts (post-patch check).';

-- ---------------------------------------------------------------------------
-- 3. approve_task v4 — THE GUARANTEE.
--    Verbatim v3 (20260109_approve_task_rpc_v3_no_streaks.sql) except the
--    credit-award block, which now also requires assigned_to <> created_by.
--    The task still completes: refusing to complete would strand self-assigned
--    contracts in 'review' forever, which is a worse bug than a silent
--    non-payment. The response gains 'credited' + 'credit_skipped_reason' so
--    the client can explain it; both keys are additive.
--    Signature and return type are unchanged → no types regen needed.
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
  v_credited boolean := false;
  v_skip_reason text := NULL;
BEGIN
  -- Validate authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ATOMIC UPDATE: Only update if status='review' AND caller is creator
  -- This prevents race conditions where two concurrent calls both pass
  -- If another call already updated, this returns 0 rows
  WITH updated AS (
    UPDATE tasks
    SET
      status = 'completed',
      completed_at = COALESCE(completed_at, now()),
      approved_at = now()
    WHERE id = p_task_id
      AND status = 'review'
      AND created_by = auth.uid()
    RETURNING id, assigned_to, created_by, reward_type, reward_text
  )
  SELECT * INTO v_task FROM updated;

  -- If no rows updated, check why
  IF NOT FOUND THEN
    -- Check if task exists
    PERFORM 1 FROM tasks WHERE id = p_task_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Task not found';
    END IF;

    -- Check if caller is the creator
    PERFORM 1 FROM tasks WHERE id = p_task_id AND created_by = auth.uid();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Not authorized: only task creator can approve';
    END IF;

    -- Task exists and caller is creator, but status wasn't 'review'
    -- Either already completed (idempotent success) or wrong status
    PERFORM 1 FROM tasks WHERE id = p_task_id AND status = 'completed';
    IF FOUND THEN
      -- Already processed - return success without awarding credits again
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Task already completed'
      );
    END IF;

    -- Status is something else (pending, rejected, etc.)
    RAISE EXCEPTION 'Task must be in review status to approve';
  END IF;

  -- UPDATE succeeded - award credits exactly once
  IF v_task.reward_type = 'credit' AND v_task.reward_text IS NOT NULL AND v_task.assigned_to IS NOT NULL THEN
    -- 013: standing is what other people judged your work to be worth. A
    -- contract you both issued and performed pays nothing, however it got
    -- into this state.
    IF v_task.assigned_to = v_task.created_by THEN
      v_skip_reason := 'self_assigned';
    ELSE
      v_credit_amount := v_task.reward_text::integer;

      IF v_credit_amount > 0 THEN
        PERFORM public.increment_user_credits(v_task.assigned_to, v_credit_amount);
        v_credited := true;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Task approved successfully',
    'credited', v_credited,
    'credit_skipped_reason', v_skip_reason
  );
END;
$$;

-- Security: Revoke all, grant only to authenticated users
REVOKE ALL ON FUNCTION public.approve_task(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_task(uuid) TO authenticated;

COMMENT ON FUNCTION public.approve_task(uuid) IS
'V4 (proposal 013): as V3 (no streaks, atomic update) but never credits when assigned_to = created_by. Standing cannot be self-minted.';

COMMIT;
