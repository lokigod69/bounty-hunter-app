-- supabase/migrations/20231117000000_complete_task_instance.sql
-- This migration creates the RPC for completing a recurring task instance.
-- It handles two cases:
-- 1. If proof is not required, it marks the task as 'completed' and awards credits immediately.
-- 2. If proof is required, it validates that proof is provided, sets the status to 'review', and stores the proof description.

CREATE OR REPLACE FUNCTION complete_task_instance(instance_id_param UUID, user_id_param UUID, proof_description_param TEXT DEFAULT NULL)
RETURNS TABLE (j JSONB) AS $$
DECLARE
  instance RECORD;
  template RECORD;
BEGIN
  -- Get the instance details and the associated template details
  SELECT * INTO instance FROM public.recurring_task_instances WHERE id = instance_id_param AND assigned_to = user_id_param;

  IF NOT FOUND THEN
    RETURN QUERY SELECT jsonb_build_object('success', FALSE, 'message', 'Task instance not found or you are not assigned to it.');
    RETURN;
  END IF;

  SELECT * INTO template FROM public.recurring_task_templates WHERE id = instance.template_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT jsonb_build_object('success', FALSE, 'message', 'Associated task template not found.');
    RETURN;
  END IF;

  -- Case 1: Proof is not required
  IF NOT template.proof_required THEN
    UPDATE public.recurring_task_instances
    SET status = 'completed', completed_at = NOW()
    WHERE id = instance_id_param;

    -- Award credits
    IF template.credit_value > 0 THEN
      PERFORM increment_user_credits(user_id_param, template.credit_value);
    END IF;

    RETURN QUERY SELECT jsonb_build_object('success', TRUE, 'message', 'Task completed and credits awarded.');
  -- Case 2: Proof is required
  ELSE
    -- Enforce proof submission if required
    IF proof_description_param IS NULL OR TRIM(proof_description_param) = '' THEN
      RETURN QUERY SELECT jsonb_build_object('success', FALSE, 'message', 'Proof is required for this task and was not provided.');
      RETURN;
    END IF;

    UPDATE public.recurring_task_instances
    SET status = 'review', proof_description = proof_description_param
    WHERE id = instance_id_param;

    RETURN QUERY SELECT jsonb_build_object('success', TRUE, 'message', 'Proof submitted for review.');
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the function to authenticated users
GRANT EXECUTE ON FUNCTION complete_task_instance(UUID, UUID, TEXT) TO authenticated;
