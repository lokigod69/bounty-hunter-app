// src/hooks/useInvite.ts
// Phase 2.5: shareable friend-invite links.
// Wraps the get_or_create_invite / redeem_invite RPCs (not in generated types, so
// called with the loose-cast pattern used elsewhere in the codebase) and exposes:
// - getOrCreateInviteLink(): builds the full /invite/<token> URL for the current user
// - redeemInvite(token): redeems a token into an accepted friendship
// - shareInviteLink(): navigator.share with clipboard-copy fallback
// - useRedeemPendingInvite(): redeems a token stashed pre-login exactly once

import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

// localStorage key holding a token captured while the recipient was logged out.
export const PENDING_INVITE_KEY = 'pending_invite_token';

export interface RedeemResult {
  success: boolean;
  already?: boolean;
  inviterName?: string;
  message: string;
}

export function useInvite() {
  const { t } = useTranslation();

  // Fetch (or lazily create) the caller's active invite token and build the link.
  const getOrCreateInviteLink = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.rpc('get_or_create_invite' as never, {} as never);

    if (error) {
      throw new Error(error.message || t('invite.error'));
    }

    const res = data as { success?: boolean; token?: string; error?: string; message?: string } | null;

    if (!res?.success || !res.token) {
      throw new Error(res?.message || t('invite.error'));
    }

    return `${window.location.origin}/invite/${res.token}`;
  }, [t]);

  // Redeem a token into an accepted friendship. Never throws - always returns a result.
  const redeemInvite = useCallback(async (token: string): Promise<RedeemResult> => {
    const { data, error } = await supabase.rpc('redeem_invite' as never, { p_token: token } as never);

    if (error) {
      return { success: false, message: error.message || t('invite.page.error') };
    }

    const res = data as {
      success?: boolean;
      already?: boolean;
      inviter_id?: string;
      inviter_name?: string;
      error?: string;
      message?: string;
    } | null;

    if (!res?.success) {
      let message = res?.message || t('invite.page.error');
      switch (res?.error) {
        case 'SELF_INVITE':
          message = t('invite.page.selfInvite');
          break;
        case 'INVALID_INVITE':
        case 'BAD_TOKEN':
          message = t('invite.page.invalid');
          break;
        case 'NOT_AUTHENTICATED':
          message = t('invite.page.signInToAccept');
          break;
        default:
          break;
      }
      return { success: false, message };
    }

    const inviterName = res.inviter_name || undefined;
    const message = res.already
      ? t('invite.page.already', { name: inviterName ?? '' })
      : t('invite.page.success', { name: inviterName ?? '' });

    return { success: true, already: res.already, inviterName, message };
  }, [t]);

  // Build the link then share it: native share sheet when available, clipboard otherwise.
  const shareInviteLink = useCallback(async (): Promise<void> => {
    let url: string;
    try {
      url = await getOrCreateInviteLink();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('invite.error'));
      return;
    }

    const shareText = t('invite.shareText');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: shareText, text: shareText, url });
        return;
      } catch (err) {
        // User dismissed the share sheet - respect that, don't fall through to copy.
        if ((err as Error)?.name === 'AbortError') {
          return;
        }
        // Any other share failure falls through to the clipboard path below.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('invite.linkCopied'));
    } catch {
      toast.error(t('invite.error'));
    }
  }, [getOrCreateInviteLink, t]);

  return { getOrCreateInviteLink, redeemInvite, shareInviteLink };
}

// Post-login redemption: magic-link/OAuth returns the user to the app origin (not
// /invite/...), so if a token was stashed while logged out, redeem it here exactly
// once. Mounted inside the authenticated shell (Layout).
export function useRedeemPendingInvite(): void {
  const { user, authLoading } = useAuth();
  const { redeemInvite } = useInvite();
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    // Wait for auth to settle and require an authenticated user.
    if (authLoading || !user) return;
    if (processedRef.current) return;

    const token = localStorage.getItem(PENDING_INVITE_KEY);
    if (!token) return;

    // Guard against re-running: mark processed and clear the stash immediately so a
    // re-render (StrictMode double-mount, auth refresh) can't redeem the same token twice.
    processedRef.current = true;
    localStorage.removeItem(PENDING_INVITE_KEY);

    (async () => {
      const result = await redeemInvite(token);
      if (result.success) {
        toast.success(result.message);
        navigate('/friends');
      } else {
        toast.error(result.message);
      }
    })();
  }, [user, authLoading, redeemInvite, navigate]);
}
