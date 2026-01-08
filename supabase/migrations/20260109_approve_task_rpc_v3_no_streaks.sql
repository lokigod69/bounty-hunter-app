-- V3: Simplified approve_task RPC - NO STREAKS
-- Changes from V2:
-- 1. REMOVED all streak tracking logic
-- 2. REMOVED daily_mission_streaks table writes
-- 3. Only handles: task status update (review -> completed) + credit awarding
-- 4. Keep approved_at column support

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
  -- Validate authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch task details
  SELECT
    id, created_by, assigned_to, status,
    reward_type, reward_text, completed_at
  INTO v_task
  FROM tasks
  WHERE id = p_task_id;

  IF v_task IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Verify caller is the task creator
  IF v_task.created_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized: only task creator can approve';
  END IF;

  -- Verify task is in review status (idempotent: if already completed, just return)
  IF v_task.status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Task already completed'
    );
  END IF;

  IF v_task.status != 'review' THEN
    RAISE EXCEPTION 'Task must be in review status to approve (current: %)', v_task.status;
  END IF;

  -- Step 1: Update task status to completed
  -- Only set completed_at if not already set (preserves submission timestamp)
  -- Always set approved_at to now
  UPDATE tasks
  SET
    status = 'completed',
    completed_at = COALESCE(completed_at, now()),
    approved_at = now()
  WHERE id = p_task_id;

  -- Step 2: Award credits if applicable (no streak bonus)
  IF v_task.reward_type = 'credit' AND v_task.reward_text IS NOT NULL AND v_task.assigned_to IS NOT NULL THEN
    v_credit_amount := v_task.reward_text::integer;

    IF v_credit_amount > 0 THEN
      -- Use the existing increment_user_credits function
      PERFORM public.increment_user_credits(v_task.assigned_to, v_credit_amount);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Task approved successfully'
  );
END;
$$;

-- Security: Revoke all, grant only to authenticated users
REVOKE ALL ON FUNCTION public.approve_task(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_task(uuid) TO authenticated;

COMMENT ON FUNCTION public.approve_task(uuid) IS
'V3: Simplified approve_task - no streak tracking. Updates task status and awards base credits. Uses SECURITY DEFINER to bypass RLS.';
