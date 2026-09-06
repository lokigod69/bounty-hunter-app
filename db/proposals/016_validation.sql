-- Metadata only. This file is also executed INSIDE the apply transaction.
-- Assertions include inherited effective privileges, not just direct ACL entries.
DO $verify$
DECLARE role_name text; col record; target text;
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass) THEN
    RAISE EXCEPTION '016 verification: profiles RLS is off';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND cmd <> 'SELECT') THEN
    RAISE EXCEPTION '016 verification: a direct task write policy remains';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles') <> 3 THEN
    RAISE EXCEPTION '016 verification: unexpected profile policy count';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') <> 12 THEN
    RAISE EXCEPTION '016 verification: unexpected storage policy count';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_table_privilege(role_name, 'public.profiles', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR has_table_privilege(role_name, 'public.tasks', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
      RAISE EXCEPTION '016 verification: % retains an effective table-level write privilege', role_name;
    END IF;
    FOR col IN SELECT attname FROM pg_attribute WHERE attrelid = 'public.profiles'::regclass
      AND attnum > 0 AND NOT attisdropped LOOP
      IF (role_name = 'anon' OR col.attname NOT IN ('id', 'email', 'display_name', 'avatar_url', 'theme', 'onboarding_completed'))
        AND has_column_privilege(role_name, 'public.profiles', col.attname, 'INSERT,UPDATE,REFERENCES') THEN
        RAISE EXCEPTION '016 verification: % can write protected profile column %', role_name, col.attname;
      END IF;
    END LOOP;
    IF has_any_column_privilege(role_name, 'public.tasks', 'INSERT,UPDATE,REFERENCES') THEN
      RAISE EXCEPTION '016 verification: % can directly write task columns', role_name;
    END IF;
  END LOOP;
  IF has_any_column_privilege('anon', 'public.profiles', 'SELECT') THEN
    RAISE EXCEPTION '016 verification: anonymous profile reads remain';
  END IF;
  FOREACH target IN ARRAY ARRAY['tasks', 'user_credits', 'friendships'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('public.' || target)::regclass)
      OR NOT EXISTS (SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = target) THEN
      RAISE EXCEPTION '016 verification: % must have RLS and be published', target;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
    AND (schemaname <> 'public' OR tablename NOT IN ('tasks', 'user_credits', 'friendships'))) THEN
    RAISE EXCEPTION '016 verification: unexpected Realtime member requires review';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'bounty-proofs' AND public) THEN
    RAISE EXCEPTION '016 verification: proofs bucket is public';
  END IF;
  RAISE NOTICE '016 assertions passed';
END $verify$;

SELECT n.nspname AS schema_name, c.relname AS table_name, c.relrowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.oid IN ('public.profiles'::regclass, 'public.tasks'::regclass, 'storage.objects'::regclass);
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN ('profiles', 'tasks'))
   OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY schemaname, tablename, policyname;
SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY 1, 2;
