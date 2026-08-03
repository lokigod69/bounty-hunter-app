-- db/proposals/015_realtime_publication.down.sql
-- Rollback for 015: remove the three tables from supabase_realtime.
-- (Corrected 2026-08-03 alongside the up.sql: profiles was never published.)
--
-- This returns the database to the state found on 2026-07-30 - every
-- postgres_changes subscription in the client connected and receiving nothing.
-- Nothing in the app ERRORS in that state, it just stops updating live, so if
-- you run this be aware the failure mode is silent.

BEGIN;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tasks','user_credits','friendships'] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
      RAISE NOTICE 'removed public.% from supabase_realtime', t;
    END IF;
  END LOOP;
END $$;

COMMIT;
