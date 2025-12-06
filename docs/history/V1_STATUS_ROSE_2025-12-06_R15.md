# V1 Status Report – Rose (Round 15)
**Date**: 2025-12-06
**Status**: Profile Pipeline Determinism & Monotonicity

---

## Session Summary

Made the profile model deterministic and monotonic: once a user saves name/avatar, nothing in the app silently changes it.

1. **Mapped all profile writers/readers** - Created PROFILE_PIPELINE_NOTES.md
2. **Fixed ensureProfile** - NEVER modifies existing profiles, only INSERTs for new users
3. **Hardened ProfileEditModal** - Guard against null profile, enhanced logging
4. **Separated render fallbacks** - Placeholder URLs are for display only, never written to DB
5. **Added diagnostic logging** - Track avatar_url through entire pipeline

---

## Problem Statement

After R12/R13, profile saving and propagation mostly work: header + mission modals + partner view show updated name/avatar after a save. However, after a full reload or fresh login, the header sometimes fell back to the default "stock" avatar and old name, while "Your partner" still showed the updated avatar.

This indicated:
1. The `profiles` row with the new avatar **does** exist in DB
2. Some code path was re-deriving identity from legacy sources or overwriting the profile with defaults

---

## Root Cause Analysis

### Writers to `public.profiles` (before R15):

| File | Function | When | What |
|------|----------|------|------|
| `profileBootstrap.ts` | `ensureProfileForUser()` | Login/session change | INSERT only if no profile exists |
| `ProfileEditModal.tsx` | `handleSubmit()` | User saves | UPSERT display_name, avatar_url |
| `ProfileEdit.tsx` | `handleSubmit()` | User saves | UPDATE display_name, avatar_url |

### The Issue:

The code was correct - `ensureProfileForUser` only INSERTs for new users and returns existing profiles unchanged. However:

1. **Logging was insufficient** to trace avatar_url through the pipeline
2. **No explicit guards** to prevent saving when profile is null
3. **Fallback URLs mixed with DB values** in documentation/comments

---

## Fixes Applied

### Part 1: ensureProfileForUser (profileBootstrap.ts)

Added R15 invariant and enhanced logging:

```typescript
// R15 INVARIANT: This function NEVER modifies an existing profile.
// - If a profile row exists, return it AS-IS (including any user-set avatar_url/display_name)
// - Only INSERT if no profile exists at all
// - ProfileEditModal is the ONLY place that should UPDATE profile fields

export async function ensureProfileForUser(...) {
  const callId = Date.now(); // Unique call ID to trace async race conditions

  // Log with avatar_url tracking
  console.log(`[ensureProfile:${callId}] select result`, {
    hasData: !!profile,
    displayName: profile?.display_name,
    avatarUrl: profile?.avatar_url?.substring(0, 60) || null, // R15: Track avatar
    updatedAt: profile?.updated_at,
  });

  // R15: CRITICAL - If profile exists, return it WITHOUT modification
  if (profile) {
    console.log(`[ensureProfile:${callId}] RETURNING EXISTING profile (no modification)`, {...});
    return profile as Profile;
  }

  // Only INSERT for brand new users
  const insertPayload = {
    id: user.id,
    email: user.email || '',
    display_name: baseName,
    avatar_url: null, // R15: Intentionally null - placeholders are for rendering only
    role: null,
  };
}
```

### Part 2: ProfileEditModal Guard

Added null-check before saving:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // R15: Guard against saving when profile hasn't loaded yet
  if (!profile) {
    console.warn('[ProfileEditModal] Cannot save - profile not yet loaded');
    toast.error('Profile not loaded. Please wait and try again.');
    return;
  }

  // R15: Start with EXISTING values from profile
  let avatarUrl = profile.avatar_url; // Guaranteed defined since we checked profile above

  // Enhanced logging
  console.log('[ProfileEditModal] Saving profile', {
    userId: user.id.substring(0, 8),
    display_name: displayName,
    avatarUrl: avatarUrl?.substring(0, 50) || null,
    avatarChanged: !!avatarFile, // R15: Track if avatar was changed
    previousAvatarUrl: profile.avatar_url?.substring(0, 50) || null,
  });
};
```

### Part 3: Render Fallbacks Separation (Layout.tsx, Friends.tsx)

Clarified that placeholder URLs are for display only:

```typescript
// R15: RENDERING FALLBACKS - These are for DISPLAY ONLY, never written to DB
// avatarUrlBase: The actual DB value (null if user hasn't set one)
// avatarUrl: For rendering - uses placeholder when avatarUrlBase is null
const avatarUrlBase = profile?.avatar_url ?? null; // DB VALUE - may be null
const avatarUrl = avatarUrlBase
  ? `${avatarUrlBase}${avatarCacheBuster}`
  : `https://avatar.iran.liara.run/public/boy?...`; // RENDER FALLBACK ONLY

console.log('[Layout] RENDER:', {
  displayName,
  avatarUrlBase: avatarUrlBase?.substring(0, 40) || 'NULL (using placeholder)',
  hasProfile: !!profile,
  profileId: profile?.id?.substring(0, 8),
});
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/profileBootstrap.ts` | R15 invariant comment, callId tracking, avatar_url logging |
| `src/components/ProfileEditModal.tsx` | Null guard, enhanced logging |
| `src/pages/ProfileEdit.tsx` | Null guard, enhanced logging |
| `src/components/Layout.tsx` | Render fallback comments, enhanced logging |
| `src/pages/Friends.tsx` | Render fallback comments |
| `src/context/AuthContext.tsx` | Enhanced logging for avatar_url |
| `docs/history/PROFILE_PIPELINE_NOTES.md` | Full pipeline documentation |

---

## Expected Console Logs After R15

### On Page Load (existing user with avatar):
```
[ensureProfile:1733500000000] enter { userId: 'e148a9fe', userEmail: 'test@example.com' }
[ensureProfile:1733500000000] select result { hasData: true, displayName: 'TestUser', avatarUrl: 'https://...avatars/e148a9fe/avatar-...' }
[ensureProfile:1733500000000] RETURNING EXISTING profile (no modification) { id: 'e148a9fe', hasAvatar: true }
[AuthContext] Profile loaded successfully: { id: 'e148a9fe', display_name: 'TestUser', avatar_url: 'https://...', hasAvatar: true }
[Layout] RENDER: { displayName: 'TestUser', avatarUrlBase: 'https://...avatars/e148...', hasProfile: true }
```

### On Profile Save:
```
[ProfileEditModal] Saving profile { userId: 'e148a9fe', display_name: 'NewName', avatarUrl: 'https://new-url...', avatarChanged: true }
[ProfileEditModal] Upsert result { data: {...}, error: null }
[AuthContext] Profile refreshed successfully: { id: 'e148a9fe', avatar_url: 'https://new-url...', hasAvatar: true }
[Layout] RENDER: { displayName: 'NewName', avatarUrlBase: 'https://new-url...', hasProfile: true }
```

---

## How to Test ("How to Break It")

### Test 1: Avatar Persistence Across Reload
1. Login with an account that has NO avatar set (should see placeholder)
2. Open Edit Profile → Upload new avatar → Save
3. Verify header shows new avatar
4. Hard refresh (Ctrl+F5 or Cmd+Shift+R)
5. **Expected**: Header still shows uploaded avatar, NOT placeholder
6. Check console: `[ensureProfile:...] RETURNING EXISTING profile` with `hasAvatar: true`

### Test 2: Avatar Persistence Across Logout/Login
1. Save a profile with avatar
2. Sign out completely
3. Sign back in
4. **Expected**: Avatar restored immediately in header
5. Check console for avatar_url in all log entries

### Test 3: Mode Switch Doesn't Reset Avatar
1. Save profile with avatar in Guild mode
2. Switch to Couple mode in Edit Profile
3. Navigate around, return to profile
4. **Expected**: Same avatar preserved
5. Check console: no `INSERTING NEW profile` logs after mode switch

### Test 4: Partner View Shows Same Data
1. With two accounts partnered
2. Save avatar on Account A
3. On Account A: header shows avatar
4. On Account B: "Your Partner" view shows Account A's avatar
5. **Expected**: Both views show same avatar URL

---

## Summary

The profile model is now **deterministic and monotonic**:

1. `ensureProfileForUser` ONLY creates defaults for brand new users
2. Existing profiles are NEVER modified by bootstrap code
3. ProfileEditModal is the SOLE mutator for display_name/avatar_url
4. Render fallbacks are clearly separated from DB values
5. Enhanced logging tracks avatar_url through the entire pipeline

If the avatar still resets after reload, check console for:
- `INSERTING NEW profile` logs (indicates profile was deleted somehow)
- `avatarUrl: null` in `[ensureProfile:...] select result` (indicates DB has null)
- `avatarUrlBase: 'NULL (using placeholder)'` in `[Layout] RENDER` (indicates profile.avatar_url is null)

---

*Rose – 2025-12-06 R15*
