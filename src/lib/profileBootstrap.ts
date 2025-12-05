// src/lib/profileBootstrap.ts
// Profile bootstrapping helper - ensures a profile exists for a user, creating one if missing.
// Uses .maybeSingle() to handle missing profiles gracefully instead of throwing errors.
// Always returns Profile | null - never throws, never hangs.

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Profile } from '../types/database';

export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User
): Promise<Profile | null> {
  // R12: Enhanced logging for debugging profile pipeline
  console.log('[ensureProfile] enter', {
    userId: user.id,
    userEmail: user.email,
    hasMetadata: !!user.user_metadata
  });

  try {
    // 1. Try to load existing profile
    console.log('[ensureProfile] Querying profiles table...');
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();   // Returns null data when no row found, not an error

    console.log('[ensureProfile] select result', {
      hasData: !!profile,
      displayName: profile?.display_name,
      error: error ? { code: error.code, message: error.message, details: error.details } : null
    });

    // .maybeSingle() returns null data when no rows found, not an error
    // Only real errors (network, RLS violations, etc.) will have error set
    if (error) {
      console.error('[ensureProfile] select error', error);
      return null;
    }

    if (profile) {
      console.log('[ensureProfile] existing profile found:', profile.id);
      return profile as Profile;
    }

    // 2. No profile exists → create default
    const baseName =
      (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) ||
      (user.email ? user.email.split('@')[0] : 'New Hunter');

    const insertPayload = {
      id: user.id,
      email: user.email || '',
      display_name: baseName,
      avatar_url: null,
      role: null,
    };

    console.log('[ensureProfile] No profile found, creating:', insertPayload);

    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert(insertPayload)
      .select('*')
      .single();

    console.log('[ensureProfile] insert result', {
      hasData: !!inserted,
      insertedId: inserted?.id,
      error: insertError ? { code: insertError.code, message: insertError.message, details: insertError.details } : null
    });

    if (insertError) {
      console.error('[ensureProfile] INSERT FAILED:', insertError);
      return null;
    }

    if (!inserted) {
      console.error('[ensureProfile] insert returned no data');
      return null;
    }

    console.log('[ensureProfile] profile created successfully:', inserted.id);
    console.log('[ensureProfile] returning profile', inserted);
    return inserted as Profile;

  } catch (err) {
    // Catch any unexpected errors (network failures, etc.)
    console.error('[ensureProfile] unexpected error', err);
    return null;
  }
}

