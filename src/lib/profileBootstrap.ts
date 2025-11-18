// src/lib/profileBootstrap.ts
// Profile bootstrapping helper - ensures a profile exists for a user, creating one if missing.
// Uses .maybeSingle() to handle missing profiles gracefully instead of throwing errors.

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Profile } from '../types/database';

export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User
): Promise<Profile> {
  // 1. Try to load existing profile, but tolerate 0 rows
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();   // <- important: returns null instead of error when no row found

  if (error) {
    // PGRST116 is "no rows returned" - this is expected for new users, not an error
    if (error.code === 'PGRST116') {
      // This is fine - profile doesn't exist yet, we'll create it
      console.log('[profileBootstrap] No profile found for user, will create one');
    } else {
      // real error (RLS, network, etc.)
      console.error('[profileBootstrap] Error fetching profile:', error);
      throw error;
    }
  }

  if (profile) return profile;

  // 2. No profile yet → create one
  const baseName =
    (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) ||
    (user.email ? user.email.split('@')[0] : 'New Hunter');

  console.log('[profileBootstrap] Creating profile for user:', user.id, 'with display_name:', baseName);

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

  if (insertError) {
    console.error('[profileBootstrap] Error creating profile:', insertError);
    throw insertError;
  }
  
  if (!inserted) {
    console.error('[profileBootstrap] Profile insert returned no data');
    throw new Error('Failed to create profile: insert returned no data');
  }

  console.log('[profileBootstrap] Profile created successfully:', inserted.id);
  return inserted;
}

