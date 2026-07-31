-- db/proposals/014_validation.sql
-- Read-only. Run BEFORE and AFTER apply_sql.ps1 -Sql db\proposals\014_profiles_rls.up.sql

\echo '#1 RLS state across the app tables. profiles should be the only f BEFORE, and t AFTER.'
SELECT c.relname,
       c.relrowsecurity AS rls_enabled,
       count(pol.polname) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy pol ON pol.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('profiles','tasks','friendships','user_credits',
                    'rewards_store','collected_rewards','credit_transactions',
                    'daily_mission_streaks','invites')
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relrowsecurity, c.relname;

\echo ''
\echo '#2 The four profiles policies. Unchanged by this proposal - recorded so "we changed nothing else" is checkable.'
SELECT policyname, cmd, roles::text,
       coalesce(qual, '-')       AS using_expr,
       coalesce(with_check, '-') AS with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY cmd, policyname;

\echo ''
\echo '#3 Grants on profiles. NOT changed by 014 - after the apply these are simply unreachable for anon.'
\echo '   If a later proposal revokes the surplus DELETE/TRUNCATE, this is the before-picture.'
SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND grantee IN ('anon','authenticated')
GROUP BY grantee
ORDER BY grantee;

\echo ''
\echo '#4 Row count, so the apply can be shown not to have touched data.'
SELECT count(*) AS profiles_rows FROM public.profiles;

\echo ''
\echo '#5 Is there a DELETE policy? Expect zero rows. With RLS on that means profile deletion'
\echo '   is denied to anon and authenticated, which is the intent - the wipe runs as postgres.'
SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'DELETE';
