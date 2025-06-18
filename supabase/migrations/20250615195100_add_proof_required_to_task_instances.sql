-- supabase/migrations/20250615195100_add_proof_required_to_task_instances.sql
-- Adds the proof_required column to the recurring_task_instances table and sets its default value to TRUE.

ALTER TABLE public.recurring_task_instances
ADD COLUMN proof_required BOOLEAN DEFAULT TRUE;

-- It's also good practice to ensure the column is not null if it should always have a value,
-- but for now, defaulting to FALSE is fine, and it matches the template's nullable boolean.
-- If it should be NOT NULL, the command would be:
-- ADD COLUMN proof_required BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.recurring_task_instances.proof_required IS 'Indicates if proof is required for this specific task instance, copied from its template at creation.';
