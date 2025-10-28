-- supabase/migrations/YYYYMMDDHHMMSS_create_collected_bounties_table.sql
-- Creates the collected_bounties table for the Bounty Store feature.

CREATE TABLE public.collected_bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID NOT NULL REFERENCES public.bounties(id) ON DELETE RESTRICT, -- Prevent deleting a bounty if it's been collected by someone
  collector_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  collected_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  purchase_price INTEGER NOT NULL CHECK (purchase_price >= 0) -- Price at the time of collection
);

ALTER TABLE public.collected_bounties ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_collected_bounties_collector_id ON public.collected_bounties(collector_id);
CREATE INDEX idx_collected_bounties_bounty_id ON public.collected_bounties(bounty_id);

-- Policies for collected_bounties table
CREATE POLICY "Allow collector to read their own collected bounties" ON public.collected_bounties
  FOR SELECT TO authenticated USING (auth.uid() = collector_id);

-- No insert policy for users directly; this should be handled by an RPC function (purchase_bounty)
-- to ensure credit deduction and other logic is performed atomically.

-- No update or delete policies for users directly for now, to maintain collection integrity.

COMMENT ON TABLE public.collected_bounties IS 'Tracks which user has collected which bounty.';
COMMENT ON COLUMN public.collected_bounties.bounty_id IS 'The bounty that was collected.';
COMMENT ON COLUMN public.collected_bounties.collector_id IS 'The user who collected the bounty.';
COMMENT ON COLUMN public.collected_bounties.purchase_price IS 'The credit_cost of the bounty at the time of collection.';
