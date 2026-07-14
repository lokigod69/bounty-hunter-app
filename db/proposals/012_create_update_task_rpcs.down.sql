-- Proposal 012 rollback: drop the two RPCs and recreate the three client
-- write policies exactly as they exist pre-apply (schema.sql snapshot names
-- and expressions). An old frontend build (direct insert/update/delete) is
-- fully functional again after this runs.

BEGIN;

DROP FUNCTION IF EXISTS public.create_task(text, text, uuid, date, text, text, boolean, boolean);
DROP FUNCTION IF EXISTS public.update_task(uuid, jsonb);

-- Recreate the policies dropped by the up (schema.sql:754 / :831 / :810).
CREATE POLICY "Create tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own created tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

COMMIT;
