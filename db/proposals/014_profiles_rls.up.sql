-- db/proposals/014_profiles_rls.up.sql
-- Turn on row-level security for public.profiles.
--
-- FOUND 2026-07-30 by inspecting the live database directly (first session with
-- DB access). `public.profiles` has FOUR RLS policies and RLS is switched OFF,
-- so all four are inert. Meanwhile `anon` and `authenticated` both hold
-- DELETE, INSERT, SELECT, TRUNCATE and UPDATE on the table.
--
-- The anon key is public by design: it ships inside the deployed JS bundle.
-- With RLS off, anyone who reads that key out of the bundle can UPDATE, DELETE
-- or TRUNCATE every row in profiles. Nothing in the app authorises that; the
-- policies to prevent it were written and never activated.
--
-- Compare the neighbours, which is what makes this look like an oversight
-- rather than a decision:
--   tasks         RLS ON  (3 policies)
--   friendships   RLS ON  (4 policies)
--   user_credits  RLS ON  (1 policy, and its write grants were revoked)
--   profiles      RLS OFF (4 policies)  <-- the odd one out
--
-- No migration in supabase/migrations ever enabled it. The table predates the
-- hardening pass and was missed.
--
-- WHY THIS IS SAFE — the existing policies already describe the intended rules,
-- and every app write path matches them:
--   SELECT  "Public profiles"                    public,        USING true
--   INSERT  "Users can insert their own profile" authenticated, WITH CHECK auth.uid() = id
--   UPDATE  "Update own profile"                 public,        USING auth.uid() = id
--   UPDATE  "Users can update their own profile" authenticated, USING + WITH CHECK auth.uid() = id
--   DELETE  (none)  -> denied to everyone once RLS is on. Intended: nothing in
--                      the client deletes a profile, and the wipe script runs
--                      as `postgres`, which bypasses RLS.
--
-- Verified against every profiles write in the client before proposing:
--   ThemeContext.tsx:42      update  .eq('id', user.id)          own row
--   AuthContext.tsx:242      update  .eq('id', user.id)          own row (setPartner)
--   ftxGate.ts:110           update  own row
--   profileBootstrap.ts:61   insert  id = the authenticated user
--   ProfileEditModal.tsx:160 upsert  own row - needs BOTH the INSERT and UPDATE
--                                    policies, and both exist for `authenticated`
-- No DELETE call site exists anywhere in src/.
--
-- Public readability is preserved deliberately: this is a friends app and the
-- SELECT policy is `USING (true)`. This proposal does not change who can READ
-- a profile. It only stops anonymous callers from WRITING one.

BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Deliberately NOT done here, so this stays a one-line reversible change:
--   * Revoking the surplus DELETE/TRUNCATE grants from anon/authenticated.
--     With RLS on they are unreachable, so this is defence in depth rather
--     than a fix, and it belongs in its own proposal.
--   * FORCE ROW LEVEL SECURITY. Not wanted: the table owner needs to bypass
--     RLS for maintenance and for the wipe script.
