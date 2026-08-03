-- db/proposals/015_validation.sql
-- Read-only. Run BEFORE and AFTER apply_sql.ps1 -Sql db\proposals\015_realtime_publication.up.sql
-- Corrected 2026-08-03: profiles is NOT published (no client subscribes to it —
-- usePartnerState subscribes to friendships, not profiles as the first draft said).

\echo '#1 Publications. puballtables must stay false - we are publishing named tables, not everything.'
SELECT pubname, puballtables, pubinsert, pubupdate, pubdelete
FROM pg_publication
ORDER BY pubname;

\echo ''
\echo '#2 Tables in supabase_realtime. BEFORE: zero rows. AFTER: friendships, tasks, user_credits.'
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;

\echo ''
\echo '#3 The three target tables must all have RLS ON before they are published.'
\echo '   Realtime applies RLS per subscriber; publishing an unprotected table broadcasts it.'
\echo '   All three should already be t. (profiles is not published, but run 014 first anyway.)'
SELECT c.relname, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('tasks','user_credits','friendships')
ORDER BY c.relrowsecurity, c.relname;

\echo ''
\echo '#4 Replica identity. Expect d (default/primary key) for all three - see the note in the up.sql'
\echo '   for why FULL is deliberately not used.'
SELECT c.relname, c.relreplident
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('tasks','user_credits','friendships')
ORDER BY c.relname;

\echo ''
\echo '#5 Anything published that no client subscribes to? Expect zero rows.'
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename NOT IN ('tasks','user_credits','friendships');
