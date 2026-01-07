// src/lib/profileBootstrap.ts
// Profile bootstrapping helper - ensures a profile exists for a user, creating one if missing.
// Uses .maybeSingle() to handle missing profiles gracefully instead of throwing errors.
// Always returns Profile | null - never throws, never hangs.
//
// R15 INVARIANT: This function NEVER modifies an existing profile.
// - If a profile row exists, return it AS-IS (including any user-set avatar_url/display_name)
// - Only INSERT if no profile exists at all
// - ProfileEditModal is the ONLY place that should UPDATE profile fields

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User
): Promise<Profile | null> {
  const callId = Date.now(); // R15: Unique call ID to trace async race conditions

  try {
    // 1. Try to load existing profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();   // Returns null data when no row found, not an error

    // .maybeSingle() returns null data when no rows found, not an error
    // Only real errors (network, RLS violations, etc.) will have error set
    if (error) {
      console.error(`[ensureProfile:${callId}] select error`, error);
      return null;
    }

    // R15: CRITICAL - If profile exists, return it WITHOUT modification
    // Never overwrite user-chosen display_name or avatar_url here
    if (profile) {
      return profile as Profile;
    }

    // 2. No profile exists → create default
    // R15: This is the ONLY case where we write to profiles from this function
    const baseName =
      (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) ||
      (user.email ? user.email.split('@')[0] : 'New Hunter');

    // R15: avatar_url is NULL for new profiles - user must explicitly set via ProfileEditModal
    // Do NOT write placeholder URLs here; those are render-time fallbacks only
    const insertPayload = {
      id: user.id,
      email: user.email || '',
      display_name: baseName,
      avatar_url: null, // R15: Intentionally null - placeholders are for rendering only
      role: null,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError) {
      console.error(`[ensureProfile:${callId}] INSERT FAILED:`, insertError);
      return null;
    }

    if (!inserted) {
      console.error(`[ensureProfile:${callId}] insert returned no data`);
      return null;
    }

    return inserted as Profile;

  } catch (err) {
    // Catch any unexpected errors (network failures, etc.)
    console.error(`[ensureProfile:${callId}] unexpected error`, err);
    return null;
  }
}

