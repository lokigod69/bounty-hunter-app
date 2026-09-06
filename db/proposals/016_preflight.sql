-- READ ONLY. Counts, metadata and ACLs; no profile names/emails or object paths.
BEGIN READ ONLY;
SELECT now() AS checked_at, current_database() AS database_name, version() AS postgres_version;
SELECT count(*) AS profile_email_mismatches FROM public.profiles p
LEFT JOIN auth.users u ON u.id=p.id WHERE p.email IS DISTINCT FROM u.email;
SELECT count(*) AS malformed_friendships FROM public.friendships
WHERE user1_id IS NULL OR user2_id IS NULL OR user1_id=user2_id
  OR requested_by IS NULL OR requested_by NOT IN (user1_id,user2_id)
  OR status IS NULL OR status NOT IN ('pending','accepted');
SELECT n.nspname, c.relname, c.relrowsecurity, c.relacl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE (n.nspname='public' AND c.relname IN ('profiles','tasks','friendships','user_credits'))
   OR (n.nspname='storage' AND c.relname='objects');
SELECT attrelid::regclass AS table_name, attname, attacl FROM pg_attribute
WHERE attrelid IN ('public.profiles'::regclass,'public.tasks'::regclass,'public.friendships'::regclass)
  AND attnum>0 AND NOT attisdropped ORDER BY 1,attnum;
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE (schemaname='public' AND tablename IN ('profiles','tasks','friendships'))
   OR (schemaname='storage' AND tablename='objects') ORDER BY 1,2,3;
SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets;
SELECT pubname,puballtables FROM pg_publication WHERE pubname='supabase_realtime';
SELECT schemaname,tablename FROM pg_publication_tables WHERE pubname='supabase_realtime';
COMMIT;
