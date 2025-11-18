-- Migration: Add daily missions and streak tracking
-- P5: Recurring Daily Missions & Streaks

-- Add is_daily column to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS is_daily BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.tasks.is_daily IS 'Indicates if this mission is a daily recurring mission';

-- Create daily_mission_streaks table
CREATE TABLE IF NOT EXISTS public.daily_mission_streaks (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    streak_count INTEGER DEFAULT 0 NOT NULL,
    last_completion_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contract_id, user_id)
);

COMMENT ON TABLE public.daily_mission_streaks IS 'Tracks streak counts for daily missions per user';
COMMENT ON COLUMN public.daily_mission_streaks.streak_count IS 'Current streak count (number of consecutive days)';
COMMENT ON COLUMN public.daily_mission_streaks.last_completion_date IS 'Date (no time) of last completion, used to determine if streak continues';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_mission_streaks_contract_id ON public.daily_mission_streaks(contract_id);
CREATE INDEX IF NOT EXISTS idx_daily_mission_streaks_user_id ON public.daily_mission_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_mission_streaks_contract_user ON public.daily_mission_streaks(contract_id, user_id);

-- Enable RLS
ALTER TABLE public.daily_mission_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read streaks for contracts they're assigned to or created
CREATE POLICY "Users can read streaks for their contracts"
    ON public.daily_mission_streaks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = daily_mission_streaks.contract_id
            AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
        )
    );

-- RLS Policy: Users can insert/update streaks for contracts they're assigned to
CREATE POLICY "Users can update streaks for assigned contracts"
    ON public.daily_mission_streaks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = daily_mission_streaks.contract_id
            AND tasks.assigned_to = auth.uid()
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = daily_mission_streaks.contract_id
            AND tasks.assigned_to = auth.uid()
        )
    );

