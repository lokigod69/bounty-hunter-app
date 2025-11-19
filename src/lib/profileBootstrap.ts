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
  console.log('[ensureProfile] enter', user.id);

  try {
    // 1. Try to load existing profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();   // Returns null data when no row found, not an error

    console.log('[ensureProfile] select result', { 
      hasData: !!profile, 
      error: error ? { code: error.code, message: error.message } : null 
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
    console.log('[ensureProfile] No profile found, creating new one for user:', user.id);
    
    const baseName =
      (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) ||
      (user.email ? user.email.split('@')[0] : 'New Hunter');

    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        display_name: baseName,
        // Optional fields can be null/undefined
        avatar_url: null,
        role: null,
      })
      .select('*')
      .single();

    console.log('[ensureProfile] insert result', { 
      hasData: !!inserted, 
      error: insertError ? { code: insertError.code, message: insertError.message } : null 
    });

    if (insertError) {
      console.error('[ensureProfile] insert error', insertError);
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

