-- db/proposals/015_realtime_publication.up.sql
-- Publish the four tables the client subscribes to, so realtime actually fires.
--
-- FOUND 2026-07-30 by inspecting the live database. The `supabase_realtime`
-- publication exists, has `puballtables = false`, and contains ZERO tables.
-- Postgres therefore emits no change events for anything, and every
-- `postgres_changes` subscription in the client is silently inert:
--
--   src/hooks/useTasksRealtime.ts  tasks         shared refetch for assigned/issued/action counts
--   src/hooks/useTasks.ts          tasks         second, older subscription
--   src/components/UserCredits.tsx user_credits  live balance in the header
--   src/hooks/useFriends.ts        friendships   the nav badge
--   src/hooks/usePartnerState.ts   profiles      couple-mode partner state
--
-- They connect, subscribe and receive nothing. No error is raised, which is why
-- this survived: the symptom is "the other browser didn't update", which reads
-- as a caching or refetch bug. This is the real answer to the long-parked
-- open question "is friendships in the realtime publication" - nothing is.
--
-- This is almost certainly fallout from the 2026-07-08 project migration. The
-- old project's dashboard-side realtime config did not transfer, exactly like
-- the auth Site URL and the edge functions did not.
--
-- ORDERING: apply 014 (profiles RLS) FIRST. Realtime applies RLS per subscriber
-- when deciding who may receive a row, so publishing `profiles` while its RLS is
-- off would broadcast profile changes to every connected client. With 014 in
-- place the SELECT policy governs, and it is `USING (true)` - profiles are
-- public by design in this app, so that is the intended visibility.

BEGIN;

-- Idempotent: ALTER PUBLICATION ... ADD TABLE errors if the table is already a
-- member, so each is guarded. Re-running this file is a no-op.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tasks','user_credits','friendships','profiles'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      RAISE NOTICE 'added public.% to supabase_realtime', t;
    ELSE
      RAISE NOTICE 'public.% already published, skipping', t;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- REPLICA IDENTITY is deliberately left at DEFAULT (primary key only).
--
-- REPLICA IDENTITY FULL would put the whole OLD row in the payload, which
-- Supabase needs if you filter on old values or want old_record on UPDATE and
-- DELETE. None of the five subscriptions above read `old_record` - every one of
-- them ignores the payload and triggers a refetch. FULL also writes every column
-- of every row into the WAL on each update, so it is a real write-amplification
-- cost for a payload nobody reads. Revisit only if a subscription starts needing
-- the previous values.
--
-- NOT added, on purpose:
--   rewards_store, collected_rewards, credit_transactions,
--   daily_mission_streaks, invites - no client subscribes to them. Publishing a
--   table nobody listens to is WAL traffic and broadcast surface for nothing.
