-- Phase 2.5: shareable friend-invite links.
--
-- Both existing "add friend" surfaces only find EXISTING accounts (lookup by
-- email/display_name). A two-player app must be able to recruit player 2 who
-- has no account yet. This adds a per-user shareable invite token: the inviter
-- generates a link (bounty-hunter-app/#/invite/<token>); a recipient who opens
-- it and authenticates has an ACCEPTED friendship created with the inviter.
--
-- Design:
--   * invites: one row per (re)generated token, owned by inviter. RLS: owner
--     only. Redemption never reads the table under the caller's RLS — it goes
--     through redeem_invite() (SECURITY DEFINER), so recipients never need
--     SELECT on invites.
--   * get_or_create_invite(): returns the caller's active token, creating one
--     on first use. Reusable link (can invite several people); revocable by
--     flipping revoked (a future "reset link" action would insert a new row).
--   * redeem_invite(token): validates, blocks self-invite, and upserts an
--     ACCEPTED friendship in either ordering (friendships.unique is on the
--     ORDERED pair, so we must check both directions to avoid duplicates).
--
-- SAFETY: new table + two functions only; touches no existing rows.

BEGIN;

CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token text NOT NULL UNIQUE DEFAULT replace(uuid_generate_v4()::text, '-', ''),
  inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS invites_inviter_id_idx ON public.invites(inviter_id);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Invites: owner can view" ON public.invites;
CREATE POLICY "Invites: owner can view" ON public.invites
  FOR SELECT TO authenticated USING (auth.uid() = inviter_id);

DROP POLICY IF EXISTS "Invites: owner can insert" ON public.invites;
CREATE POLICY "Invites: owner can insert" ON public.invites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = inviter_id);

DROP POLICY IF EXISTS "Invites: owner can update" ON public.invites;
CREATE POLICY "Invites: owner can update" ON public.invites
  FOR UPDATE TO authenticated USING (auth.uid() = inviter_id) WITH CHECK (auth.uid() = inviter_id);

CREATE OR REPLACE FUNCTION public.get_or_create_invite()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'NOT_AUTHENTICATED', 'message', 'Not authenticated');
  END IF;

  SELECT token INTO v_token
  FROM public.invites
  WHERE inviter_id = auth.uid() AND revoked = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_token IS NULL THEN
    INSERT INTO public.invites (inviter_id)
    VALUES (auth.uid())
    RETURNING token INTO v_token;
  END IF;

  RETURN json_build_object('success', true, 'token', v_token);
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_invite() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_invite() TO authenticated;

COMMENT ON FUNCTION public.get_or_create_invite() IS
  'Returns the caller''s active invite token, creating one on first use (Phase 2.5).';

CREATE OR REPLACE FUNCTION public.redeem_invite(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_inviter uuid;
  v_inviter_name text;
  v_existing_id uuid;
BEGIN
  IF v_me IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'NOT_AUTHENTICATED', 'message', 'Not authenticated');
  END IF;

  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RETURN json_build_object('success', false, 'error', 'BAD_TOKEN', 'message', 'Invite token is required');
  END IF;

  SELECT inviter_id INTO v_inviter
  FROM public.invites
  WHERE token = p_token AND revoked = false;

  IF v_inviter IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'INVALID_INVITE', 'message', 'This invite link is invalid or was revoked');
  END IF;

  IF v_inviter = v_me THEN
    RETURN json_build_object('success', false, 'error', 'SELF_INVITE', 'message', 'You cannot use your own invite link');
  END IF;

  SELECT display_name INTO v_inviter_name FROM public.profiles WHERE id = v_inviter;

  SELECT id INTO v_existing_id
  FROM public.friendships
  WHERE (user1_id = v_inviter AND user2_id = v_me)
     OR (user1_id = v_me AND user2_id = v_inviter)
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.friendships
    SET status = 'accepted'
    WHERE id = v_existing_id AND status IS DISTINCT FROM 'accepted';

    RETURN json_build_object(
      'success', true, 'already', true,
      'inviter_id', v_inviter, 'inviter_name', v_inviter_name,
      'message', 'You are already connected'
    );
  END IF;

  INSERT INTO public.friendships (user1_id, user2_id, status, requested_by)
  VALUES (v_inviter, v_me, 'accepted', v_inviter);

  RETURN json_build_object(
    'success', true, 'already', false,
    'inviter_id', v_inviter, 'inviter_name', v_inviter_name,
    'message', 'You are now connected'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_invite(text) TO authenticated;

COMMENT ON FUNCTION public.redeem_invite(text) IS
  'Redeems a friend-invite token: creates/promotes an ACCEPTED friendship between the token owner and the caller (Phase 2.5).';

COMMENT ON TABLE public.invites IS
  'Shareable friend-invite links (Phase 2.5). Owner-only RLS; redemption via redeem_invite() SECURITY DEFINER.';

COMMIT;
