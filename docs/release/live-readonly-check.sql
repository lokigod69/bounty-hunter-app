-- Metadata only. No application records, tokens or function bodies are exported.
BEGIN READ ONLY;
SELECT json_build_object(
  'checked_at', now(),
  'tables', (SELECT json_agg(x) FROM (
    SELECT n.nspname AS schema, c.relname AS name, c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls
    FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname IN ('public', 'storage') AND c.relkind = 'r'
    ORDER BY n.nspname, c.relname
  ) x),
  'policies', (SELECT json_agg(x) FROM (
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies WHERE schemaname IN ('public', 'storage') ORDER BY schemaname, tablename, policyname
  ) x),
  'profile_grants', (SELECT json_agg(x) FROM (
    SELECT grantee, privilege_type FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'profiles' AND grantee IN ('anon','authenticated')
  ) x),
  'profile_column_grants', (SELECT json_agg(x) FROM (
    SELECT grantee, column_name, privilege_type FROM information_schema.column_privileges
    WHERE table_schema = 'public' AND table_name = 'profiles' AND grantee IN ('anon','authenticated')
  ) x),
  'profile_triggers', (SELECT json_agg(x) FROM (
    SELECT t.tgname, p.proname FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'public.profiles'::regclass AND NOT t.tgisinternal
  ) x),
  'publication', (SELECT json_agg(x) FROM (
    SELECT pubname, schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
  ) x),
  'buckets', (SELECT json_agg(x) FROM (SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets ORDER BY id) x),
  'foreign_keys', (SELECT json_agg(x) FROM (
    SELECT conrelid::regclass::text AS child, conname, confrelid::regclass::text AS parent,
      pg_get_constraintdef(oid) AS definition
    FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace
    ORDER BY conrelid::regclass::text, conname
  ) x)
) AS snapshot;
COMMIT;
