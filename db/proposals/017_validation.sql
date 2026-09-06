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
SELECT policyname, cmd, roles, qual, with_check FROM pg_policies
WHERE schemaname='public' AND tablename='friendships' ORDER BY policyname;
SELECT p.proname, p.prosecdef, p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('create_task','update_task','redeem_invite','purchase_reward') ORDER BY p.proname;
