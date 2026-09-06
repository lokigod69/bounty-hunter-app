-- Disposable local DB only. Production policies/functions are loaded from saved
-- READ ONLY metadata by run-016.mjs. These small tables model the columns they use.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE SCHEMA test;
GRANT USAGE ON SCHEMA public, auth, storage, test TO anon, authenticated, service_role;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
  $$ SELECT jsonb_build_object('sub', auth.uid(), 'email', current_setting('request.jwt.claim.email', true)) $$;
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
  $$ SELECT (string_to_array($1, '/'))[1:array_length(string_to_array($1, '/'), 1)-1] $$;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users, email text NOT NULL, display_name text,
  avatar_url text, created_at timestamptz DEFAULT now(), role text DEFAULT 'user',
  partner_user_id uuid REFERENCES public.profiles, theme text,
  onboarding_completed boolean NOT NULL DEFAULT false
);
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by uuid REFERENCES public.profiles,
  assigned_to uuid REFERENCES public.profiles, title text NOT NULL, description text,
  deadline date, reward_type text, reward_text text, proof_required boolean DEFAULT false,
  is_daily boolean DEFAULT false, status text DEFAULT 'pending'
);
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user1_id uuid, user2_id uuid,
  requested_by uuid, status text DEFAULT 'pending'
);
CREATE TABLE public.user_credits (user_id uuid PRIMARY KEY, credits integer DEFAULT 0);
CREATE TABLE storage.buckets (id text PRIMARY KEY, public boolean DEFAULT false,
  file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text REFERENCES storage.buckets,
  name text NOT NULL, metadata jsonb DEFAULT '{}', UNIQUE (bucket_id, name)
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.profiles, public.tasks, public.friendships, public.user_credits, storage.objects
  TO anon, authenticated, service_role;
-- Include explicit column ACLs and PUBLIC grants to catch table-only assumptions.
GRANT UPDATE (role) ON public.profiles TO authenticated;
GRANT UPDATE (status) ON public.tasks TO PUBLIC;
CREATE PUBLICATION supabase_realtime;
INSERT INTO auth.users(id) SELECT ('00000000-0000-4000-8000-00000000000' || n)::uuid FROM generate_series(1, 5) n;
UPDATE auth.users SET email=id::text || '@example.invalid';
INSERT INTO public.profiles (id, email, role)
  SELECT id, id::text || '@example.invalid', CASE WHEN right(id::text, 1) = '3' THEN 'admin' ELSE 'user' END
  FROM auth.users WHERE right(id::text, 1) IN ('1', '2', '3');
INSERT INTO public.tasks (id, created_by, assigned_to, title) VALUES (
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002', 'Private mission');
INSERT INTO storage.buckets(id,public) VALUES ('avatars', true), ('reward-images', true), ('bounty-proofs', false);
INSERT INTO storage.objects (bucket_id, name) VALUES
  ('avatars', '00000000-0000-4000-8000-000000000001/avatar.webp'),
  ('reward-images', 'rewards/00000000-0000-4000-8000-000000000001/reward.webp'),
  ('bounty-proofs', 'proofs/10000000-0000-4000-8000-000000000001/evidence.pdf');

CREATE FUNCTION test.assert_true(value boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %', label; END IF;
END $$;
CREATE FUNCTION test.denied(statement text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege THEN RETURN; END;
  RAISE EXCEPTION 'Expected permission/RLS denial: %', statement;
END $$;
