// src/lib/profileBootstrap.ts
// Profile bootstrapping helper - ensures a profile exists for a user, creating one if missing.
// Uses .maybeSingle() to handle missing profiles gracefully instead of throwing errors.
// Always returns a profile/error result object - never throws, never hangs.
//
// R15 INVARIANT: This function NEVER modifies an existing profile.
// - If a profile row exists, return it AS-IS (including any user-set avatar_url/display_name)
// - Only INSERT if no profile exists at all
// - ProfileEditModal is the ONLY place that should UPDATE profile fields
//
// RACE CONDITION FIX: If two simultaneous logins both try to create a profile,
// the second one will get a unique violation (23505) - we handle this by
// fetching the existing profile instead of failing.

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User
): Promise<{ profile: Profile | null; error: Error | null }> {
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
      return { profile: null, error: new Error(error.message) };
    }

    // R15: CRITICAL - If profile exists, return it WITHOUT modification
    // Never overwrite user-chosen display_name or avatar_url here
    if (profile) {
      return { profile: profile as Profile, error: null };
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
      // RACE CONDITION HANDLING: If another request already created the profile,
      // we'll get a unique violation (code 23505). Fetch the existing profile instead.
      if (insertError.code === '23505') {
        const { data: existingProfile, error: refetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (refetchError) {
          return { profile: null, error: new Error(refetchError.message) };
        }

        if (existingProfile) {
          return { profile: existingProfile as Profile, error: null };
        }

        return {
          profile: null,
          error: new Error('Profile was not found after resolving a profile creation race.'),
        };
      }

      // Other errors - return the failure
      return { profile: null, error: new Error(insertError.message) };
    }

    if (!inserted) {
      return { profile: null, error: new Error('Profile creation returned no profile.') };
    }

    return { profile: inserted as Profile, error: null };

  } catch (error) {
    // Catch any unexpected errors (network failures, etc.)
    return {
      profile: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

