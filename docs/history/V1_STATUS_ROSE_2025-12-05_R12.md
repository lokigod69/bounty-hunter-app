# V1 Status Report – Rose (Round 12)
**Date**: 2025-12-05
**Status**: Profile Pipeline Debug & Fix

---

## Session Summary

Debugged and fixed the profile pipeline end-to-end:

1. **Root Cause Found**: ProfileEditModal upsert was missing `email` field (required for INSERT)
2. **profileLoading Stuck**: AuthContext `finally` block wasn't running when effect was cancelled
3. **Enhanced Logging**: Added comprehensive debug logging throughout profile pipeline
4. **Error Handling**: Added NOT NULL violation (23502) error code handling

---

## Bug #1: Missing `email` in ProfileEditModal Upsert

### The Problem

The `profiles` table requires `email` for INSERT:
```typescript
// Database schema for profiles.Insert:
{
  id: string,        // REQUIRED
  email: string,     // REQUIRED
  display_name?: string | null,
  avatar_url?: string | null,
  role?: string | null,
}
```

But ProfileEditModal was doing:
```typescript
// OLD - Missing email!
.upsert({ id: user.id, display_name, avatar_url }, { onConflict: 'id' })
```

When no profile row exists, upsert attempts INSERT, which fails because `email` is not provided.

### The Fix

```typescript
// NEW - Includes email for INSERT case
.upsert(
  {
    id: user.id,
    email: user.email || '',  // Required for INSERT
    display_name: displayName || null,
    avatar_url: avatarUrl || null,
  },
  { onConflict: 'id' }
)
```

---

## Bug #2: `profileLoading` Stuck at `true`

### The Problem

In AuthContext Effect 2, the `finally` block only ran if `!cancelled`:

```typescript
// OLD
} finally {
  if (!cancelled) {  // <-- If cancelled, profileLoading stays true forever!
    setProfileLoading(false);
    ensuringUserIdRef.current = null;
  }
}
```

If the effect cleanup ran (setting `cancelled = true`) before the async function completed, `profileLoading` would stay `true` permanently.

### The Fix

```typescript
// NEW - Always update state in finally
} finally {
  console.log('[AuthContext] Profile loading complete, cancelled:', cancelled);
  setProfileLoading(false);  // Always set to false
  ensuringUserIdRef.current = null;  // Always reset ref
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/ProfileEditModal.tsx` | Added `email` to upsert, enhanced logging, added 23502 error code |
| `src/context/AuthContext.tsx` | Fixed `finally` block to always set profileLoading=false |
| `src/lib/profileBootstrap.ts` | Enhanced logging for debugging |

---

## Code Changes

### ProfileEditModal.tsx

```typescript
// R12: Upsert must include `email` since it's required for INSERT
const { data: upsertData, error: updateError } = await supabase
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

### AuthContext.tsx

```typescript
} finally {
  // R12 FIX: Always set profileLoading to false and reset ref
  // Previously, if cancelled=true, profileLoading stayed stuck at true
  console.log('[AuthContext] Profile loading complete, cancelled:', cancelled);
  setProfileLoading(false);
  ensuringUserIdRef.current = null;
}
```

### profileBootstrap.ts

```typescript
// R12: Enhanced logging for debugging profile pipeline
console.log('[ensureProfile] enter', {
  userId: user.id,
  userEmail: user.email,
  hasMetadata: !!user.user_metadata
});

const insertPayload = {
  id: user.id,
  email: user.email || '',
  display_name: baseName,
  avatar_url: null,
  role: null,
};
console.log('[ensureProfile] No profile found, creating:', insertPayload);
```

---

## Error Codes Added

| Code | Meaning | User Message |
|------|---------|--------------|
| `42501` | RLS policy violation | "Profile update blocked by database security rules." |
| `23502` | NOT NULL violation | "Missing required profile data. Please try again." |
| `23505` | Unique constraint | "This profile already exists. Please try again." |

---

## Expected Console Logs After Fix

### Successful Profile Load
```
[AuthContext] Loading profile for user: e148a9fe-...
[ensureProfile] enter { userId: 'e148...', userEmail: 'test@example.com', hasMetadata: true }
[ensureProfile] Querying profiles table...
[ensureProfile] select result { hasData: true, displayName: 'TestUser', error: null }
[ensureProfile] existing profile found: e148a9fe-...
[AuthContext] Profile loaded successfully: { id: 'e148...', display_name: 'TestUser' }
[AuthContext] Profile loading complete, cancelled: false
```

### New User Profile Creation
```
[ensureProfile] select result { hasData: false, error: null }
[ensureProfile] No profile found, creating: { id: '...', email: 'new@example.com', display_name: 'new' }
[ensureProfile] insert result { hasData: true, insertedId: '...', error: null }
```

### Friends Page After Fix
```
[Friends] Render state: { userId: 'e148...', hasProfile: true, profileLoading: false, willCallUseFriends: true }
[useFriends] Starting initial fetch for userId: e148a9fe...
[useFriends] Setting up realtime channel: friendships-e148a9fe-...
[useFriends] Fetch complete: { acceptedFriends: 0, pendingReceived: 0, pendingSent: 0 }
```

---

## Verification Checklist

### Profile Save
- [ ] Login as new user (no profile row)
- [ ] Open Profile Edit modal
- [ ] Enter display name, click Save
- [ ] Console shows `[ensureProfile] insert result { hasData: true ... }`
- [ ] Toast shows "Profile saved successfully"
- [ ] Header updates with new display name

### Profile Loading
- [ ] Refresh page after login
- [ ] Console shows `[AuthContext] Profile loading complete, cancelled: false`
- [ ] `profileLoading` becomes `false`
- [ ] `hasProfile` becomes `true`

### Friends Page
- [ ] Navigate to Friends/Guild Roster
- [ ] Console shows `willCallUseFriends: true`
- [ ] Page loads (no infinite spinner)
- [ ] Console shows `[useFriends] Fetch complete: {...}`

---

## Summary

The profile pipeline was broken by two issues:

1. **Missing required field**: The upsert didn't include `email`, causing INSERT to fail for new users
2. **State stuck**: The `finally` block was conditional on `!cancelled`, causing `profileLoading` to stay `true`

Both fixes are minimal and targeted. The enhanced logging will help debug any future issues.

---

*Rose – 2025-12-05 R12*
