-- Proposal 011: Task lifecycle RPCs (DRAFT — DO NOT APPLY WITHOUT MICHAEL'S GO)
-- Moves the remaining client-side task state transitions into SECURITY DEFINER
-- RPCs, matching the pattern of approve_task (20260109_approve_task_rpc_v3).
-- After the client is switched over, the broad assignee-side UPDATE policies on
-- tasks are dropped so clients can no longer set arbitrary columns.
--
-- RPCs added: submit_proof, reject_task, set_task_status, archive_task, delete_task
-- (approve_task already exists and is untouched.)

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Safety: remove the legacy double-credit trigger if it still exists.
--    schema.sql:580 shows AFTER UPDATE trigger award_credits_on_completion;
--    approve_task already credits explicitly — if both fire, credits double.
--    (Validation query 011_validation.sql #3 checks whether it exists first.)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS award_credits_on_completion ON public.tasks;

-- ---------------------------------------------------------------------------
-- 1. submit_proof — assignee submits proof (or submits for review w/o proof
--    when proof_required is false). Replaces:
--      useTasks.ts:581-595, missions.ts:356-378 (uploadProof),
--      missions.ts:469-476 (submitForReviewNoProof)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_proof(
  p_task_id uuid,
  p_proof_url text DEFAULT NULL,
  p_proof_type text DEFAULT NULL,
  p_proof_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_task public.tasks%ROWTYPE;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'task_not_found');
  END IF;

  IF v_task.assigned_to IS DISTINCT FROM v_uid THEN
    RETURN json_build_object('success', false, 'error', 'not_assignee');
  END IF;

  -- Idempotency: re-submitting while already in review is a no-op success.
  IF v_task.status = 'review' THEN
    RETURN json_build_object('success', true, 'already_submitted', true);
  END IF;

  IF v_task.status NOT IN ('pending', 'in_progress', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'wrong_status',
                             'status', v_task.status);
  END IF;

  -- proof_required tasks must carry a file or a text description.
  IF COALESCE(v_task.proof_required, false)
     AND p_proof_url IS NULL AND p_proof_description IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'proof_required');
  END IF;

  -- Keep in sync with src/domain/proofValidation.ts and the live
  -- tasks_proof_type_check constraint (see proposal .md, Open Point A).
  IF p_proof_type IS NOT NULL
     AND p_proof_type NOT IN ('image', 'video', 'pdf', 'document', 'text') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_proof_type');
  END IF;

  UPDATE public.tasks SET
    status            = 'review',
    proof_url         = p_proof_url,
    proof_type        = p_proof_type,
    proof_description = p_proof_description,
    completed_at      = now(),          -- parity with uploadProof (missions.ts:356)
    rejection_reason  = NULL
  WHERE id = p_task_id;

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_proof(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_proof(uuid, text, text, text) TO authenticated;
COMMENT ON FUNCTION public.submit_proof(uuid, text, text, text)
  IS 'Proposal 011: assignee submits proof / submits for review. Server-side task lifecycle.';

-- ---------------------------------------------------------------------------
-- 2. reject_task — creator rejects a submitted proof. Canonicalizes the two
--    divergent client paths (missions.ts:162-180 sets status=rejected;
--    useTasks.ts:429-438 set status=pending): canonical result is 'rejected'
--    with proof cleared, so the assignee sees the rejection + reason.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_task(
  p_task_id uuid,
  p_rejection_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_task public.tasks%ROWTYPE;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'task_not_found');
  END IF;

  IF v_task.created_by IS DISTINCT FROM v_uid THEN
    RETURN json_build_object('success', false, 'error', 'not_creator');
  END IF;

  IF v_task.status = 'rejected' THEN
    RETURN json_build_object('success', true, 'already_rejected', true);
  END IF;

  IF v_task.status <> 'review' THEN
    RETURN json_build_object('success', false, 'error', 'wrong_status',
                             'status', v_task.status);
  END IF;

  UPDATE public.tasks SET
    status            = 'rejected',
    proof_url         = NULL,
    proof_type        = NULL,
    proof_description = NULL,
    completed_at      = NULL,
    rejection_reason  = p_rejection_reason
  WHERE id = p_task_id;

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.reject_task(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_task(uuid, text) TO authenticated;
COMMENT ON FUNCTION public.reject_task(uuid, text)
  IS 'Proposal 011: creator rejects a proof in review. Clears proof, records reason.';

-- ---------------------------------------------------------------------------
-- 3. set_task_status — assignee start/stop only (pending <-> in_progress).
--    Every other transition has a dedicated RPC (submit/approve/reject).
--    Replaces the generic status writes in useTasks.ts:429-438 /
--    missions.ts:248-251 for the start-work path.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_task_status(
  p_task_id uuid,
  p_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_task public.tasks%ROWTYPE;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF p_status NOT IN ('pending', 'in_progress') THEN
    RETURN json_build_object('success', false, 'error', 'status_not_allowed');
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'task_not_found');
  END IF;

  IF v_task.assigned_to IS DISTINCT FROM v_uid THEN
    RETURN json_build_object('success', false, 'error', 'not_assignee');
  END IF;

  IF v_task.status = p_status THEN
    RETURN json_build_object('success', true, 'unchanged', true);
  END IF;

  IF v_task.status NOT IN ('pending', 'in_progress', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'wrong_status',
                             'status', v_task.status);
  END IF;

  UPDATE public.tasks SET status = p_status WHERE id = p_task_id;

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_task_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_task_status(uuid, text) TO authenticated;
COMMENT ON FUNCTION public.set_task_status(uuid, text)
  IS 'Proposal 011: assignee toggles pending/in_progress. All other transitions use dedicated RPCs.';

-- ---------------------------------------------------------------------------
-- 4. archive_task — creator or assignee hides a finished task from lists.
--    Replaces missions.ts:414-417.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_task(
  p_task_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_task public.tasks%ROWTYPE;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'task_not_found');
  END IF;

  IF v_uid IS DISTINCT FROM v_task.created_by
     AND v_uid IS DISTINCT FROM v_task.assigned_to THEN
    RETURN json_build_object('success', false, 'error', 'not_participant');
  END IF;

  IF COALESCE(v_task.is_archived, false) THEN
    RETURN json_build_object('success', true, 'already_archived', true);
  END IF;

  UPDATE public.tasks SET is_archived = true WHERE id = p_task_id;

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.archive_task(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_task(uuid) TO authenticated;
COMMENT ON FUNCTION public.archive_task(uuid)
  IS 'Proposal 011: creator or assignee archives a task (is_archived=true).';

-- ---------------------------------------------------------------------------
-- 5. delete_task — creator deletes own task. Returns proof_url so the client
--    can clean up the storage object afterwards (storage delete stays
--    client-side; the bucket RLS already restricts it). Replaces
--    useTasks.ts:685-689 and IssuedPage.tsx:110-113.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_task(
  p_task_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_task public.tasks%ROWTYPE;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    -- Idempotent: deleting an already-deleted task is success.
    RETURN json_build_object('success', true, 'already_deleted', true);
  END IF;

  IF v_task.created_by IS DISTINCT FROM v_uid THEN
    RETURN json_build_object('success', false, 'error', 'not_creator');
  END IF;

  DELETE FROM public.tasks WHERE id = p_task_id;

  RETURN json_build_object('success', true, 'proof_url', v_task.proof_url);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_task(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_task(uuid) TO authenticated;
COMMENT ON FUNCTION public.delete_task(uuid)
  IS 'Proposal 011: creator deletes own task; returns proof_url for client storage cleanup.';

-- ---------------------------------------------------------------------------
-- 6. RLS tightening — ONLY safe after the frontend build using the RPCs is
--    deployed (see runbook ordering). Drops the broad UPDATE policies that
--    let the assignee write ANY column. The creator-side UPDATE policy stays
--    (edit-task modal still writes directly; see proposal .md, Phase B).
--    NOTE: policy names taken from supabase/schema.sql snapshot — the runbook
--    pre-flight lists live pg_policies first and adjusts if names differ.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Update tasks" ON public.tasks;                    -- schema.sql:796 (either-party, any column)
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks; -- schema.sql:824 (assignee, any column)

COMMIT;
