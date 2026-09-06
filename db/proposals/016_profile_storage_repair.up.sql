-- Proposal only. Apply AFTER the paired client release removes role from bootstrap.
-- Backup + Michael's explicit review/go required: docs/runbooks/PROD_RUNBOOK_016.md.
-- Confirmed baseline: docs/release/live-safety-snapshot.json, 2026-09-07 local time.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Do not quietly leave an unfamiliar permissive policy OR'ed with the repairs.
-- Known canonical names may be recreated below; unknown drift requires review.
DO $preconditions$
DECLARE unexpected text;
BEGIN
  SELECT string_agg(policyname, ', ') INTO unexpected FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles'
    AND policyname NOT IN ('Public profiles', 'Update own profile',
      'Users can insert their own profile', 'Users can update their own profile',
      'profiles_authenticated_read', 'profiles_self_insert', 'profiles_self_update');
  IF unexpected IS NOT NULL THEN RAISE EXCEPTION '016: unexpected profile policies: %', unexpected; END IF;
  SELECT string_agg(policyname, ', ') INTO unexpected FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'tasks'
    AND policyname NOT IN ('Admins full access', 'Users can view assigned tasks', 'View tasks');
  IF unexpected IS NOT NULL THEN RAISE EXCEPTION '016: unexpected task policies: %', unexpected; END IF;
  SELECT string_agg(policyname, ', ') INTO unexpected FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname NOT IN (
      'Allow authenticated uploads rp0r5_0', 'Allow public viewing rp0r5_0',
      'Public Read Access 1oj01fe_0', 'User Update 1oj01fe_0', 'User Upload 1oj01fe_0',
      'auth delete reward images', 'auth insert reward images', 'auth update reward images',
      'public read reward images', 'avatars are public', 'avatar owner can upload',
      'avatar owner can update', 'avatar owner can delete', 'reward images are public',
      'reward image creator can upload', 'reward image creator can update', 'reward image creator can delete',
      'bounty proofs participants can read', 'bounty proofs assignee can upload',
      'bounty proofs assignee can update', 'bounty proofs participants can delete');
  IF unexpected IS NOT NULL THEN RAISE EXCEPTION '016: unexpected storage policies: %', unexpected; END IF;
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'bounty-proofs' AND public)
    OR NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'bounty-proofs') THEN
    RAISE EXCEPTION '016: bounty-proofs must exist and be private; review bucket drift first';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('anon', 'authenticated') AND (rolsuper OR rolbypassrls)) THEN
    RAISE EXCEPTION '016: client roles unexpectedly bypass RLS';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'storage.objects'::regclass) THEN
    RAISE EXCEPTION '016: storage.objects RLS unexpectedly disabled; review drift first';
  END IF;
END $preconditions$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS profiles_authenticated_read ON public.profiles;
DROP POLICY IF EXISTS profiles_self_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
-- Email search currently needs authenticated profile reads. Anonymous browsing
-- needs none. A separate contact-lookup RPC is needed before narrowing auth reads.
CREATE POLICY profiles_authenticated_read ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_self_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND email = (auth.jwt()->>'email'));
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND email = (auth.jwt()->>'email'));
-- Email is an identity used by contact lookup, not a freely editable profile label.
-- The verified access-token claim prevents spoofing another user's email address.

-- RLS alone does NOT protect TRUNCATE, nor does self-row RLS protect the role column.
-- Revoke table and explicit column ACLs, then restore only the current client contract.
REVOKE ALL PRIVILEGES ON public.profiles FROM PUBLIC, anon, authenticated;
DO $column_acl$
DECLARE col record;
BEGIN
  FOR col IN SELECT attname FROM pg_attribute WHERE attrelid = 'public.profiles'::regclass
    AND attnum > 0 AND NOT attisdropped LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES (%I) ON public.profiles FROM PUBLIC, anon, authenticated', col.attname);
  END LOOP;
END $column_acl$;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (id, email, display_name, avatar_url, theme, onboarding_completed),
      UPDATE (id, email, display_name, avatar_url, theme, onboarding_completed)
  ON public.profiles TO authenticated;
-- UPDATE(id) is needed by PostgREST upsert. WITH CHECK keeps it equal to auth.uid().
-- role, created_at, partner_user_id are not client-writable. Existing values remain.

DROP POLICY IF EXISTS "Admins full access" ON public.tasks;
-- Tasks already use owner-authorized SECURITY DEFINER RPCs (011-013).
-- Removing writes is defense in depth against an accidentally reintroduced policy.
REVOKE ALL PRIVILEGES ON public.tasks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tasks TO authenticated;

-- Supabase combines permissive policies with OR. These legacy rules bypassed
-- participant proof access and creator-only reward writes despite the narrow rules.
DROP POLICY IF EXISTS "Allow authenticated uploads rp0r5_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing rp0r5_0" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "User Update 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "User Upload 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "auth delete reward images" ON storage.objects;
DROP POLICY IF EXISTS "auth insert reward images" ON storage.objects;
DROP POLICY IF EXISTS "auth update reward images" ON storage.objects;
DROP POLICY IF EXISTS "public read reward images" ON storage.objects;

-- Canonical policies are appended below, explicitly recreated to avoid stale definitions.
drop policy if exists "bounty proofs participants can read" on storage.objects;
drop policy if exists "bounty proofs assignee can upload" on storage.objects;
drop policy if exists "bounty proofs assignee can update" on storage.objects;
drop policy if exists "bounty proofs participants can delete" on storage.objects;

create policy "bounty proofs participants can read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bounty-proofs'
  and (storage.foldername(name))[1] = 'proofs'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.tasks
    where tasks.id = CASE WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ((storage.foldername(name))[2])::uuid END
      and (
        tasks.assigned_to = auth.uid()
        or tasks.created_by = auth.uid()
      )
  )
);

create policy "bounty proofs assignee can upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bounty-proofs'
  and (storage.foldername(name))[1] = 'proofs'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.tasks
    where tasks.id = CASE WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ((storage.foldername(name))[2])::uuid END
      and tasks.assigned_to = auth.uid()
  )
);

create policy "bounty proofs assignee can update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'bounty-proofs'
  and (storage.foldername(name))[1] = 'proofs'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.tasks
    where tasks.id = CASE WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ((storage.foldername(name))[2])::uuid END
      and tasks.assigned_to = auth.uid()
  )
)
with check (
  bucket_id = 'bounty-proofs'
  and (storage.foldername(name))[1] = 'proofs'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.tasks
    where tasks.id = CASE WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ((storage.foldername(name))[2])::uuid END
      and tasks.assigned_to = auth.uid()
  )
);

create policy "bounty proofs participants can delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'bounty-proofs'
  and (storage.foldername(name))[1] = 'proofs'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.tasks
    where tasks.id = CASE WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ((storage.foldername(name))[2])::uuid END
      and (
        tasks.assigned_to = auth.uid()
        or tasks.created_by = auth.uid()
      )
  )
);

drop policy if exists "reward images are public" on storage.objects;
drop policy if exists "reward image creator can upload" on storage.objects;
drop policy if exists "reward image creator can update" on storage.objects;
drop policy if exists "reward image creator can delete" on storage.objects;

create policy "reward images are public"
on storage.objects
for select
to public
using (bucket_id = 'reward-images');

create policy "reward image creator can upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'reward-images'
  and (storage.foldername(name))[1] = 'rewards'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "reward image creator can update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'reward-images'
  and (storage.foldername(name))[1] = 'rewards'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'reward-images'
  and (storage.foldername(name))[1] = 'rewards'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "reward image creator can delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'reward-images'
  and (storage.foldername(name))[1] = 'rewards'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "avatars are public" on storage.objects;
drop policy if exists "avatar owner can upload" on storage.objects;
drop policy if exists "avatar owner can update" on storage.objects;
drop policy if exists "avatar owner can delete" on storage.objects;

create policy "avatars are public"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy "avatar owner can upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatar owner can update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatar owner can delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Merge the reviewed intent of 015 into the same guarded release. No profile feed.
DO $realtime$
DECLARE target text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime' AND NOT puballtables) THEN
    RAISE EXCEPTION '016: expected explicit supabase_realtime publication is missing or FOR ALL TABLES';
  END IF;
  FOREACH target IN ARRAY ARRAY['tasks', 'user_credits', 'friendships'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('public.' || target)::regclass) THEN
      RAISE EXCEPTION '016: refusing to publish % with RLS off', target;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = target) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', target);
    END IF;
  END LOOP;
END $realtime$;

-- Inline assertions follow so dashboard/CLI execution is equally atomic.
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


NOTIFY pgrst, 'reload schema';
COMMIT;
