-- supabase/migrations/20260109_delete_reward_with_cascade.sql
-- Updates delete_reward_store_item to handle collected_rewards FK constraint.
-- Deletes from collected_rewards first, then from rewards_store.

-- Drop the old version
DROP FUNCTION IF EXISTS public.delete_reward_store_item(uuid);

-- Note: The p_bounty_id parameter name is kept for backwards compatibility
-- with existing frontend code that uses this RPC.
CREATE OR REPLACE FUNCTION public.delete_reward_store_item(p_reward_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user owns this reward
  IF NOT EXISTS (
    SELECT 1 FROM public.rewards_store
    WHERE id = p_reward_id AND creator_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized or reward not found');
  END IF;

  -- First, delete from collected_rewards (child table) to avoid FK violation
  DELETE FROM public.collected_rewards WHERE reward_id = p_reward_id;

  -- Then delete the reward itself
  DELETE FROM public.rewards_store WHERE id = p_reward_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.delete_reward_store_item(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_reward_store_item(uuid) IS 'Deletes a reward and its collection records. Only the creator can delete their rewards.';
