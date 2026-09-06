-- Proposal only. Apply after 016, verified backup and explicit approval.
-- Direct client request APIs remain compatible; valid invite redemption remains
-- the intentional SECURITY DEFINER path for immediate accepted connections.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $preconditions$
DECLARE unexpected text;
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass)
    OR has_column_privilege('authenticated', 'public.profiles', 'role', 'INSERT,UPDATE')
    OR has_any_column_privilege('authenticated', 'public.tasks', 'INSERT,UPDATE')
    OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tasks' AND cmd<>'SELECT') THEN
    RAISE EXCEPTION '017: apply and verify 016 first';
  END IF;
  SELECT string_agg(policyname, ', ') INTO unexpected FROM pg_policies
  WHERE schemaname='public' AND tablename='friendships' AND policyname NOT IN (
    'Create friendships', 'Update friendships', 'Users can delete own friend requests', 'View friendships',
    'friendships_participant_read', 'friendships_request_insert', 'friendships_recipient_accept', 'friendships_participant_delete');
  IF unexpected IS NOT NULL THEN RAISE EXCEPTION '017: unknown friendship policies: %', unexpected; END IF;
END $preconditions$;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Create friendships" ON public.friendships;
DROP POLICY IF EXISTS "Update friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete own friend requests" ON public.friendships;
DROP POLICY IF EXISTS "View friendships" ON public.friendships;
DROP POLICY IF EXISTS friendships_participant_read ON public.friendships;
DROP POLICY IF EXISTS friendships_request_insert ON public.friendships;
DROP POLICY IF EXISTS friendships_recipient_accept ON public.friendships;
DROP POLICY IF EXISTS friendships_participant_delete ON public.friendships;
CREATE POLICY friendships_participant_read ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() IN (user1_id, user2_id));
CREATE POLICY friendships_request_insert ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (requested_by=auth.uid() AND auth.uid() IN (user1_id, user2_id)
    AND user1_id IS NOT NULL AND user2_id IS NOT NULL AND user1_id<>user2_id AND status='pending');
CREATE POLICY friendships_recipient_accept ON public.friendships FOR UPDATE TO authenticated
  USING (status='pending' AND requested_by IN (user1_id, user2_id) AND auth.uid() IN (user1_id, user2_id) AND auth.uid()<>requested_by)
  WITH CHECK (status='accepted' AND requested_by IN (user1_id, user2_id) AND auth.uid() IN (user1_id, user2_id) AND auth.uid()<>requested_by);
CREATE POLICY friendships_participant_delete ON public.friendships FOR DELETE TO authenticated
  USING (status IN ('pending','accepted') AND auth.uid() IN (user1_id, user2_id));
-- RLS governs rows; these column ACLs make endpoints and requester immutable.
REVOKE ALL PRIVILEGES ON public.friendships FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.friendships TO authenticated;
GRANT INSERT (user1_id, user2_id, requested_by, status), UPDATE (status) ON public.friendships TO authenticated;

-- create_task/update_task below are the confirmed live 013 definitions, with
-- only accepted-recipient authorization added. Existing lifecycle/reward rules stay.
CREATE OR REPLACE FUNCTION public.create_task(p_title text, p_description text DEFAULT NULL::text, p_assigned_to uuid DEFAULT NULL::uuid, p_deadline date DEFAULT NULL::date, p_reward_type text DEFAULT NULL::text, p_reward_text text DEFAULT NULL::text, p_proof_required boolean DEFAULT false, p_is_daily boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

 -- 017: new missions require the recipient's accepted connection, except the
 -- existing unassigned/self-text cases. Self-credit is rejected above.
 IF p_assigned_to IS NOT NULL AND p_assigned_to <> v_uid AND NOT EXISTS (
   SELECT 1 FROM public.friendships f WHERE f.status = 'accepted' AND f.requested_by IN (f.user1_id, f.user2_id) AND
   ((f.user1_id = v_uid AND f.user2_id = p_assigned_to) OR
    (f.user2_id = v_uid AND f.user1_id = p_assigned_to))
 ) THEN
   RETURN json_build_object('success', false, 'error', 'recipient_not_connected');
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_task(p_task_id uuid, p_patch jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

 -- 017: changing the recipient needs a current accepted connection. Existing
 -- missions remain editable after disconnect; this does not assign anything new.
 IF v_eff_assignee IS DISTINCT FROM v_task.assigned_to
    AND v_eff_assignee IS NOT NULL AND v_eff_assignee <> v_uid AND NOT EXISTS (
   SELECT 1 FROM public.friendships f WHERE f.status = 'accepted' AND f.requested_by IN (f.user1_id, f.user2_id) AND
   ((f.user1_id = v_uid AND f.user2_id = v_eff_assignee) OR
    (f.user2_id = v_uid AND f.user1_id = v_eff_assignee))
 ) THEN
   RETURN json_build_object('success', false, 'error', 'recipient_not_connected');
 END IF;
 UPDATE public.tasks SET
 title = CASE WHEN p_patch ? 'title' THEN p_patch->>'title' ELSE title END,
 description = CASE WHEN p_patch ? 'description' THEN p_patch->>'description' ELSE description END,
 assigned_to = CASE WHEN p_patch ? 'assigned_to' THEN (p_patch->>'assigned_to')::uuid ELSE assigned_to END,
 deadline = CASE WHEN p_patch ? 'deadline' THEN (p_patch->>'deadline')::date ELSE deadline END,
 reward_type = CASE WHEN p_patch ? 'reward_type' THEN p_patch->>'reward_type' ELSE reward_type END,
 reward_text = CASE WHEN p_patch ? 'reward_text' THEN p_patch->>'reward_text' ELSE reward_text END,
 proof_required = CASE WHEN p_patch ? 'proof_required' THEN COALESCE((p_patch->>'proof_required')::boolean, false) ELSE proof_required END,
 is_daily = CASE WHEN p_patch ? 'is_daily' THEN COALESCE((p_patch->>'is_daily')::boolean, false) ELSE is_daily END
 WHERE id = p_task_id;

 RETURN json_build_object('success', true);
END;
$function$
;

-- The confirmed live purchase RPC, with recipient authorization before mutations.
CREATE OR REPLACE FUNCTION public.purchase_reward(p_reward_id uuid, p_collector_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_reward_cost integer;
 v_reward_creator uuid;
 v_reward_assignee uuid;
 v_current_balance integer;
 v_reward_name text;
 v_collection_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN
 RETURN json_build_object(
 'success', false,
 'error', 'NOT_AUTHENTICATED',
 'message', 'Not authenticated'
 );
 END IF;

 IF auth.uid() IS DISTINCT FROM p_collector_id THEN
 RETURN json_build_object(
 'success', false,
 'error', 'FORBIDDEN',
 'message', 'collector_id must match authenticated user'
 );
 END IF;

 SELECT balance
 INTO v_current_balance
 FROM public.user_credits
 WHERE user_id = p_collector_id
 FOR UPDATE;

 IF v_current_balance IS NULL THEN
 v_current_balance := 0;
 END IF;

 SELECT credit_cost, creator_id, name, assigned_to
 INTO v_reward_cost, v_reward_creator, v_reward_name, v_reward_assignee
 FROM public.rewards_store
 WHERE id = p_reward_id
 AND is_active = true
 FOR UPDATE;

 IF v_reward_cost IS NULL THEN
 RETURN json_build_object(
 'success', false,
 'error', 'REWARD_NOT_FOUND',
 'message', 'Reward not found or inactive'
 );
 END IF;

 IF v_reward_creator = p_collector_id THEN
 RETURN json_build_object(
 'success', false,
 'error', 'SELF_PURCHASE',
 'message', 'Cannot purchase your own reward'
 );
 END IF;

 -- 017: this SECURITY DEFINER RPC must enforce the same private recipient
 -- boundary as SELECT RLS. A known UUID is not purchase authorization. NULL is
 -- creator-private (including retained rewards after a recipient deletes account).
 IF v_reward_assignee IS DISTINCT FROM p_collector_id THEN
   RETURN json_build_object(
     'success', false, 'error', 'NOT_RECIPIENT',
     'message', 'This reward is not assigned to you'
   );
 END IF;
 IF v_current_balance < v_reward_cost THEN
 RETURN json_build_object(
 'success', false,
 'error', 'INSUFFICIENT_FUNDS',
 'message', 'Insufficient credits',
 'required', v_reward_cost,
 'available', v_current_balance
 );
 END IF;

 BEGIN
 INSERT INTO public.collected_rewards (reward_id, collector_id)
 VALUES (p_reward_id, p_collector_id)
 RETURNING id INTO v_collection_id;
 EXCEPTION
 WHEN unique_violation THEN
 RETURN json_build_object(
 'success', false,
 'error', 'ALREADY_COLLECTED',
 'message', 'You have already collected this reward'
 );
 END;

 INSERT INTO public.credit_transactions (
 user_id,
 amount,
 transaction_type,
 task_id
 ) VALUES (
 p_collector_id,
 -v_reward_cost,
 'spent',
 NULL
 );

 UPDATE public.user_credits
 SET
 balance = balance - v_reward_cost,
 updated_at = now()
 WHERE user_id = p_collector_id;

 UPDATE public.rewards_store
 SET
 is_active = false,
 updated_at = now()
 WHERE id = p_reward_id;

 RETURN json_build_object(
 'success', true,
 'message', 'Reward purchased successfully',
 'collection_id', v_collection_id,
 'reward_id', p_reward_id,
 'reward_name', v_reward_name,
 'cost', v_reward_cost,
 'new_balance', v_current_balance - v_reward_cost
 );
END;
$function$
;

REVOKE ALL ON FUNCTION public.create_task(text,text,uuid,date,text,text,boolean,boolean), public.update_task(uuid,jsonb), public.purchase_reward(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_task(text,text,uuid,date,text,text,boolean,boolean), public.update_task(uuid,jsonb), public.purchase_reward(uuid,uuid) TO authenticated;
-- Read-only metadata assertions, also embedded before the apply COMMIT.
DO $verify$
DECLARE client_role text; col record;
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.friendships'::regclass)
    OR (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='friendships') <> 4 THEN
    RAISE EXCEPTION '017 verification: friendship RLS/policy drift';
  END IF;
  FOREACH client_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF has_table_privilege(client_role, 'public.friendships', 'INSERT,UPDATE,TRUNCATE,REFERENCES,TRIGGER') THEN
      RAISE EXCEPTION '017 verification: % retains broad table grants', client_role;
    END IF;
    FOR col IN SELECT attname FROM pg_attribute WHERE attrelid='public.friendships'::regclass AND attnum>0 AND NOT attisdropped LOOP
      IF (client_role='anon' OR col.attname NOT IN ('user1_id','user2_id','requested_by','status'))
        AND has_column_privilege(client_role,'public.friendships',col.attname,'INSERT') THEN
        RAISE EXCEPTION '017 verification: % can insert protected column %', client_role, col.attname;
      END IF;
      IF (client_role='anon' OR col.attname<>'status')
        AND has_column_privilege(client_role,'public.friendships',col.attname,'UPDATE,REFERENCES') THEN
        RAISE EXCEPTION '017 verification: % can change protected column %', client_role, col.attname;
      END IF;
    END LOOP;
  END LOOP;
  IF has_any_column_privilege('anon','public.friendships','SELECT') OR has_table_privilege('anon','public.friendships','DELETE') THEN
    RAISE EXCEPTION '017 verification: anonymous friendship access remains';
  END IF;
  IF has_function_privilege('anon','public.create_task(text,text,uuid,date,text,text,boolean,boolean)','EXECUTE')
    OR has_function_privilege('anon','public.update_task(uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.purchase_reward(uuid,uuid)','EXECUTE') THEN
    RAISE EXCEPTION '017 verification: anonymous task RPC execution remains';
  END IF;
  RAISE NOTICE '017 assertions passed';
END $verify$;

NOTIFY pgrst, 'reload schema';
COMMIT;
