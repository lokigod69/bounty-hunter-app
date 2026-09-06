-- Read-only metadata assertions after 019. Run with the reviewed database owner.
BEGIN READ ONLY;
SELECT bounty_private.assert_deletion_schema();
DO $$ DECLARE name text; role_name text; col text; signature text; BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.profiles'::regclass) THEN RAISE EXCEPTION 'profiles RLS missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.profiles'::regclass AND polname='profiles_contact_visibility' AND NOT polpermissive AND polcmd='r') THEN RAISE EXCEPTION 'profile visibility guard missing'; END IF;
  FOREACH name IN ARRAY ARRAY['public.tasks','public.rewards_store','public.collected_rewards','storage.objects'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=name::regclass AND polname='unblocked_content' AND NOT polpermissive AND polcmd IN ('r','*')) THEN RAISE EXCEPTION 'content visibility guard missing: %',name; END IF;
  END LOOP;
  FOR col IN SELECT attname FROM pg_attribute WHERE attrelid='public.profiles'::regclass AND attnum>0 AND NOT attisdropped LOOP
    IF has_column_privilege('anon','public.profiles',col,'SELECT') OR
      (col NOT IN ('id','display_name','avatar_url','theme','onboarding_completed') AND has_column_privilege('authenticated','public.profiles',col,'SELECT')) THEN RAISE EXCEPTION 'private profile column readable: %',col; END IF;
  END LOOP;
  FOREACH name IN ARRAY ARRAY['user_blocks','user_reports','safety_budgets'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('bounty_private.'||name)::regclass)
      OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=('bounty_private.'||name)::regclass AND tgname='account_deletion_guard' AND tgenabled='O') THEN RAISE EXCEPTION 'safety table guard missing: %',name; END IF;
    FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_table_privilege(role_name,'bounty_private.'||name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') THEN RAISE EXCEPTION 'private safety table accessible: %',name; END IF;
    END LOOP;
  END LOOP;
  FOREACH name IN ARRAY ARRAY['tasks','friendships','rewards_store','collected_rewards','credit_transactions','daily_mission_streaks'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=('public.'||name)::regclass AND tgname='blocked_interaction_guard' AND tgenabled='O') THEN RAISE EXCEPTION 'interaction guard missing: %',name; END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='storage.objects'::regclass AND tgname='blocked_interaction_guard' AND tgenabled='O') THEN RAISE EXCEPTION 'Storage interaction guard missing'; END IF;
  FOREACH signature IN ARRAY ARRAY['public.lookup_contacts(text)','public.set_person_block(uuid,boolean)','public.list_blocked_people()','public.report_person(uuid,text,text)'] LOOP
    IF has_function_privilege('anon',signature,'EXECUTE') OR NOT has_function_privilege('authenticated',signature,'EXECUTE') THEN RAISE EXCEPTION 'safety RPC ACL mismatch: %',signature; END IF;
  END LOOP;
  IF has_function_privilege('authenticated','public.notification_pair_allowed(uuid,uuid)','EXECUTE') OR has_function_privilege('anon','public.notification_pair_allowed(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'notification preflight is not private'; END IF;
END $$;
COMMIT;
