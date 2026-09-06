-- READ ONLY. Run after 016 -> 017 -> 018. No account mutations or file deletion.
DO $validation$
DECLARE target text; signature text;
BEGIN
  PERFORM bounty_private.assert_deletion_schema();
  IF EXISTS(SELECT 1 FROM pg_proc WHERE oid='bounty_private.account_active(uuid)'::regprocedure AND provolatile<>'v') THEN
    RAISE EXCEPTION '018: snapshot guard must be VOLATILE';
  END IF;
  IF has_table_privilege('authenticated','bounty_private.account_deletions','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
    OR has_table_privilege('anon','bounty_private.account_deletions','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') THEN
    RAISE EXCEPTION '018: private marker exposed';
  END IF;
  FOREACH signature IN ARRAY ARRAY['public.begin_account_deletion(uuid,uuid,uuid)','public.account_deletion_files(uuid,uuid)',
      'public.cleanup_account_data(uuid,uuid)','public.complete_account_deletion(uuid,uuid)','public.account_deletion_receipt(uuid,uuid)'] LOOP
    IF has_function_privilege('authenticated',signature,'EXECUTE') OR has_function_privilege('anon',signature,'EXECUTE')
      OR NOT has_function_privilege('service_role',signature,'EXECUTE') THEN RAISE EXCEPTION '018: wrong service RPC ACL: %',signature; END IF;
  END LOOP;
  FOREACH target IN ARRAY ARRAY['public.profiles','public.tasks','public.friendships','public.invites','public.rewards_store',
      'public.collected_rewards','public.credit_transactions','public.daily_mission_streaks','public.user_credits','storage.objects'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=target::regclass AND tgname='account_deletion_guard'
        AND NOT tgisinternal AND tgenabled='O' AND tgfoid='bounty_private.guard_account_links()'::regprocedure)
      OR NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=target::regclass AND polname='account_active_actor' AND NOT polpermissive)
      OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid=target::regclass) THEN
      RAISE EXCEPTION '018: missing guard/RLS: %',target;
    END IF;
  END LOOP;
END $validation$;
