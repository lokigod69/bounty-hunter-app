-- Proposal 011 DOWN: remove the task lifecycle RPCs and restore the broad
-- UPDATE policies (as captured in supabase/schema.sql:796 and :824).
-- NOTE: does NOT recreate the legacy award_credits_on_completion trigger —
-- that trigger is a double-credit hazard and must stay gone (see proposal .md).
-- NOTE: also does NOT narrow tasks_proof_type_check back to ('image','video') —
-- the old frontend already writes 'document' and 'text', so the widened
-- constraint is correct for it too (narrowing would break rollback).

BEGIN;

DROP FUNCTION IF EXISTS public.submit_proof(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.reject_task(uuid, text);
DROP FUNCTION IF EXISTS public.set_task_status(uuid, text);
DROP FUNCTION IF EXISTS public.archive_task(uuid);
DROP FUNCTION IF EXISTS public.delete_task(uuid);

-- Restore the pre-011 client-write policies so the old frontend works again.
CREATE POLICY "Update tasks" ON public.tasks
  FOR UPDATE
  USING ((auth.uid() = created_by) OR (auth.uid() = assigned_to));

CREATE POLICY "Users can update assigned tasks" ON public.tasks
  FOR UPDATE
  USING (auth.uid() = assigned_to);

COMMIT;
