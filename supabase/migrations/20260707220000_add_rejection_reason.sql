-- Migration: Add rejection_reason to tasks
-- Phase 2.3 (rejection loop): when a creator rejects a submitted proof we now
-- persist the task in the 'rejected' state (instead of silently resetting to
-- 'pending') and optionally store why it was rejected so the assignee can see
-- the feedback and resubmit.
--
-- SAFETY: This change is purely additive. It adds a single nullable TEXT column
-- with no default and no constraints, so it cannot break existing rows, reads,
-- or writes. No data is modified. The application code degrades gracefully if
-- this column is absent (it retries the status update without rejection_reason
-- on Postgres error 42703), so deploy order is not strict — but this migration
-- SHOULD be applied during/after the Supabase restore and BEFORE the assignee
-- can rely on seeing reasons.

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN public.tasks.rejection_reason IS 'Optional free-text reason a creator gave when rejecting a submitted proof (Phase 2.3 rejection loop). Cleared on resubmit.';
