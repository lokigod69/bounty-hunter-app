-- V2: Updated approve_task RPC
-- Changes from V1:
-- 1. REMOVED streak bonus credits - credits are exactly reward_text::int
-- 2. Fixed date logic - streak uses completed_at from task, not approval date
-- 3. Added approved_at column support
-- 4. Don't overwrite completed_at if already set (from submission)
-- 5. Renamed contract_id references to task_id for clarity (but keeping column name for now)

-- First, add approved_at column to tasks if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

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
  v_completion_date date;
  v_last_completion date;
BEGIN
  -- Validate authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch task details (including completed_at for streak calculation)
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
  -- Only set completed_at if not already set (preserves submission timestamp)
  -- Always set approved_at to now
  UPDATE tasks
  SET
    status = 'completed',
    completed_at = COALESCE(completed_at, now()),
    approved_at = now()
  WHERE id = p_task_id;

  -- Step 2: Update streak for daily missions
  -- Use the task's completed_at (submission date) for streak calculation, not approval date
  v_new_streak_count := NULL;
  IF v_task.is_daily = true AND v_task.assigned_to IS NOT NULL THEN
    -- Use completed_at from task, fallback to current_date if not set
    v_completion_date := DATE(COALESCE(v_task.completed_at, now()));

    -- Check for existing streak (using contract_id = task_id)
    SELECT * INTO v_streak
    FROM daily_mission_streaks
    WHERE contract_id = p_task_id AND user_id = v_task.assigned_to;

    IF v_streak IS NOT NULL THEN
      -- Calculate new streak count
      v_last_completion := v_streak.last_completion_date;

      IF v_last_completion IS NULL THEN
        v_new_streak_count := 1;
      ELSIF v_last_completion = v_completion_date THEN
        -- Already completed this day, keep same count
        v_new_streak_count := v_streak.streak_count;
      ELSIF v_last_completion = v_completion_date - 1 THEN
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
        last_completion_date = v_completion_date,
        updated_at = now()
      WHERE id = v_streak.id;
    ELSE
      -- Create new streak record
      v_new_streak_count := 1;

      INSERT INTO daily_mission_streaks (contract_id, user_id, streak_count, last_completion_date)
      VALUES (p_task_id, v_task.assigned_to, v_new_streak_count, v_completion_date);
    END IF;
  END IF;

  -- Step 3: Award credits if applicable
  -- NO STREAK BONUS - credits are exactly reward_text::int
  IF v_task.reward_type = 'credit' AND v_task.reward_text IS NOT NULL AND v_task.assigned_to IS NOT NULL THEN
    v_credit_amount := v_task.reward_text::integer;

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
'V2: Approves a task in review status. Updates task status, tracks streaks for daily missions (using submission date), and awards base credits (no streak bonus). Uses SECURITY DEFINER to bypass RLS.';
