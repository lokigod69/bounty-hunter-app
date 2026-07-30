-- db/maintenance/wipe_all_including_accounts.sql
-- SCOPE B: everything in scope A, PLUS profiles and auth accounts.
--
-- Read this before running it. After this, the project has zero users. Every
-- person who wants back in must sign up again, which means receiving and
-- clicking a confirmation email — and that depends on Supabase dashboard auth
-- config (Site URL, redirect allow-list, email templates) which is NOT in this
-- repo and which has already been misconfigured once on this project
-- (2026-07-11: Site URL was still localhost:3000). If that config is wrong,
-- nobody can get back in and there is no undo from the app side.
--
-- Prefer wipe_test_data.sql unless you specifically want to re-test signup.
--
-- SAFETY
--   * Single transaction; any error rolls everything back.
--   * A DATA backup is mandatory and the runner script enforces it. Note that
--     restoring a public-schema data dump will NOT restore auth.users, so the
--     accounts are gone for good — only the app rows could be brought back,
--     and they would have no owners.

BEGIN;

SELECT 'BEFORE' AS phase, 'profiles' AS tbl, count(*) FROM public.profiles
UNION ALL SELECT 'BEFORE', 'auth.users', count(*) FROM auth.users;

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

-- profiles.partner_user_id references profiles with ON DELETE SET NULL, so the
-- self-reference does not block the delete; clearing it first keeps the delete
-- order from mattering.
UPDATE public.profiles SET partner_user_id = NULL WHERE partner_user_id IS NOT NULL;

-- profiles.id -> auth.users(id) has NO on-delete action, so profiles must go
-- first or the auth delete fails on the constraint.
DELETE FROM public.profiles;

-- Cascades through auth.sessions, identities, refresh_tokens, mfa_*, oauth_*,
-- one_time_tokens and webauthn_* — every one of those FKs is ON DELETE CASCADE.
DELETE FROM auth.users;

SELECT 'AFTER' AS phase, 'profiles' AS tbl, count(*) FROM public.profiles
UNION ALL SELECT 'AFTER', 'auth.users', count(*) FROM auth.users;

COMMIT;
