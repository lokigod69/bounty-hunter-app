-- Phase 2.6: persist mode/theme + onboarding-complete on the profile.
--
-- Until now theme (mode) and the onboarding-complete flag lived only in
-- localStorage (`bounty_theme`, `bounty_onboarding_completed`). Onboarding.tsx
-- already reads a `profile.theme` that nothing ever wrote. This migration adds
-- the two columns so the client can persist them per-user (and read them back
-- on a fresh device), falling back to localStorage/default when null.
--
-- SAFETY: purely additive. `theme` is nullable with no default (null = not yet
-- chosen → client keeps its localStorage/default behavior). `onboarding_completed`
-- defaults false, which is the correct value for any pre-existing row.
-- Users can already UPDATE their own profile row (policy "Users can update
-- their own profile"), so no new grant/policy is needed.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.theme IS
  'Persisted UI mode/theme id (e.g. guild|family|couple). Null = not yet chosen; client falls back to localStorage/default.';
COMMENT ON COLUMN public.profiles.onboarding_completed IS
  'Whether the user finished first-time onboarding. Mirrors the legacy localStorage bounty_onboarding_completed flag.';

COMMIT;
