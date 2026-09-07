BEGIN READ ONLY;
SELECT bounty_private.assert_deletion_schema();
DO $$ DECLARE relation text; signature text; BEGIN
  IF NOT EXISTS(SELECT 1 FROM bounty_private.push_settings WHERE singleton AND NOT enabled AND environment='production')
    THEN RAISE EXCEPTION '020: expected dormant production settings'; END IF;
  FOREACH relation IN ARRAY ARRAY['bounty_private.push_settings','bounty_private.push_devices','bounty_private.push_deliveries'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=relation::regclass)
      OR has_table_privilege('anon',relation,'SELECT,INSERT,UPDATE,DELETE')
      OR has_table_privilege('authenticated',relation,'SELECT,INSERT,UPDATE,DELETE')
      THEN RAISE EXCEPTION '020: private table privilege drift: %',relation; END IF;
  END LOOP;
  FOREACH signature IN ARRAY ARRAY['public.claim_push_deliveries()','public.prepare_push_delivery(uuid,uuid)','public.finish_push_delivery(uuid,uuid,text,timestamp with time zone)'] LOOP
    IF has_function_privilege('anon',signature,'EXECUTE') OR has_function_privilege('authenticated',signature,'EXECUTE')
      OR NOT has_function_privilege('service_role',signature,'EXECUTE')
      THEN RAISE EXCEPTION '020: dispatch privilege drift: %',signature; END IF;
  END LOOP;
  IF has_function_privilege('anon','public.register_push_device(uuid,text,text)','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.register_push_device(uuid,text,text)','EXECUTE')
    THEN RAISE EXCEPTION '020: registration privilege drift'; END IF;
  IF (SELECT count(*) FROM pg_trigger WHERE tgname='native_push_event' AND NOT tgisinternal
      AND tgrelid IN ('public.tasks'::regclass,'public.collected_rewards'::regclass,'public.friendships'::regclass))<>3
    THEN RAISE EXCEPTION '020: event triggers missing'; END IF;
END $$;
SELECT '020 dormant settings, privacy/execute grants, authoritative event triggers and complete deletion inventory verified' AS result;
COMMIT;
