-- Proposal 012: create_task / update_task RPCs (DRAFT - DO NOT APPLY WITHOUT MICHAEL'S GO)
-- Phase B of the task-lifecycle hardening (see 011): moves the last two direct
-- client writes on public.tasks (create + creator edit) into SECURITY DEFINER
-- RPCs, then drops ALL remaining client write policies on tasks (INSERT,
-- creator UPDATE, creator DELETE). After this, every write to tasks goes
-- through an RPC: create_task, update_task, submit_proof, reject_task,
-- set_task_status, archive_task, delete_task, approve_task.
--
-- Pattern identical to 011 (auth.uid() asserted, FOR UPDATE lock, JSON
-- {success, error} returns, REVOKE PUBLIC / GRANT authenticated).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. create_task - creator creates a task for an assignee (or unassigned).
--    Replaces useTasks.ts:318 (insert) and IssuedPage.tsx:375 (insert).
--    Server sets created_by = auth.uid() and status = 'pending'; the client
--    can no longer choose either. Column CHECKs (reward_type, status) stay
--    authoritative - a violation surfaces as a Postgres error, same as today.
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
-- 2. update_task - creator edits their own task. Replaces useTasks.ts:231
--    (partial update) and IssuedPage.tsx:352 (full-form update).
--    Takes a jsonb patch so both call sites keep their exact semantics
--    (only provided keys change; a json null clears a nullable column).
--    The key whitelist IS the security payoff: status, created_by, proof_*,
--    completed_at, approved_at, rejection_reason, is_archived are simply not
--    reachable, no matter what the client sends.
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
-- 3. RLS tightening - ONLY safe after the frontend build using the RPCs is
--    deployed (runbook ordering, same as 011). Drops the last client write
--    policies on tasks. "Users can delete own tasks" is included: the client
--    has gone through delete_task (SECURITY DEFINER) since 011 shipped, so
--    the DELETE policy is dead weight that still lets a hand-crafted request
--    delete rows directly. SELECT policies and "Admins full access" stay.
--    NOTE: names from the schema snapshot - runbook pre-flight lists live
--    pg_policies first and adjusts if they differ.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Create tasks" ON public.tasks;                        -- schema.sql:754 (INSERT)
DROP POLICY IF EXISTS "Users can update own created tasks" ON public.tasks; -- schema.sql:831 (creator UPDATE)
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;         -- schema.sql:810 (creator DELETE)

COMMIT;
