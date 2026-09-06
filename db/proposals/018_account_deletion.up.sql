-- STAGED ONLY. Requires 016 + 017, a verified backup and explicit production approval.
-- No Storage metadata is deleted by this SQL: file bytes must be removed through
-- the Storage API before the relational cleanup RPC is allowed to proceed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $preconditions$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.profiles'::regclass)
    OR has_column_privilege('authenticated','public.profiles','role','UPDATE')
    OR has_table_privilege('authenticated','public.tasks','UPDATE') THEN
    RAISE EXCEPTION '018: apply and verify profile/task boundary repairs first';
  END IF;
END $preconditions$;

CREATE SCHEMA IF NOT EXISTS bounty_private;
REVOKE ALL ON SCHEMA bounty_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA bounty_private TO authenticated, service_role;

-- One small marker freezes writes and records progress across three systems.
-- No Auth FK: a completion receipt must survive removal of the Auth identity.
CREATE TABLE IF NOT EXISTS bounty_private.account_deletions (
  user_id uuid PRIMARY KEY,
  operation_id uuid NOT NULL UNIQUE,
  session_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  phase text NOT NULL DEFAULT 'storage' CHECK (phase IN ('storage','auth','complete')),
  completed_at timestamptz
);
ALTER TABLE bounty_private.account_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON bounty_private.account_deletions FROM PUBLIC, anon, authenticated;
GRANT ALL ON bounty_private.account_deletions TO service_role;

CREATE OR REPLACE FUNCTION bounty_private.account_active(p_user_id uuid)
-- VOLATILE is intentional: after waiting for the advisory lock, a trigger must
-- observe the just-committed deletion marker rather than its statement snapshot.
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id=p_user_id)
    AND NOT EXISTS (SELECT 1 FROM bounty_private.account_deletions WHERE user_id=p_user_id)
$$;
REVOKE ALL ON FUNCTION bounty_private.account_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION bounty_private.account_active(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION bounty_private.guard_account_links()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  old_row jsonb := CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  new_row jsonb := CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) ELSE '{}'::jsonb END;
  ids uuid[] := ARRAY[]::uuid[];
  row_data jsonb; col text; target uuid; reward uuid; task uuid; namespace_id text; actor uuid := auth.uid();
BEGIN
  IF COALESCE(auth.jwt()->>'role','')='service_role' AND
    (TG_OP='DELETE' OR current_setting('bounty.account_cleanup',true)='allowed') THEN
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF COALESCE(auth.jwt()->>'role','')='authenticated' THEN
    IF actor IS NULL THEN RAISE EXCEPTION 'account_inactive' USING ERRCODE='42501'; END IF;
    ids := array_append(ids,actor);
  END IF;
  FOREACH row_data IN ARRAY ARRAY[old_row,new_row] LOOP
    FOREACH col IN ARRAY TG_ARGV LOOP
      IF row_data->>col IS NOT NULL THEN ids := array_append(ids,(row_data->>col)::uuid); END IF;
    END LOOP;
    IF TG_TABLE_NAME='collected_rewards' AND row_data->>'reward_id' IS NOT NULL THEN
      reward := (row_data->>'reward_id')::uuid;
      ids := ids || ARRAY(SELECT u FROM public.rewards_store r,
        LATERAL unnest(ARRAY[r.creator_id,r.assigned_to]) u WHERE r.id=reward AND u IS NOT NULL);
    END IF;
    IF TG_TABLE_NAME IN ('credit_transactions','daily_mission_streaks') THEN
      task := COALESCE(row_data->>'task_id',row_data->>'contract_id')::uuid;
      ids := ids || ARRAY(SELECT u FROM public.tasks t,
        LATERAL unnest(ARRAY[t.created_by,t.assigned_to]) u WHERE t.id=task AND u IS NOT NULL);
    END IF;
    IF TG_TABLE_SCHEMA='storage' AND TG_TABLE_NAME='objects' THEN
      -- Owner metadata covers legacy paths; canonical namespaces cover objects
      -- uploaded by a service or the other participant in a shared mission.
      IF row_data->>'owner_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        ids := array_append(ids,(row_data->>'owner_id')::uuid);
      END IF;
      namespace_id := CASE
        WHEN row_data->>'bucket_id'='avatars' THEN split_part(row_data->>'name','/',1)
        WHEN row_data->>'bucket_id'='reward-images' AND split_part(row_data->>'name','/',1)='rewards'
          THEN split_part(row_data->>'name','/',2)
        ELSE NULL END;
      IF namespace_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        ids := array_append(ids,namespace_id::uuid);
      END IF;
      IF row_data->>'bucket_id'='bounty-proofs' THEN
        ids := ids || ARRAY(SELECT u FROM public.tasks t,
          LATERAL unnest(ARRAY[t.created_by,t.assigned_to]) u
          WHERE split_part(row_data->>'name','/',1)='proofs'
            AND t.id::text=lower(split_part(row_data->>'name','/',2)) AND u IS NOT NULL);
      END IF;
    END IF;
  END LOOP;
  -- The same locks serialize begin-deletion against in-flight mutations. Sort
  -- multi-person locks consistently to avoid reciprocal-mission deadlocks.
  FOR target IN SELECT DISTINCT u FROM unnest(ids) u WHERE u IS NOT NULL ORDER BY u LOOP
    IF NOT bounty_private.account_active(target) THEN
      RAISE EXCEPTION 'account_inactive' USING ERRCODE='42501';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('account:'||target::text,0));
    IF NOT bounty_private.account_active(target) THEN
      RAISE EXCEPTION 'account_inactive' USING ERRCODE='42501';
    END IF;
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
REVOKE ALL ON FUNCTION bounty_private.guard_account_links() FROM PUBLIC, anon, authenticated;

DO $guards$
DECLARE entry text[]; table_name text; args text;
BEGIN
  FOREACH entry SLICE 1 IN ARRAY ARRAY[
    ['profiles','id'], ['tasks','created_by,assigned_to'],
    ['friendships','user1_id,user2_id,requested_by'], ['invites','inviter_id'],
    ['rewards_store','creator_id,assigned_to'], ['collected_rewards','collector_id'],
    ['credit_transactions','user_id'], ['daily_mission_streaks','user_id'], ['user_credits','user_id']
  ] LOOP
    table_name := entry[1];
    SELECT string_agg(quote_literal(v),',') INTO args FROM unnest(string_to_array(entry[2],',')) v;
    EXECUTE format('DROP TRIGGER IF EXISTS account_deletion_guard ON public.%I',table_name);
    EXECUTE format('CREATE TRIGGER account_deletion_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION bounty_private.guard_account_links(%s)',table_name,args);
    EXECUTE format('DROP POLICY IF EXISTS account_active_actor ON public.%I',table_name);
    EXECUTE format('CREATE POLICY account_active_actor ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (bounty_private.account_active(auth.uid())) WITH CHECK (bounty_private.account_active(auth.uid()))',table_name);
  END LOOP;
END $guards$;
DROP TRIGGER IF EXISTS account_deletion_guard ON storage.objects;
CREATE TRIGGER account_deletion_guard BEFORE INSERT OR UPDATE OR DELETE ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION bounty_private.guard_account_links('owner');
DROP POLICY IF EXISTS account_active_actor ON storage.objects;
CREATE POLICY account_active_actor ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
  USING (bounty_private.account_active(auth.uid())) WITH CHECK (bounty_private.account_active(auth.uid()));

CREATE OR REPLACE FUNCTION bounty_private.assert_deletion_schema()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE changed boolean;
BEGIN
  IF (SELECT array_agg(c.relname::text ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p')) IS DISTINCT FROM
      ARRAY['collected_rewards','credit_transactions','daily_mission_streaks','friendships','invites','profiles','rewards_store','tasks','user_credits']::text[] THEN
    RAISE EXCEPTION 'deletion_table_inventory_changed';
  END IF;
  -- Pin the reviewed 017 SECURITY DEFINER purchase boundary too: SELECT RLS
  -- alone cannot prevent a caller buying a detached reward by its known UUID.
  -- Intentional strict drift check; legitimate RPC changes require this review.
  IF to_regprocedure('public.purchase_reward(uuid,uuid)') IS NULL
    OR md5(pg_get_functiondef(to_regprocedure('public.purchase_reward(uuid,uuid)'))) <> 'ef98df3f98f9fd30a879176cd8dc6dbc' THEN
    RAISE EXCEPTION 'deletion_purchase_boundary_changed';
  END IF;
  -- Cleanup clears a departing recipient. A reward must still be private to its
  -- creator afterwards; refuse policy drift before removing any shared content.
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.rewards_store'::regclass)
    OR (SELECT count(*) FROM pg_policy WHERE polrelid='public.rewards_store'::regclass AND polpermissive AND polcmd IN ('r','*'))<>1
    OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rewards_store'
      AND policyname='rewards_store_select_private' AND permissive='PERMISSIVE' AND cmd='SELECT'
      AND roles=ARRAY['authenticated']::name[] AND qual='((creator_id = auth.uid()) OR (assigned_to = auth.uid()))') THEN
    RAISE EXCEPTION 'deletion_reward_privacy_changed';
  END IF;
  -- Compare table + constraint + complete FK definition. Unknown custom-schema
  -- dependencies, missing constraints or changed cascades require review before
  -- any Storage removal. Auth/Storage's own internal FKs remain their API's job.
  WITH expected(child,name,definition) AS (VALUES
      ('public.collected_rewards','collected_rewards_collector_id_fkey','FOREIGN KEY (collector_id) REFERENCES auth.users(id)'),
      ('public.collected_rewards','collected_rewards_reward_id_fkey','FOREIGN KEY (reward_id) REFERENCES rewards_store(id)'),
      ('public.credit_transactions','credit_transactions_task_id_fkey','FOREIGN KEY (task_id) REFERENCES tasks(id)'),
      ('public.credit_transactions','credit_transactions_user_id_fkey','FOREIGN KEY (user_id) REFERENCES profiles(id)'),
      ('public.daily_mission_streaks','daily_mission_streaks_contract_id_fkey','FOREIGN KEY (contract_id) REFERENCES tasks(id) ON DELETE CASCADE'),
      ('public.daily_mission_streaks','daily_mission_streaks_user_id_fkey','FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE'),
      ('public.friendships','friendships_requested_by_fkey','FOREIGN KEY (requested_by) REFERENCES profiles(id)'),
      ('public.friendships','friendships_user1_id_fkey','FOREIGN KEY (user1_id) REFERENCES profiles(id) ON DELETE CASCADE'),
      ('public.friendships','friendships_user2_id_fkey','FOREIGN KEY (user2_id) REFERENCES profiles(id) ON DELETE CASCADE'),
      ('public.invites','invites_inviter_id_fkey','FOREIGN KEY (inviter_id) REFERENCES profiles(id) ON DELETE CASCADE'),
      ('public.profiles','profiles_id_fkey','FOREIGN KEY (id) REFERENCES auth.users(id)'),
      ('public.profiles','profiles_partner_fk','FOREIGN KEY (partner_user_id) REFERENCES profiles(id) ON DELETE SET NULL'),
      ('public.rewards_store','rewards_store_assigned_to_fkey','FOREIGN KEY (assigned_to) REFERENCES profiles(id)'),
      ('public.rewards_store','rewards_store_creator_id_fkey','FOREIGN KEY (creator_id) REFERENCES auth.users(id)'),
      ('public.tasks','tasks_assigned_to_fkey','FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE CASCADE'),
      ('public.tasks','tasks_created_by_fkey','FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE'),
      ('public.user_credits','user_credits_user_id_fkey','FOREIGN KEY (user_id) REFERENCES profiles(id)')
  ), actual AS (
    SELECT n.nspname||'.'||child.relname AS child,c.conname AS name,
      replace(pg_get_constraintdef(c.oid),'REFERENCES public.','REFERENCES ') AS definition
    FROM pg_constraint c JOIN pg_class child ON child.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=child.relnamespace
    WHERE c.contype='f' AND n.nspname NOT IN ('auth','storage')
      AND c.confrelid IN ('auth.users'::regclass,'public.profiles'::regclass,'public.tasks'::regclass,'public.rewards_store'::regclass,
        'public.collected_rewards'::regclass,'public.credit_transactions'::regclass,'public.friendships'::regclass,
        'public.invites'::regclass,'public.daily_mission_streaks'::regclass,'public.user_credits'::regclass)
  ) SELECT EXISTS(SELECT 1 FROM expected e FULL JOIN actual a USING(child,name)
      WHERE e.definition IS DISTINCT FROM a.definition) INTO changed;
  IF changed THEN RAISE EXCEPTION 'deletion_schema_changed'; END IF;
END $$;
REVOKE ALL ON FUNCTION bounty_private.assert_deletion_schema() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.begin_account_deletion(p_user_id uuid,p_session_id uuid,p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE prior bounty_private.account_deletions; session_created timestamptz;
BEGIN
  IF COALESCE(auth.jwt()->>'role','')<>'service_role' THEN RAISE EXCEPTION 'not_permitted' USING ERRCODE='42501'; END IF;
  PERFORM bounty_private.assert_deletion_schema();
  PERFORM pg_advisory_xact_lock(hashtextextended('account:'||p_user_id::text,0));
  SELECT * INTO prior FROM bounty_private.account_deletions WHERE user_id=p_user_id FOR UPDATE;
  SELECT created_at INTO session_created FROM auth.sessions WHERE id=p_session_id AND user_id=p_user_id
    AND (not_after IS NULL OR not_after>now());
  IF session_created IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) THEN
    RETURN jsonb_build_object('error','reauth_required');
  END IF;
  IF prior.user_id IS NULL OR prior.session_id<>p_session_id THEN
    IF session_created<now()-interval '5 minutes' OR session_created>now()+interval '30 seconds' THEN
      RETURN jsonb_build_object('error','reauth_required');
    END IF;
  END IF;
  IF prior.user_id IS NOT NULL THEN
    IF prior.operation_id<>p_operation_id THEN RETURN jsonb_build_object('error','deletion_in_progress'); END IF;
    UPDATE bounty_private.account_deletions SET session_id=p_session_id WHERE user_id=p_user_id;
    RETURN jsonb_build_object('phase',prior.phase);
  END IF;
  IF p_operation_id IS NULL OR p_session_id IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('error','invalid_request');
  END IF;
  INSERT INTO bounty_private.account_deletions(user_id,operation_id,session_id) VALUES(p_user_id,p_operation_id,p_session_id);
  RETURN jsonb_build_object('phase','storage');
END $$;

CREATE OR REPLACE FUNCTION public.account_deletion_files(p_user_id uuid,p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE files jsonb;
BEGIN
  IF COALESCE(auth.jwt()->>'role','')<>'service_role' THEN RAISE EXCEPTION 'not_permitted' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM bounty_private.account_deletions WHERE user_id=p_user_id AND operation_id=p_operation_id) THEN
    RAISE EXCEPTION 'not_permitted' USING ERRCODE='42501';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('bucket_id',bucket_id,'name',name)),'[]') INTO files FROM (
    SELECT o.bucket_id,o.name FROM storage.objects o
    WHERE o.owner=p_user_id OR o.owner_id=p_user_id::text
      OR (o.bucket_id='avatars' AND lower(split_part(o.name,'/',1))=p_user_id::text)
      OR (o.bucket_id='reward-images' AND split_part(o.name,'/',1)='rewards' AND lower(split_part(o.name,'/',2))=p_user_id::text)
      OR (o.bucket_id='bounty-proofs' AND split_part(o.name,'/',1)='proofs' AND EXISTS(
        SELECT 1 FROM public.tasks t WHERE t.id::text=lower(split_part(o.name,'/',2))
          AND (t.created_by=p_user_id OR t.assigned_to=p_user_id)))
    ORDER BY o.bucket_id,o.name LIMIT 100
  ) selected;
  RETURN files;
END $$;

CREATE OR REPLACE FUNCTION public.cleanup_account_data(p_user_id uuid,p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE prior bounty_private.account_deletions; task_ids uuid[];
BEGIN
  IF COALESCE(auth.jwt()->>'role','')<>'service_role' THEN RAISE EXCEPTION 'not_permitted' USING ERRCODE='42501'; END IF;
  PERFORM bounty_private.assert_deletion_schema();
  PERFORM pg_advisory_xact_lock(hashtextextended('account:'||p_user_id::text,0));
  SELECT * INTO prior FROM bounty_private.account_deletions WHERE user_id=p_user_id AND operation_id=p_operation_id FOR UPDATE;
  IF prior.user_id IS NULL THEN RAISE EXCEPTION 'not_permitted' USING ERRCODE='42501'; END IF;
  IF jsonb_array_length(public.account_deletion_files(p_user_id,p_operation_id))<>0 THEN
    RETURN jsonb_build_object('error','storage_remaining');
  END IF;
  IF prior.phase<>'storage' THEN RETURN jsonb_build_object('phase',prior.phase); END IF;
  -- Only this trusted transaction may detach/delete links to a frozen account.
  -- Ordinary service uploads/updates still hit the guard, closing the API race.
  PERFORM set_config('bounty.account_cleanup','allowed',true);
  SELECT COALESCE(array_agg(id),ARRAY[]::uuid[]) INTO task_ids FROM public.tasks WHERE created_by=p_user_id OR assigned_to=p_user_id;
  DELETE FROM public.credit_transactions WHERE user_id=p_user_id;
  -- Preserve other people's earned/spent totals without retaining the erased mission link.
  UPDATE public.credit_transactions SET task_id=NULL WHERE task_id=ANY(task_ids);
  DELETE FROM public.collected_rewards WHERE collector_id=p_user_id
    OR reward_id IN(SELECT id FROM public.rewards_store WHERE creator_id=p_user_id);
  UPDATE public.rewards_store SET assigned_to=NULL,is_active=false WHERE assigned_to=p_user_id AND creator_id IS DISTINCT FROM p_user_id;
  DELETE FROM public.rewards_store WHERE creator_id=p_user_id;
  DELETE FROM public.daily_mission_streaks WHERE user_id=p_user_id OR contract_id=ANY(task_ids);
  DELETE FROM public.tasks WHERE id=ANY(task_ids);
  DELETE FROM public.friendships WHERE user1_id=p_user_id OR user2_id=p_user_id OR requested_by=p_user_id;
  DELETE FROM public.invites WHERE inviter_id=p_user_id;
  DELETE FROM public.user_credits WHERE user_id=p_user_id;
  UPDATE public.profiles SET partner_user_id=NULL WHERE partner_user_id=p_user_id;
  DELETE FROM public.profiles WHERE id=p_user_id;
  UPDATE bounty_private.account_deletions SET phase='auth' WHERE user_id=p_user_id;
  RETURN jsonb_build_object('phase','auth');
END $$;

CREATE OR REPLACE FUNCTION public.complete_account_deletion(p_user_id uuid,p_operation_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF COALESCE(auth.jwt()->>'role','')<>'service_role' THEN RAISE EXCEPTION 'not_permitted' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) THEN RETURN false; END IF;
  UPDATE bounty_private.account_deletions SET phase='complete',completed_at=COALESCE(completed_at,now())
    WHERE user_id=p_user_id AND operation_id=p_operation_id AND phase IN('auth','complete');
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.account_deletion_receipt(p_user_id uuid,p_operation_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF COALESCE(auth.jwt()->>'role','')<>'service_role' THEN RAISE EXCEPTION 'not_permitted' USING ERRCODE='42501'; END IF;
  -- The opaque operation receipt conveys only completion, never an identity or
  -- permission to start/resume deletion. It handles a lost final HTTP response.
  RETURN EXISTS(SELECT 1 FROM bounty_private.account_deletions d WHERE user_id=p_user_id AND operation_id=p_operation_id
    AND phase IN('auth','complete') AND NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=d.user_id));
END $$;

REVOKE ALL ON FUNCTION public.begin_account_deletion(uuid,uuid,uuid),public.account_deletion_files(uuid,uuid),
  public.cleanup_account_data(uuid,uuid),public.complete_account_deletion(uuid,uuid),public.account_deletion_receipt(uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_account_deletion(uuid,uuid,uuid),public.account_deletion_files(uuid,uuid),
  public.cleanup_account_data(uuid,uuid),public.complete_account_deletion(uuid,uuid),public.account_deletion_receipt(uuid,uuid)
  TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
