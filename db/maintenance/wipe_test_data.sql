-- db/maintenance/wipe_test_data.sql
-- SCOPE A (recommended): clear all APP data, keep accounts and profiles.
--
-- After this runs, everyone who has signed up is still signed up and keeps
-- their display name, avatar, theme and language. What disappears is every
-- contract, reward, credit balance, friendship, invite link and streak — the
-- app looks exactly as it does to a brand-new pair of users, without anyone
-- having to re-register or re-confirm an email.
--
-- For the harder version that also removes accounts, see
-- wipe_all_including_accounts.sql. Prefer this one: re-registering means
-- re-confirming email, which depends on dashboard auth config that has bitten
-- this project before.
--
-- SAFETY
--   * Single transaction. Any error rolls the whole thing back.
--   * TRUNCATE, not DELETE: no triggers, no per-row RLS surprises, and the set
--     below is FK-closed — every table that references another table in the
--     list is itself in the list, so no CASCADE is needed and nothing outside
--     the list can be reached. That is deliberate: `TRUNCATE ... CASCADE` would
--     silently follow foreign keys into tables nobody listed.
--   * Requires a DATA backup first (schema_backup_*.sql is --schema-only and
--     would NOT bring any of this back). scripts\prod\wipe_test_data.ps1
--     refuses to run without one.

BEGIN;

-- Row counts before, so the runbook has a before/after record.
SELECT 'BEFORE' AS phase, 'tasks' AS tbl, count(*) FROM public.tasks
UNION ALL SELECT 'BEFORE', 'rewards_store',        count(*) FROM public.rewards_store
UNION ALL SELECT 'BEFORE', 'collected_rewards',    count(*) FROM public.collected_rewards
UNION ALL SELECT 'BEFORE', 'user_credits',         count(*) FROM public.user_credits
UNION ALL SELECT 'BEFORE', 'credit_transactions',  count(*) FROM public.credit_transactions
UNION ALL SELECT 'BEFORE', 'daily_mission_streaks',count(*) FROM public.daily_mission_streaks
UNION ALL SELECT 'BEFORE', 'friendships',          count(*) FROM public.friendships
UNION ALL SELECT 'BEFORE', 'invites',              count(*) FROM public.invites
UNION ALL SELECT 'BEFORE', 'profiles (KEPT)',      count(*) FROM public.profiles;

-- One statement so Postgres can check the FK closure as a set.
TRUNCATE TABLE
  public.collected_rewards,
  public.credit_transactions,
  public.daily_mission_streaks,
  public.tasks,
  public.rewards_store,
  public.user_credits,
  public.friendships,
  public.invites
RESTART IDENTITY;

-- Partner links are test data too, and they point at profiles rather than at
-- anything truncated above, so they survive unless cleared explicitly. A stale
-- partner_user_id would leave couple mode wired to a relationship that no
-- longer has a single shared object behind it.
UPDATE public.profiles SET partner_user_id = NULL WHERE partner_user_id IS NOT NULL;

SELECT 'AFTER' AS phase, 'tasks' AS tbl, count(*) FROM public.tasks
UNION ALL SELECT 'AFTER', 'rewards_store',        count(*) FROM public.rewards_store
UNION ALL SELECT 'AFTER', 'collected_rewards',    count(*) FROM public.collected_rewards
UNION ALL SELECT 'AFTER', 'user_credits',         count(*) FROM public.user_credits
UNION ALL SELECT 'AFTER', 'credit_transactions',  count(*) FROM public.credit_transactions
UNION ALL SELECT 'AFTER', 'daily_mission_streaks',count(*) FROM public.daily_mission_streaks
UNION ALL SELECT 'AFTER', 'friendships',          count(*) FROM public.friendships
UNION ALL SELECT 'AFTER', 'invites',              count(*) FROM public.invites
UNION ALL SELECT 'AFTER', 'profiles (KEPT)',      count(*) FROM public.profiles;

COMMIT;

-- NOT covered by this file, on purpose — see the runbook:
--   * Storage objects (bounty-proofs, reward images). Their DB rows live in the
--     storage schema and the bytes live in S3; deleting rows here would orphan
--     the bytes. Empty the buckets from the dashboard or the CLI instead.
--   * auth.users. Kept so nobody has to sign up again.
