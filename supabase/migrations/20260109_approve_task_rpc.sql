-- Consolidated approve_task RPC with SECURITY DEFINER
-- Solves RLS issues by performing all approval operations server-side:
-- 1. Updates task status (review -> completed)
-- 2. Updates streak for daily missions (writes to daily_mission_streaks)
-- 3. Awards credits to assignee (calls increment_user_credits)
--
-- This avoids client-side RLS violations where creator tries to write
-- to assignee's streak or credit records.

CREATE OR REPLACE FUNCTION public.approve_task(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task record;
  v_streak record;
  v_new_streak_count integer;
  v_credit_amount integer;
  v_today date;
  v_last_completion date;
BEGIN
  -- Validate authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch task details
  SELECT
    id, created_by, assigned_to, status,
    reward_type, reward_text, is_daily,
    completed_at
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
      'message', 'Task already completed',
      'streak_count', NULL
    );
  END IF;

  IF v_task.status != 'review' THEN
    RAISE EXCEPTION 'Task must be in review status to approve (current: %)', v_task.status;
  END IF;

  -- Step 1: Update task status to completed
  UPDATE tasks
  SET
    status = 'completed',
    completed_at = now()
  WHERE id = p_task_id;

  -- Step 2: Update streak for daily missions
  v_new_streak_count := NULL;
  IF v_task.is_daily = true AND v_task.assigned_to IS NOT NULL THEN
    v_today := current_date;

    -- Check for existing streak
    SELECT * INTO v_streak
    FROM daily_mission_streaks
    WHERE contract_id = p_task_id AND user_id = v_task.assigned_to;

    IF v_streak IS NOT NULL THEN
      -- Calculate new streak count
      v_last_completion := v_streak.last_completion_date;

      IF v_last_completion IS NULL THEN
        v_new_streak_count := 1;
      ELSIF v_last_completion = v_today THEN
        -- Already completed today, keep same count
        v_new_streak_count := v_streak.streak_count;
      ELSIF v_last_completion = v_today - 1 THEN
        -- Consecutive day, increment streak
        v_new_streak_count := v_streak.streak_count + 1;
      ELSE
        -- Streak broken, reset to 1
        v_new_streak_count := 1;
      END IF;

      -- Update existing streak
      UPDATE daily_mission_streaks
      SET
        streak_count = v_new_streak_count,
        last_completion_date = v_today,
        updated_at = now()
      WHERE id = v_streak.id;
    ELSE
      -- Create new streak record
      v_new_streak_count := 1;

      INSERT INTO daily_mission_streaks (contract_id, user_id, streak_count, last_completion_date)
      VALUES (p_task_id, v_task.assigned_to, v_new_streak_count, v_today);
    END IF;
  END IF;

  -- Step 3: Award credits if applicable
  IF v_task.reward_type = 'credit' AND v_task.reward_text IS NOT NULL AND v_task.assigned_to IS NOT NULL THEN
    v_credit_amount := v_task.reward_text::integer;

    -- Apply streak bonus for daily missions (10% per streak day, max 50%)
    IF v_task.is_daily = true AND v_new_streak_count IS NOT NULL AND v_new_streak_count > 1 THEN
      v_credit_amount := v_credit_amount + LEAST(
        (v_credit_amount * (v_new_streak_count - 1) * 10 / 100),
        (v_credit_amount * 50 / 100)
      );
    END IF;

    IF v_credit_amount > 0 THEN
      -- Use the existing increment_user_credits function
      PERFORM public.increment_user_credits(v_task.assigned_to, v_credit_amount);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Task approved successfully',
    'streak_count', v_new_streak_count
  );
END;
$$;

-- Security: Revoke all, grant only to authenticated users
REVOKE ALL ON FUNCTION public.approve_task(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_task(uuid) TO authenticated;

COMMENT ON FUNCTION public.approve_task(uuid) IS
'Approves a task that is in review status. Handles task status update, streak tracking for daily missions, and credit awarding. Uses SECURITY DEFINER to bypass RLS.';
