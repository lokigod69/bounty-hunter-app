-- V3: Simplified approve_task RPC - NO STREAKS + ATOMIC UPDATE
-- Changes from V2:
-- 1. REMOVED all streak tracking logic
-- 2. REMOVED daily_mission_streaks table writes
-- 3. Only handles: task status update (review -> completed) + credit awarding
-- 4. Keep approved_at column support
-- 5. ATOMIC UPDATE: Single UPDATE with WHERE conditions prevents race condition double-credits

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
    RETURNING id, assigned_to, reward_type, reward_text
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

-- Security: Revoke all, grant only to authenticated users
REVOKE ALL ON FUNCTION public.approve_task(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_task(uuid) TO authenticated;

COMMENT ON FUNCTION public.approve_task(uuid) IS
'V3: Simplified approve_task - no streak tracking. Updates task status and awards base credits. Uses SECURITY DEFINER to bypass RLS.';
