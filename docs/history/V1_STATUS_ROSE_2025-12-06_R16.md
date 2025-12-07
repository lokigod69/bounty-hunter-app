# V1 Status Report – Rose (Round 16)
**Date**: 2025-12-06
**Status**: Profile Guard Fix & First-Time Profile Support

---

## Session Summary

Fixed the overly strict R15 profile guard that blocked all saves when `profile` was null. The guard now distinguishes between "profile is loading" and "no profile exists yet (first-time user)".

1. **Fixed ProfileEditModal guard** - Changed from `if (!profile)` to `if (!profile && profileLoading)`
2. **Fixed ProfileEdit.tsx guard** - Same pattern as modal
3. **Added first-time hydration** - Forms now hydrate from user.email when profile is null
4. **Changed UPDATE to UPSERT** - ProfileEdit now uses upsert to handle INSERT for first-time users
5. **Added optional chaining** - Fixed `profile.avatar_url` references to use `profile?.avatar_url`

---

## Problem Statement

R15 introduced a guard in ProfileEditModal and ProfileEdit:
```typescript
if (!profile) {
  toast.error('Profile not loaded. Please wait and try again.');
  return;
}
```

This broke first-time profile creation because:
1. First-time users have `profile = null` but `profileLoading = false`
2. The guard couldn't distinguish "still loading" from "no profile exists"
3. Users saw "Profile not loaded" errors even with valid sessions
4. Edit Profile opened with empty fields (no hydration fallback)

---

## Root Cause Analysis

### The Profile Loading States:

| State | `profile` | `profileLoading` | Meaning |
|-------|-----------|------------------|---------|
| Loading | null | true | Profile fetch in progress |
| First-time | null | false | User has no profile yet (valid for UPSERT) |
| Loaded | Profile object | false | Normal operation |

### R15's Mistake:

R15 treated both "loading" and "first-time" as the same error case. But first-time is a valid state where we should allow saving (via UPSERT).

---

## Fixes Applied

### Part 1: ProfileEditModal Guard (src/components/ProfileEditModal.tsx)

Changed guard to check both states:

```typescript
// R16: Only block if profile is still actively loading
// If profile is null but not loading, this is first-time creation - allow it
if (!profile && profileLoading) {
  console.warn('[ProfileEditModal] Cannot save - profile still loading');
  toast.error('Profile is still loading. Please wait a moment and try again.');
  return;
}
```

Added first-time hydration:

```typescript
// R16: Hydrate form state when modal opens - handles both existing and first-time
useEffect(() => {
  if (!isOpen) return;

  if (profile) {
    // Existing user with profile
    setDisplayName(profile.display_name ?? '');
    setAvatarPreview(profile.avatar_url ?? null);
  } else if (!profileLoading && user) {
    // First-time profile scenario - derive defaults from user
    setDisplayName(deriveDisplayNameFromEmail(user.email));
    setAvatarPreview(null);
  }
  setAvatarFile(null);
}, [isOpen, profile, profileLoading, user]);
```

Fixed optional chaining:

```typescript
// Before (R15)
previousAvatarUrl: profile.avatar_url?.substring(0, 50) || null,

// After (R16)
previousAvatarUrl: profile?.avatar_url?.substring(0, 50) || null,
```

### Part 2: ProfileEdit.tsx (src/pages/ProfileEdit.tsx)

Same pattern applied:

1. Added `profileLoading` to useAuth destructuring
2. Added `deriveDisplayNameFromEmail` helper function
3. Updated hydration effect to handle first-time scenario
4. Changed guard from `!profile` to `!profile && profileLoading`
5. Changed UPDATE to UPSERT with email field for INSERT:

```typescript
// R16: Use UPSERT to handle both existing profiles and first-time creation
const { data: updatedProfile, error: updateError } = await supabase
  .from('profiles')
  .upsert(
    {
      id: user.id,
      email: user.email || '',  // Required for INSERT
      display_name: displayName || null,
      avatar_url: avatarUrl || null,
    },
    { onConflict: 'id' }
  )
  .select('*')
  .single();
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/ProfileEditModal.tsx` | Guard fix, hydration fix, optional chaining |
| `src/pages/ProfileEdit.tsx` | Guard fix, hydration fix, UPDATE→UPSERT, optional chaining |

---

## Expected Console Logs After R16

### First-time user opening Edit Profile:
```
[ProfileEditModal] OPEN { profileNull: true, profileLoading: false, userId: 'e148a9fe' }
[ProfileEditModal] Hydrating from user (no profile yet): { baseName: 'testuser', userId: 'e148a9fe' }
```

### First-time user saving profile:
```
[ProfileEditModal] SUBMIT CLICK { profileNull: true, profileLoading: false, displayName: 'testuser' }
[ProfileEditModal] Saving profile { userId: 'e148a9fe', display_name: 'testuser', avatarUrl: null, previousAvatarUrl: null }
[ProfileEditModal] Upsert result { data: {...}, error: null }
[AuthContext] Profile refreshed successfully: { id: 'e148a9fe', display_name: 'testuser', hasAvatar: false }
```

### Existing user with profile:
```
[ProfileEditModal] OPEN { profileNull: false, profileLoading: false, userId: 'e148a9fe' }
[ProfileEditModal] Hydrating from profile: { displayName: 'TestUser', avatarUrl: 'https://...' }
```

---

## How to Test

### Test 1: First-Time Profile Creation
1. Create a new account (or delete profile row in DB)
2. Open Edit Profile modal
3. **Expected**: Form shows email-derived username, not empty
4. Save changes
5. **Expected**: Saves successfully, no "Profile not loaded" error

### Test 2: Existing Profile Edit
1. Login with account that has profile
2. Open Edit Profile modal
3. **Expected**: Form shows existing display_name and avatar
4. Change display name, save
5. **Expected**: Saves successfully, header updates

### Test 3: Profile Still Loading (Edge Case)
1. Open Edit Profile immediately after login (before profile loads)
2. Click Save very quickly
3. **Expected**: Toast says "Profile is still loading. Please wait a moment."
4. Wait, try again
5. **Expected**: Saves successfully

### Test 4: TypeScript Passes
```bash
npx tsc --noEmit
# Should pass with no errors
```

---

## Summary

R16 fixes the regression from R15 where the profile guard was too strict:

1. **Guard logic**: `!profile` → `!profile && profileLoading`
2. **First-time users**: Can now save profiles (UPSERT creates new row)
3. **Hydration**: Falls back to user.email when profile is null
4. **Optional chaining**: Fixed `profile.avatar_url` → `profile?.avatar_url`

The profile model remains deterministic:
- `ensureProfileForUser` only creates defaults for new users
- `ProfileEditModal` and `ProfileEdit` are the only mutators
- Render fallbacks are separate from DB values

---

*Rose – 2025-12-06 R16*
