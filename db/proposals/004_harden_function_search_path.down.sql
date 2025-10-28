-- Rollback Proposal 004: Remove search_path Hardening
-- Restores original SECURITY DEFINER functions without search_path protection
-- WARNING: This rollback restores vulnerable state - only use if migration fails

BEGIN;

-- 1. create_reward_store_item (restore without SET search_path)
CREATE OR REPLACE FUNCTION "public"."create_reward_store_item"("p_name" "text", "p_description" "text", "p_image_url" "text", "p_credit_cost" integer, "p_assigned_to" "uuid")
RETURNS "json"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
  v_new_id UUID;
  v_are_friends BOOLEAN;
BEGIN
  -- Check friendship
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND ((user1_id = auth.uid() AND user2_id = p_assigned_to)
      OR (user2_id = auth.uid() AND user1_id = p_assigned_to))
  ) INTO v_are_friends;

  IF NOT v_are_friends THEN
    RETURN json_build_object('success', false, 'error', 'Can only create bounties for friends');
  END IF;

  -- Validate credits
  IF p_credit_cost < 1 OR p_credit_cost > 1000000 THEN
    RETURN json_build_object('success', false, 'error', 'Credit cost must be between 1 and 1,000,000');
  END IF;

  -- Insert
  INSERT INTO public.rewards_store (
    name, description, image_url, credit_cost, creator_id, assigned_to
  ) VALUES (
    p_name, p_description, p_image_url, p_credit_cost, auth.uid(), p_assigned_to
  ) RETURNING id INTO v_new_id;

  RETURN json_build_object('success', true, 'reward_id', v_new_id);
END;
$$;

-- 2. delete_reward_store_item (restore without SET search_path)
CREATE OR REPLACE FUNCTION "public"."delete_reward_store_item"("p_bounty_id" "uuid")
RETURNS "json"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user owns this bounty
  IF NOT EXISTS (
    SELECT 1 FROM public.rewards_store
    WHERE id = p_bounty_id AND creator_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Delete the bounty
  DELETE FROM public.rewards_store WHERE id = p_bounty_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 3. update_reward_store_item (restore without SET search_path)
CREATE OR REPLACE FUNCTION "public"."update_reward_store_item"("p_bounty_id" "uuid", "p_name" "text", "p_description" "text", "p_image_url" "text", "p_credit_cost" integer)
RETURNS "json"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
  -- Check ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.rewards_store
    WHERE id = p_bounty_id AND creator_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Update
  UPDATE public.rewards_store
  SET
    name = p_name,
    description = p_description,
    image_url = p_image_url,
    credit_cost = p_credit_cost
  WHERE id = p_bounty_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 4. increment_user_credits (restore without SET search_path)
CREATE OR REPLACE FUNCTION "public"."increment_user_credits"("user_id_param" "uuid", "amount_param" integer)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_credits
  SET balance = balance + amount_param
  WHERE user_id = user_id_param;
END;
$$;

-- 5. handle_new_user (restore without SET search_path)
CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    SPLIT_PART(new.email, '@', 1),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

COMMIT;
