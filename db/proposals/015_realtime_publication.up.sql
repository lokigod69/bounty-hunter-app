-- db/proposals/015_realtime_publication.up.sql
-- Publish the three tables the client subscribes to, so realtime actually fires.
--
-- CORRECTED 2026-08-03 before applying: the original draft listed
-- usePartnerState.ts as subscribing to `profiles` and published four tables.
-- The hook actually subscribes to `friendships` (usePartnerState.ts:149) and
-- derives the whole partner state machine from friendships rows — the profiles
-- read inside it is a plain fetch of the partner's display profile, not a
-- subscription. NO client subscribes to `profiles`, so it is not published.
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
--   src/hooks/usePartnerState.ts   friendships   couple-mode partner state (derived from friendships rows)
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
-- ORDERING: apply 014 (profiles RLS) FIRST anyway. Since the 2026-08-03
-- correction `profiles` is no longer published, so the hard dependency the
-- original draft described (publishing an RLS-off table broadcasts it to every
-- connected client) is gone — but 014 is the security fix and 015 is a
-- functionality fix, and Realtime applies each published table's RLS per
-- subscriber, so the discipline stays: never publish a table whose RLS is off.

BEGIN;

-- Idempotent: ALTER PUBLICATION ... ADD TABLE errors if the table is already a
-- member, so each is guarded. Re-running this file is a no-op.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tasks','user_credits','friendships'] LOOP
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
--   profiles - no client subscribes to it (the original draft said
--     usePartnerState did; it subscribes to friendships). If a profiles
--     subscription is ever added, publish it only with RLS on (proposal 014).
--   rewards_store, collected_rewards, credit_transactions,
--   daily_mission_streaks, invites - no client subscribes to them. Publishing a
--   table nobody listens to is WAL traffic and broadcast surface for nothing.
