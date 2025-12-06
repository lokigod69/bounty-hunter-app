# V1 Status Report – Rose (Round 13)
**Date**: 2025-12-05
**Status**: Friends Stability + StrictMode Fix + Profile Hydration

---

## Session Summary

Fixed critical issues preventing Friends/Partner pages from working:

1. **Fixed useFriends double-subscribe crash** - StrictMode-safe realtime subscriptions
2. **Made Friends UI render gracefully** - Added error handling and logging
3. **Fixed ProfileEditModal hydration** - Form now properly shows current profile data when opened
4. **Wired partner visuals to live profile** - Added logging for avatar debugging

---

## Bug #1: useFriends Double-Subscribe Crash

### The Problem

In React StrictMode, effects run twice in development. The useFriends hook was:
1. Creating a channel with name `friendships-{userId}`
2. Calling `.subscribe()` on it
3. Effect runs again (StrictMode)
4. Creating channel with SAME name
5. Supabase throws: `"tried to subscribe multiple times. 'subscribe' can only be called a single time per channel instance"`

This uncaught error was crashing React and blanking the Friends page.

### The Fix

```typescript
// R13: Clean up any existing channel BEFORE creating a new one
if (channelRef.current) {
  console.log('[useFriends] Cleaning up existing channel before re-subscribing');
  try {
    channelRef.current.unsubscribe();
  } catch (e) {
    console.warn('[useFriends] Error unsubscribing old channel:', e);
  }
  channelRef.current = null;
}

// R13: Use unique channel name with timestamp to avoid StrictMode conflicts
const channelName = `friendships-${userId}-${Date.now()}`;

// R13: Wrap subscription in try-catch to prevent crashes
try {
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { ... }, handleChange)
    .subscribe((status) => {
      console.log(`[useFriends] Channel ${channelName} status:`, status);
    });
  channelRef.current = channel;
} catch (err) {
  console.error('[useFriends] Failed to subscribe:', err);
  channelRef.current = null;
  // UI still works with initial fetch results
}
```

Key changes:
- Clean up existing channel before creating a new one
- Use timestamp in channel name to ensure uniqueness
- Wrap subscription in try-catch to prevent crashes
- Log channel status for debugging

---

## Bug #2: Friends UI Blank Screen

### The Problem

Even when `useFriends` fetched data (`acceptedFriends: 1`), the UI was blank because the subscription error was uncaught and crashed React.

### The Fix

1. Wrapped subscription in try-catch (see above)
2. Added logging to verify data is available:

```typescript
// R13: Log render data for debugging blank screen issues
console.log('[Friends] Render data:', {
  friendsCount: friends?.length ?? 0,
  pendingCount: pendingRequests?.length ?? 0,
  sentCount: sentRequests?.length ?? 0,
  loading,
  error: error || null,
});
```

---

## Bug #3: ProfileEditModal Not Hydrated

### The Problem

After saving a profile, reopening Edit Profile showed:
- Empty display name field
- No avatar preview

### The Fix

```typescript
// R13: Hydrate form state from profile when modal opens
useEffect(() => {
  if (!isOpen) return; // Only hydrate when modal is open

  console.log('[ProfileEditModal] Hydrating from profile:', {
    displayName: profile?.display_name,
    avatarUrl: profile?.avatar_url?.substring(0, 50),
  });

  setDisplayName(profile?.display_name || '');
  setAvatarPreview(profile?.avatar_url || null);
  setAvatarFile(null); // Reset file selection when reopening
}, [isOpen, profile]);
```

Key change: Only hydrate when `isOpen` is true, and reset `avatarFile` to null when reopening.

---

## Bug #4: Partner Visuals Using Stale Data

### The Fix

Added logging to debug avatar issues in couple mode:

```typescript
// R13: Log partner render for debugging avatar issues
console.log('[Friends] Partner render:', {
  meDisplayName: profile?.display_name,
  meAvatarUrl: profile?.avatar_url,
  partnerDisplayName: partnerState.partnerProfile?.display_name,
  partnerAvatarUrl: partnerState.partnerProfile?.avatar_url,
});
```

The "Your avatar" in partner view now uses `myAvatarUrl` which is derived from `profile` (same as header).

---

## Files Modified

| File | Changes |
|------|---------|
| `src/hooks/useFriends.ts` | StrictMode-safe subscription, try-catch, unique channel names |
| `src/pages/Friends.tsx` | Added render data logging, partner render logging |
| `src/components/ProfileEditModal.tsx` | Fixed hydration effect, added logging |

---

## Expected Console Logs After Fix

### useFriends Subscription
```
[useFriends] Starting initial fetch for userId: e148a9fe...
[useFriends] Setting up realtime channel: friendships-e148a9fe-...-1733424000000
[useFriends] Channel friendships-e148a9fe-...-1733424000000 status: SUBSCRIBED
[useFriends] Fetch complete: { acceptedFriends: 1, pendingReceived: 0, pendingSent: 0 }
```

### Friends Page Render
```
[Friends] Render state: { userId: 'e148a9fe', hasProfile: true, profileLoading: false, willCallUseFriends: true }
[Friends] Render data: { friendsCount: 1, pendingCount: 0, sentCount: 0, loading: false, error: null }
```

### ProfileEditModal Hydration
```
[ProfileEditModal] Hydrating from profile: { displayName: 'TestUser', avatarUrl: 'https://...' }
```

### Partner Render (Couple Mode)
```
[Friends] Partner render: { meDisplayName: 'You', meAvatarUrl: 'https://...', partnerDisplayName: 'Partner', partnerAvatarUrl: 'https://...' }
```

---

## How to Test

### 1. Profile Persistence
- [ ] Login and open Edit Profile
- [ ] Change display name and avatar
- [ ] Save - should show success toast
- [ ] Header should update immediately
- [ ] Refresh page - header still shows updated values
- [ ] Reopen Edit Profile - fields should be populated with current values

### 2. Friends/Partner Page
- [ ] Navigate to Friends/Guild Roster
- [ ] **No "tried to subscribe multiple times" error**
- [ ] **No blank screen**
- [ ] Console shows `[Friends] Render data: { friendsCount: ... }`
- [ ] If you have friends, they should be displayed
- [ ] If no friends, empty state should show (not blank)

### 3. Partner Avatars (Couple Mode)
- [ ] Switch to Couple mode in Edit Profile
- [ ] Navigate to Your Partner page
- [ ] "You" avatar should match header avatar
- [ ] Partner avatar should show their profile avatar (or placeholder)
- [ ] After changing your avatar, "You" should update

### 4. StrictMode Resilience (Dev Only)
- [ ] In development mode, no double-subscribe errors
- [ ] Page works even if subscription fails (graceful degradation)

---

## Summary

The main issue was that React StrictMode was causing useFriends to subscribe twice to the same Supabase channel, which threw an uncaught error that crashed React and blanked the Friends page.

The fix:
1. Clean up existing channel before creating new one
2. Use unique channel names with timestamp
3. Wrap subscription in try-catch
4. UI renders even if realtime fails

Additionally:
- ProfileEditModal now properly hydrates from profile when opened
- Added comprehensive logging for debugging

---

*Rose – 2025-12-05 R13*
