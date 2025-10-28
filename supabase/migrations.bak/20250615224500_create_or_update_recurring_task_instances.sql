-- Migration to create/update the recurring_task_instances table
-- Ensures all necessary columns, including credit_value, are present.

BEGIN;

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.recurring_task_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid REFERENCES public.recurring_task_templates(id) ON DELETE CASCADE,
    assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Or CASCADE, depending on desired behavior
    status TEXT NOT NULL DEFAULT 'pending', -- e.g., pending, completed, missed, approved
    scheduled_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    proof_required BOOLEAN DEFAULT TRUE,
    proof_url TEXT, -- For S3 links or similar
    proof_description TEXT, -- For textual proof submitted
    credit_value INTEGER, -- This was the missing column
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add columns if they don't exist (idempotent operations)
-- This is useful if the table exists but is missing specific columns.
ALTER TABLE public.recurring_task_instances
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.recurring_task_templates(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS scheduled_date DATE NOT NULL,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS proof_required BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS proof_url TEXT,
ADD COLUMN IF NOT EXISTS proof_description TEXT,
ADD COLUMN IF NOT EXISTS credit_value INTEGER, -- Explicitly add if missing
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL;

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_recurring_task_instances_template_id ON public.recurring_task_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_recurring_task_instances_assigned_to ON public.recurring_task_instances(assigned_to);
CREATE INDEX IF NOT EXISTS idx_recurring_task_instances_scheduled_date ON public.recurring_task_instances(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_recurring_task_instances_status ON public.recurring_task_instances(status);

COMMIT;
