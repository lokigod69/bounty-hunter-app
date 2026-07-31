-- db/proposals/014_profiles_rls.down.sql
-- Rollback for 014: switch RLS on public.profiles back off.
--
-- Running this REOPENS the hole 014 closes: anon and authenticated hold
-- DELETE/INSERT/UPDATE/TRUNCATE on this table, and with RLS off the four
-- policies stop applying. Only run it if 014 demonstrably broke a real user
-- path, and treat that as a bug to fix forward rather than a state to stay in.
--
-- If a legitimate path IS blocked, the better rollback is almost always to add
-- the missing policy instead of disabling RLS wholesale.

BEGIN;

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

COMMIT;
