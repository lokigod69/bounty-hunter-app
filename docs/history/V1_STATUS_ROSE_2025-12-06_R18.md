# V1 Status Report – Rose (Round 18)
**Date**: 2025-12-06
**Status**: Profile Pipeline Fixed - React Strict Mode Race Condition

---

## Session Summary

Found and fixed the root cause of the profile not persisting after reload: a race condition in AuthContext caused by React 18 Strict Mode's double-mount behavior.

**The Bug**: The `ensuringUserIdRef` guard was preventing the second effect run from loading the profile, while the first run's results were discarded.

**The Fix**: Clear the ref in the effect cleanup function.

---

## Root Cause Analysis

### The Problem

In React 18 Strict Mode (development), effects run twice to help detect side effects:

1. **Mount**: Effect runs, `loadProfile()` starts, sets `ensuringUserIdRef.current = session.user.id`
2. **Simulated Unmount**: Cleanup runs, sets `cancelled = true` (but ref was NOT cleared)
3. **Remount**: Effect runs again, guard check: `ensuringUserIdRef.current === session.user.id` → **TRUE** → **returns early!**

The result:
- Run 1's async result is discarded (cancelled = true)
- Run 2 never starts (guard thinks load is in progress)
- **profile is never set!**

### The Code Path (Before Fix)

```typescript
// Effect 2: Ensure profile when session changes
useEffect(() => {
  // ... session null check ...

  // THIS GUARD WAS THE PROBLEM
  if (ensuringUserIdRef.current === session.user.id) {
    return; // Run 2 exits here because ref is still set from Run 1
  }

  let cancelled = false;

  async function loadProfile() {
    ensuringUserIdRef.current = session.user.id; // Run 1 sets this
    // ... fetch profile ...
    if (cancelled) return; // Run 1's result is discarded here
    setProfile(profileData); // Never reached by Run 1, Run 2 never gets here
  }

  loadProfile();

  return () => {
    cancelled = true;
    // BUG: ref was NOT cleared here!
  };
}, [session]);
```

### Timeline of the Bug

| Step | Action | `ensuringUserIdRef` | `cancelled` | Result |
|------|--------|---------------------|-------------|--------|
| 1 | Effect runs (mount) | `null` | `false` | Passes guard, starts loadProfile |
| 2 | loadProfile sets ref | `'e148...'` | `false` | Fetch in progress |
| 3 | Cleanup runs | `'e148...'` | `true` | Ref NOT cleared! |
| 4 | Effect runs (remount) | `'e148...'` | `false` (new) | **Guard returns early!** |
| 5 | Run 1's fetch completes | `'e148...'` | `true` | **Result discarded!** |
| 6 | Run 1's finally | `null` | `true` | Ref cleared, but too late |
| 7 | **Result**: `profile` is never set | | | **Bug manifests** |

---

## The Fix

Clear the ref in the cleanup function so the remount can proceed:

### Before (Buggy)

```typescript
return () => {
  cancelled = true;
};
```

### After (Fixed)

```typescript
return () => {
  cancelled = true;
  // R18 FIX: Clear the ref in cleanup so that if the effect re-runs
  // (due to React Strict Mode double-mount or actual session changes),
  // the guard doesn't incorrectly block the new run.
  // Without this, Strict Mode causes: run1 sets ref → cleanup → run2 sees ref → returns early → profile never loads
  ensuringUserIdRef.current = null;
};
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/context/AuthContext.tsx` | Added `ensuringUserIdRef.current = null` in effect cleanup (line 158) |

---

## Verification: Identity Pipeline Audit

### Layout.tsx - CORRECT
- Uses `const { user, profile } = useAuth()` from shared context
- Computes `displayName` directly from `profile?.display_name` on every render
- Computes `avatarUrlBase` directly from `profile?.avatar_url` on every render
- No local state caching identity values

### Friends.tsx - CORRECT
- Uses `const { user, profile, profileLoading } = useAuth()` from shared context
- Computes `myDisplayName` directly from `profile?.display_name`
- Computes `myAvatarUrlBase` directly from `profile?.avatar_url`
- Partner data comes from `usePartnerState` (direct DB query)

### AuthContext.tsx - NOW FIXED
- Single provider at App root
- `profile` state is set only by `loadProfile()` and `refreshProfile()`
- Effect cleanup now properly resets the guard ref

---

## How to Test ("How to Break It")

### Test 1: Reload Persistence
1. Login with test account
2. Open Edit Profile → Change name + avatar → Save
3. Confirm header shows new values
4. **Hard reload** (Ctrl+Shift+R)
5. **Expected**: Header still shows new name + avatar
6. Check console: `[AuthContext] Profile loaded successfully` should show correct `avatar_url`

### Test 2: Strict Mode Double-Mount
1. In development mode (npm run dev)
2. Check console for TWO `[AuthContext] loadProfile start` logs per reload
3. Both should complete, and only the second one's result should be used
4. **Expected**: Profile loads correctly despite double-mount

### Test 3: Navigation Stability
1. After changing profile, navigate: Dashboard → Friends → Archive → back
2. **Expected**: Avatar/name never reverts to placeholder

### Test 4: Logout/Login Cycle
1. Save profile with new avatar
2. Sign out completely
3. Sign back in
4. **Expected**: Profile restored with saved avatar

---

## Console Log Expectations (After Fix)

### On Page Load (with Strict Mode double-mount):
```
[AuthContext] loadProfile start { userId: 'e148a9fe-...', userEmail: '...' }
[ensureProfile:...] enter { userId: 'e148a9fe', ... }
[AuthContext] Profile load cancelled, ignoring result  // First run cancelled
[AuthContext] loadProfile start { userId: 'e148a9fe-...', userEmail: '...' }  // Second run starts
[ensureProfile:...] enter { userId: 'e148a9fe', ... }
[ensureProfile:...] select result { hasData: true, avatarUrl: 'https://...', ... }
[ensureProfile:...] RETURNING EXISTING profile (no modification) { ... }
[AuthContext] Profile loaded successfully { avatar_url: 'https://...', ... }  // Second run succeeds
[Layout] RENDER identity { displayName: 'TestR17_2', avatarUrlBase: 'https://...', ... }
```

The key is that the **second run completes successfully** and sets the profile.

---

## Why This Bug Was Hard to Find

1. **Only in Development**: React Strict Mode only runs in dev, not production
2. **Intermittent**: Depends on timing of async operations
3. **Logs looked correct**: Each individual log showed correct data, but the *sequence* was wrong
4. **DB was correct**: ProfileDebugger confirmed DB had right data, so bug seemed elsewhere

---

## Summary

The profile pipeline is now **boringly deterministic**:

1. On reload, AuthContext Effect 2 runs (possibly twice in Strict Mode)
2. Cleanup clears the guard ref, allowing the remount to proceed
3. `ensureProfileForUser` fetches the correct profile from DB
4. `setProfile(profileData)` updates React state
5. Layout re-renders with correct `profile?.display_name` and `profile?.avatar_url`
6. Header and Friends show the saved values

No local state caching. No fallback overrides. Just the canonical profile from AuthContext.

---

*Rose – 2025-12-06 R18*
