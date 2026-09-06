-- STAGED. Apply after 016/017/018, verified schema/ACL backup and explicit review/go.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
SELECT bounty_private.assert_deletion_schema();

CREATE TABLE IF NOT EXISTS bounty_private.user_blocks (
  blocker_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(blocker_id,blocked_id), CHECK(blocker_id<>blocked_id)
);
CREATE INDEX IF NOT EXISTS user_blocks_reverse ON bounty_private.user_blocks(blocked_id,blocker_id);
CREATE TABLE IF NOT EXISTS bounty_private.safety_budgets (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text CHECK(kind IN ('lookup','report')), started_at timestamptz NOT NULL,
  used integer NOT NULL CHECK(used>0), PRIMARY KEY(user_id,kind)
);
CREATE TABLE IF NOT EXISTS bounty_private.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK(reason IN ('harassment','unsafe_content','spam','other')),
  details text NOT NULL CHECK(char_length(details)<=1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(reporter_id<>subject_id)
);
DO $$ DECLARE name text; BEGIN
  FOREACH name IN ARRAY ARRAY['user_blocks','safety_budgets','user_reports'] LOOP
    EXECUTE format('ALTER TABLE bounty_private.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('REVOKE ALL ON bounty_private.%I FROM PUBLIC,anon,authenticated',name);
    EXECUTE format('GRANT ALL ON bounty_private.%I TO service_role',name);
  END LOOP;
END $$;

DO $$ DECLARE entry text[]; args text; BEGIN
  FOREACH entry SLICE 1 IN ARRAY ARRAY[
    ['user_blocks','blocker_id,blocked_id'],['safety_budgets','user_id'],['user_reports','reporter_id,subject_id']
  ] LOOP
    SELECT string_agg(quote_literal(v),',') INTO args FROM unnest(string_to_array(entry[2],',')) v;
    EXECUTE format('DROP TRIGGER IF EXISTS account_deletion_guard ON bounty_private.%I',entry[1]);
    EXECUTE format('CREATE TRIGGER account_deletion_guard BEFORE INSERT OR UPDATE OR DELETE ON bounty_private.%I FOR EACH ROW EXECUTE FUNCTION bounty_private.guard_account_links(%s)',entry[1],args);
  END LOOP;
END $$;

-- Fresh snapshots after the shared account locks close the block/write race.
CREATE OR REPLACE FUNCTION bounty_private.pair_allowed(a uuid,b uuid)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
  SELECT a IS NULL OR b IS NULL OR a=b OR NOT EXISTS(
    SELECT 1 FROM bounty_private.user_blocks WHERE
      (blocker_id=a AND blocked_id=b) OR (blocker_id=b AND blocked_id=a))
$$;
CREATE OR REPLACE FUNCTION bounty_private.related_person(a uuid,b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT a=b OR EXISTS(SELECT 1 FROM public.friendships WHERE
      (user1_id=a AND user2_id=b) OR (user1_id=b AND user2_id=a))
    OR EXISTS(SELECT 1 FROM public.tasks WHERE (created_by=a AND assigned_to=b) OR (created_by=b AND assigned_to=a))
    OR EXISTS(SELECT 1 FROM public.rewards_store WHERE (creator_id=a AND assigned_to=b) OR (creator_id=b AND assigned_to=a))
    OR EXISTS(SELECT 1 FROM bounty_private.user_blocks WHERE
      (blocker_id=a AND blocked_id=b) OR (blocker_id=b AND blocked_id=a))
$$;
-- Authenticated callers can inspect only their own pair, never arbitrary pairs.
CREATE OR REPLACE FUNCTION bounty_private.visible_person(target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT bounty_private.related_person(auth.uid(),target)
$$;
REVOKE ALL ON FUNCTION bounty_private.pair_allowed(uuid,uuid),bounty_private.related_person(uuid,uuid),bounty_private.visible_person(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION bounty_private.visible_person(uuid) TO authenticated;

REVOKE SELECT ON public.profiles FROM PUBLIC,anon,authenticated;
DO $$ DECLARE col text; BEGIN
  FOR col IN SELECT attname FROM pg_attribute WHERE attrelid='public.profiles'::regclass AND attnum>0 AND NOT attisdropped LOOP
    EXECUTE format('REVOKE SELECT(%I) ON public.profiles FROM PUBLIC,anon,authenticated',col);
  END LOOP;
END $$;
-- These five client fields contain no email, role, legacy partner or timestamps.
GRANT SELECT(id,display_name,avatar_url,theme,onboarding_completed) ON public.profiles TO authenticated;
DO $$ DECLARE col text; BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.profiles'::regclass) THEN RAISE EXCEPTION '019: profile RLS is required'; END IF;
  FOR col IN SELECT attname FROM pg_attribute WHERE attrelid='public.profiles'::regclass AND attnum>0 AND NOT attisdropped LOOP
    IF has_column_privilege('anon','public.profiles',col,'SELECT') OR
      (col NOT IN ('id','display_name','avatar_url','theme','onboarding_completed') AND has_column_privilege('authenticated','public.profiles',col,'SELECT')) THEN
      RAISE EXCEPTION '019: inherited profile read privilege on %',col;
    END IF;
  END LOOP;
END $$;
DROP POLICY IF EXISTS profiles_authenticated_read ON public.profiles;
CREATE POLICY profiles_authenticated_read ON public.profiles FOR SELECT TO authenticated USING(true);
DROP POLICY IF EXISTS profiles_contact_visibility ON public.profiles;
CREATE POLICY profiles_contact_visibility ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING(bounty_private.visible_person(id));

CREATE OR REPLACE FUNCTION bounty_private.consume_safety_budget(p_kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE consumed integer; period interval; maximum integer;
BEGIN
  IF auth.uid() IS NULL OR NOT bounty_private.account_active(auth.uid()) THEN RAISE EXCEPTION 'not_permitted' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('account:'||auth.uid()::text,0));
  IF NOT bounty_private.account_active(auth.uid()) THEN RAISE EXCEPTION 'not_permitted' USING ERRCODE='42501'; END IF;
  IF p_kind='lookup' THEN period:=interval '1 minute'; maximum:=30;
  ELSIF p_kind='report' THEN period:=interval '1 day'; maximum:=5;
  ELSE RAISE EXCEPTION 'invalid_budget'; END IF;
  INSERT INTO bounty_private.safety_budgets(user_id,kind,started_at,used) VALUES(auth.uid(),p_kind,clock_timestamp(),1)
    ON CONFLICT(user_id,kind) DO UPDATE SET
      started_at=CASE WHEN safety_budgets.started_at<clock_timestamp()-period THEN clock_timestamp() ELSE safety_budgets.started_at END,
      used=CASE WHEN safety_budgets.started_at<clock_timestamp()-period THEN 1 ELSE safety_budgets.used+1 END
    RETURNING used INTO consumed;
  IF consumed>maximum THEN RAISE EXCEPTION 'rate_limited' USING ERRCODE='P0001'; END IF;
END $$;
REVOKE ALL ON FUNCTION bounty_private.consume_safety_budget(text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.lookup_contacts(p_query text)
RETURNS TABLE(id uuid,display_name text,avatar_url text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE term text:=btrim(p_query);
BEGIN
  IF term IS NULL OR char_length(term)<3 OR char_length(term)>64 THEN RAISE EXCEPTION 'invalid_query'; END IF;
  PERFORM bounty_private.consume_safety_budget('lookup');
  RETURN QUERY SELECT p.id,p.display_name,p.avatar_url FROM public.profiles p
    WHERE p.id<>auth.uid() AND bounty_private.account_active(p.id)
      -- Literal prefix: %, _ and backslash never become search wildcards.
      AND left(lower(p.display_name),char_length(term))=lower(term)
      AND bounty_private.pair_allowed(auth.uid(),p.id)
      AND NOT EXISTS(SELECT 1 FROM public.friendships f WHERE
        (f.user1_id=auth.uid() AND f.user2_id=p.id) OR (f.user2_id=auth.uid() AND f.user1_id=p.id))
    ORDER BY lower(p.display_name),p.id LIMIT 5;
END $$;

CREATE OR REPLACE FUNCTION public.set_person_block(p_person uuid,p_blocked boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target uuid;
BEGIN
  IF auth.uid() IS NULL OR p_person IS NULL OR p_person=auth.uid() OR p_blocked IS NULL THEN RAISE EXCEPTION 'not_permitted' USING ERRCODE='42501'; END IF;
  FOR target IN SELECT u FROM unnest(ARRAY[auth.uid(),p_person]) u ORDER BY u LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('account:'||target::text,0));
    IF NOT bounty_private.account_active(target) THEN RAISE EXCEPTION 'not_permitted' USING ERRCODE='42501'; END IF;
  END LOOP;
  IF NOT bounty_private.related_person(auth.uid(),p_person) THEN RAISE EXCEPTION 'not_permitted' USING ERRCODE='42501'; END IF;
  IF p_blocked THEN
    INSERT INTO bounty_private.user_blocks(blocker_id,blocked_id) VALUES(auth.uid(),p_person) ON CONFLICT DO NOTHING;
    DELETE FROM public.friendships WHERE (user1_id=auth.uid() AND user2_id=p_person) OR (user1_id=p_person AND user2_id=auth.uid());
  ELSE
    DELETE FROM bounty_private.user_blocks WHERE blocker_id=auth.uid() AND blocked_id=p_person;
  END IF;
  RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.list_blocked_people()
RETURNS TABLE(id uuid,display_name text,avatar_url text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p.id,p.display_name,p.avatar_url FROM bounty_private.user_blocks b JOIN public.profiles p ON p.id=b.blocked_id
    WHERE b.blocker_id=auth.uid() AND bounty_private.account_active(auth.uid()) ORDER BY b.created_at DESC
$$;
CREATE OR REPLACE FUNCTION public.report_person(p_person uuid,p_reason text,p_details text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE receipt uuid; target uuid;
BEGIN
  IF auth.uid() IS NULL OR p_person IS NULL OR p_person=auth.uid() OR p_reason IS NULL OR p_reason NOT IN ('harassment','unsafe_content','spam','other')
    OR p_details IS NULL OR char_length(p_details)>1000 THEN RAISE EXCEPTION 'invalid_report'; END IF;
  FOR target IN SELECT u FROM unnest(ARRAY[auth.uid(),p_person]) u ORDER BY u LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('account:'||target::text,0));
    IF NOT bounty_private.account_active(target) THEN RAISE EXCEPTION 'not_permitted' USING ERRCODE='42501'; END IF;
  END LOOP;
  IF NOT bounty_private.related_person(auth.uid(),p_person) THEN RAISE EXCEPTION 'not_permitted' USING ERRCODE='42501'; END IF;
  PERFORM bounty_private.consume_safety_budget('report');
  INSERT INTO bounty_private.user_reports(reporter_id,subject_id,reason,details) VALUES(auth.uid(),p_person,p_reason,btrim(p_details)) RETURNING id INTO receipt;
  RETURN receipt;
END $$;

-- Row visibility helpers are scoped to the JWT actor and cannot disclose a third-party block.
CREATE OR REPLACE FUNCTION bounty_private.content_visible(a uuid,b uuid)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
  SELECT auth.uid() IN (a,b) AND bounty_private.pair_allowed(a,b)
$$;
CREATE OR REPLACE FUNCTION bounty_private.reward_visible(reward uuid)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.rewards_store r WHERE r.id=reward AND bounty_private.content_visible(r.creator_id,r.assigned_to))
$$;
CREATE OR REPLACE FUNCTION bounty_private.proof_visible(bucket text,object_name text)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
  SELECT bucket<>'bounty-proofs' OR EXISTS(SELECT 1 FROM public.tasks t WHERE split_part(object_name,'/',1)='proofs'
    AND t.id::text=lower(split_part(object_name,'/',2)) AND bounty_private.content_visible(t.created_by,t.assigned_to))
$$;
REVOKE ALL ON FUNCTION bounty_private.content_visible(uuid,uuid),bounty_private.reward_visible(uuid),bounty_private.proof_visible(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION bounty_private.content_visible(uuid,uuid),bounty_private.reward_visible(uuid),bounty_private.proof_visible(text,text) TO authenticated;
DROP POLICY IF EXISTS unblocked_content ON public.tasks;
CREATE POLICY unblocked_content ON public.tasks AS RESTRICTIVE FOR SELECT TO authenticated USING(bounty_private.content_visible(created_by,assigned_to));
DROP POLICY IF EXISTS unblocked_content ON public.rewards_store;
CREATE POLICY unblocked_content ON public.rewards_store AS RESTRICTIVE FOR SELECT TO authenticated USING(bounty_private.content_visible(creator_id,assigned_to));
DROP POLICY IF EXISTS unblocked_content ON public.collected_rewards;
CREATE POLICY unblocked_content ON public.collected_rewards AS RESTRICTIVE FOR SELECT TO authenticated USING(bounty_private.reward_visible(reward_id));
DROP POLICY IF EXISTS unblocked_content ON storage.objects;
CREATE POLICY unblocked_content ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
  USING(bounty_private.proof_visible(bucket_id,name)) WITH CHECK(bounty_private.proof_visible(bucket_id,name));

CREATE OR REPLACE FUNCTION bounty_private.guard_blocked_interaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE row_data jsonb; ids uuid[]:=ARRAY[]::uuid[]; all_ids uuid[]:=ARRAY[]::uuid[];
  row_groups jsonb[]:=ARRAY[]::jsonb[]; a uuid; b uuid; col text; linked uuid;
BEGIN
  -- Deleting one's content/connection remains possible; account cleanup is service-only.
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF COALESCE(auth.jwt()->>'role','')='service_role' AND current_setting('bounty.account_cleanup',true)='allowed' THEN RETURN NEW; END IF;
  FOREACH row_data IN ARRAY ARRAY[CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END,to_jsonb(NEW)] LOOP
    FOREACH col IN ARRAY COALESCE(TG_ARGV,ARRAY[]::text[]) LOOP
      IF row_data->>col IS NOT NULL THEN ids:=array_append(ids,(row_data->>col)::uuid); END IF;
    END LOOP;
    IF TG_TABLE_NAME='collected_rewards' THEN
      linked:=(row_data->>'reward_id')::uuid;
      ids:=ids||ARRAY(SELECT u FROM public.rewards_store r,LATERAL unnest(ARRAY[r.creator_id,r.assigned_to]) u WHERE r.id=linked);
    ELSIF TG_TABLE_NAME IN ('credit_transactions','daily_mission_streaks') THEN
      linked:=COALESCE(row_data->>'task_id',row_data->>'contract_id')::uuid;
      ids:=ids||ARRAY(SELECT u FROM public.tasks t,LATERAL unnest(ARRAY[t.created_by,t.assigned_to]) u WHERE t.id=linked);
    ELSIF TG_TABLE_SCHEMA='storage' AND row_data->>'bucket_id'='bounty-proofs' THEN
      ids:=ids||ARRAY(SELECT u FROM public.tasks t,LATERAL unnest(ARRAY[t.created_by,t.assigned_to]) u
        WHERE split_part(row_data->>'name','/',1)='proofs' AND t.id::text=lower(split_part(row_data->>'name','/',2)));
    END IF;
    all_ids:=all_ids||ids;
    row_groups:=array_append(row_groups,to_jsonb(ids));
    ids:=ARRAY[]::uuid[];
  END LOOP;
  -- Lock the union, but validate OLD/NEW relationships separately. A reassigned
  -- mission never creates a relationship between the old and new recipients.
  FOR a IN SELECT DISTINCT u FROM unnest(all_ids) u WHERE u IS NOT NULL ORDER BY u LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('account:'||a::text,0));
  END LOOP;
  FOREACH row_data IN ARRAY row_groups LOOP
    SELECT array_agg(value::uuid) INTO ids FROM jsonb_array_elements_text(row_data);
    FOREACH a IN ARRAY COALESCE(ids,ARRAY[]::uuid[]) LOOP
      FOREACH b IN ARRAY ids LOOP
        IF NOT bounty_private.pair_allowed(a,b) THEN RAISE EXCEPTION 'interaction_unavailable' USING ERRCODE='42501'; END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION bounty_private.guard_blocked_interaction() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE entry text[]; args text; BEGIN
  FOREACH entry SLICE 1 IN ARRAY ARRAY[
    ['tasks','created_by,assigned_to'],['friendships','user1_id,user2_id,requested_by'],
    ['rewards_store','creator_id,assigned_to'],['collected_rewards','collector_id'],
    ['credit_transactions','user_id'],['daily_mission_streaks','user_id']
  ] LOOP
    SELECT string_agg(quote_literal(v),',') INTO args FROM unnest(string_to_array(entry[2],',')) v;
    EXECUTE format('DROP TRIGGER IF EXISTS blocked_interaction_guard ON public.%I',entry[1]);
    EXECUTE format('CREATE TRIGGER blocked_interaction_guard BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION bounty_private.guard_blocked_interaction(%s)',entry[1],args);
  END LOOP;
END $$;
DROP TRIGGER IF EXISTS blocked_interaction_guard ON storage.objects;
CREATE TRIGGER blocked_interaction_guard BEFORE INSERT OR UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION bounty_private.guard_blocked_interaction();

-- Service-only notification preflight. A provider send already in flight cannot be recalled.
CREATE OR REPLACE FUNCTION public.notification_pair_allowed(p_actor uuid,p_recipient uuid)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
  SELECT bounty_private.account_active(p_actor) AND bounty_private.account_active(p_recipient) AND bounty_private.pair_allowed(p_actor,p_recipient)
$$;
REVOKE ALL ON FUNCTION public.notification_pair_allowed(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.notification_pair_allowed(uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.lookup_contacts(text),public.set_person_block(uuid,boolean),public.list_blocked_people(),public.report_person(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lookup_contacts(text),public.set_person_block(uuid,boolean),public.list_blocked_people(),public.report_person(uuid,text,text) TO authenticated;

-- Extend 018's exact dependency inventory, preserving its other strict assertions.
-- Cascade erases reports involving a deleted account, rather than retaining hidden identities.
DO $inventory$ DECLARE definition text; anchor text:='WITH expected(child,name,definition) AS (VALUES'; extra text; BEGIN
  SELECT pg_get_functiondef('bounty_private.assert_deletion_schema()'::regprocedure) INTO definition;
  extra:=$fks$
      ('bounty_private.user_blocks','user_blocks_blocker_id_fkey','FOREIGN KEY (blocker_id) REFERENCES profiles(id) ON DELETE CASCADE'),
      ('bounty_private.user_blocks','user_blocks_blocked_id_fkey','FOREIGN KEY (blocked_id) REFERENCES profiles(id) ON DELETE CASCADE'),
      ('bounty_private.safety_budgets','safety_budgets_user_id_fkey','FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE'),
      ('bounty_private.user_reports','user_reports_reporter_id_fkey','FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE'),
      ('bounty_private.user_reports','user_reports_subject_id_fkey','FOREIGN KEY (subject_id) REFERENCES profiles(id) ON DELETE CASCADE'),$fks$;
  IF position('bounty_private.user_blocks' IN definition)=0 THEN
    IF position(anchor IN definition)=0 THEN RAISE EXCEPTION '019: deletion guard drift'; END IF;
    EXECUTE replace(definition,anchor,anchor||extra);
  END IF;
END $inventory$;
SELECT bounty_private.assert_deletion_schema();
NOTIFY pgrst,'reload schema';
COMMIT;
