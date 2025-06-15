-- supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql
-- Creates the bounties table for the Bounty Store feature.

CREATE TABLE public.bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT, -- For the 'Pokemon card' look
  credit_cost INTEGER NOT NULL DEFAULT 0 CHECK (credit_cost >= 0),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL -- To allow deactivating bounties
);

ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;

-- Policies for bounties table
CREATE POLICY "Allow public read access to active bounties" ON public.bounties
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow authenticated users to create bounties" ON public.bounties
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Allow creator to update their own bounties" ON public.bounties
  FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Allow creator to delete their own bounties" ON public.bounties
  FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_bounties_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_bounties_updated
  BEFORE UPDATE ON public.bounties
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_bounties_updated_at();

COMMENT ON TABLE public.bounties IS 'Stores bounties that users can purchase in the Bounty Store.';
COMMENT ON COLUMN public.bounties.image_url IS 'URL for the bounty image, e.g., for a card-like display.';
COMMENT ON COLUMN public.bounties.credit_cost IS 'How many credits this bounty costs to acquire.';
COMMENT ON COLUMN public.bounties.creator_id IS 'The user who created this bounty.';
COMMENT ON COLUMN public.bounties.is_active IS 'Whether the bounty is available in the store.';
