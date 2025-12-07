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
import type { Profile } from '../types/database';

export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User
): Promise<Profile | null> {
  const callId = Date.now(); // R15: Unique call ID to trace async race conditions

  // R15: Enhanced logging with avatar_url tracking
  console.log(`[ensureProfile:${callId}] enter`, {
    userId: user.id.substring(0, 8),
    userEmail: user.email,
    timestamp: new Date().toISOString(),
  });

  try {
    // 1. Try to load existing profile
    console.log(`[ensureProfile:${callId}] Querying profiles table...`);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();   // Returns null data when no row found, not an error

    // R17: Log FULL profile row for debugging - this is what ensureProfile sees from DB
    console.log(`[ensureProfile:${callId}] select result`, {
      hasData: !!profile,
      id: profile?.id,
      displayName: profile?.display_name,
      avatarUrl: profile?.avatar_url, // R17: Log FULL URL for comparison
      avatarUrlShort: profile?.avatar_url?.substring(0, 60) || null,
      updatedAt: profile?.updated_at,
      error: error ? { code: error.code, message: error.message } : null,
    });

    // .maybeSingle() returns null data when no rows found, not an error
    // Only real errors (network, RLS violations, etc.) will have error set
    if (error) {
      console.error(`[ensureProfile:${callId}] select error`, error);
      return null;
    }

    // R15: CRITICAL - If profile exists, return it WITHOUT modification
    // Never overwrite user-chosen display_name or avatar_url here
    if (profile) {
      console.log(`[ensureProfile:${callId}] RETURNING EXISTING profile (no modification)`, {
        id: profile.id.substring(0, 8),
        hasAvatar: !!profile.avatar_url,
        hasDisplayName: !!profile.display_name,
      });
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

    console.log(`[ensureProfile:${callId}] INSERTING NEW profile (no existing row)`, insertPayload);

    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert(insertPayload)
      .select('*')
      .single();

    console.log(`[ensureProfile:${callId}] insert result`, {
      hasData: !!inserted,
      insertedId: inserted?.id?.substring(0, 8),
      error: insertError ? { code: insertError.code, message: insertError.message } : null,
    });

    if (insertError) {
      console.error(`[ensureProfile:${callId}] INSERT FAILED:`, insertError);
      return null;
    }

    if (!inserted) {
      console.error(`[ensureProfile:${callId}] insert returned no data`);
      return null;
    }

    console.log(`[ensureProfile:${callId}] NEW profile created successfully`);
    return inserted as Profile;

  } catch (err) {
    // Catch any unexpected errors (network failures, etc.)
    console.error(`[ensureProfile:${callId}] unexpected error`, err);
    return null;
  }
}

