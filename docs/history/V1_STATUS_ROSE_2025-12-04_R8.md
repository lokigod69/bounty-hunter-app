# V1 Status Report – Rose (Round 8)
**Date**: 2025-12-04
**Status**: P0 UX Fixes Applied

---

## Session Summary

Fixed critical UX bugs identified from live testing:
1. TaskCard double-click to open (modal not opening on first click)
2. Dashboard/Issued sections flickering on click
3. Friends page blank with "subscribe multiple times" error

---

## Root Causes Found & Fixed

### 1. TaskCard Double-Click Bug

**Live Behavior**:
- First click: No modal. Instead, "Waiting for approval" and "Recently completed" sections expanded/flickered.
- Second click: Modal opened correctly.

**Root Cause**: Dashboard and IssuedPage had **conditional rendering based on `activeLayer`**:

```tsx
{activeLayer === 'modal' ? (
  <PageContainer>...entire dashboard...</PageContainer>
) : (
  <PullToRefresh>
    <PageContainer>...entire dashboard duplicated...</PageContainer>
  </PullToRefresh>
)}
```

When TaskCard clicked → `setIsExpanded(true)` → `openModal()` → `activeLayer` changed → **React switched branches** → TaskCard unmounted and remounted → `isExpanded` state reset to `false`.

**Fix**: Single render path with `isPullable` prop to conditionally disable PullToRefresh gesture:

```tsx
// R8 FIX: Single render path - no conditional tree swap based on activeLayer
const isPullToRefreshDisabled = activeLayer === 'modal';

return (
  <PullToRefresh onRefresh={handleRefresh} isPullable={!isPullToRefreshDisabled}>
    <PageContainer>
      ...single copy of dashboard content...
    </PageContainer>
  </PullToRefresh>
);
```

### 2. Friends Page Blank + Supabase Subscribe Error

**Console Error**:
```
tried to subscribe multiple times. 'subscribe' can only be called a single time per channel instance
```

**Root Cause**: `useFriends` hook had broken subscription pattern:

```tsx
// OLD: Creates channel and subscribes on every call
const setupRealtimeSubscription = useCallback(() => {
  supabase
    .channel('friendships-channel')  // Reuses existing channel
    .on('postgres_changes', {...}, handler)
    .subscribe();  // Error: already subscribed!
}, [userId]);

// Cleanup was too aggressive
return () => {
  supabase.removeAllChannels();  // Removes ALL hooks' channels!
};
```

**Fix**: Proper channel lifecycle management:

```tsx
// R8 FIX: Create unique channel, track with ref, cleanup only this channel
const channelRef = useRef<RealtimeChannel | null>(null);

useEffect(() => {
  if (!userId) return;

  fetchFriendships(userId);

  const channelName = `friendships-${userId}`;  // Unique per user
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', {...}, () => fetchFriendships(userId))
    .subscribe();

  channelRef.current = channel;

  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);  // Only this channel
      channelRef.current = null;
    }
  };
}, [userId, fetchFriendships]);
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Removed conditional tree swap, use single render path with `isPullable` |
| `src/pages/IssuedPage.tsx` | Same fix - single render path |
| `src/hooks/useFriends.ts` | Fixed Supabase channel subscription lifecycle |

---

## Build Status

| Check | Status |
|-------|--------|
| TypeScript | ✅ No errors |
| Build | ✅ Passes (3.07s) |
| Bundle | 675KB (warning only) |

---

## Verification Checklist

### Dashboard TaskCard (Single Click)
- [ ] Go to Dashboard
- [ ] Click any mission card ONCE
- [ ] Modal opens immediately
- [ ] "Waiting for approval" and "Recently completed" sections do NOT flicker
- [ ] Close modal → sections remain stable

### Issued Page TaskCard (Single Click)
- [ ] Go to Missions/Issued tab
- [ ] Click any mission card ONCE
- [ ] Modal opens immediately
- [ ] No layout flicker

### Friends/Guild Page
- [ ] Go to Friends tab
- [ ] No console error "subscribe multiple times"
- [ ] Page loads with friends list (or empty state)
- [ ] Console shows: `[Friends] Current user identity: { hasProfile: true, ... }`

### Identity Surfaces
- [ ] Header shows correct display name and avatar
- [ ] Profile Edit → change name → Save → Header updates immediately

---

## Technical Notes

### Why Conditional Tree Swap Caused Double-Click

React's reconciliation algorithm:
1. When parent switches from `<A>` branch to `<B>` branch, all children of `<A>` are unmounted
2. TaskCard's `isExpanded` state lives in the component instance
3. Unmount destroys the instance → state reset to initial value (`false`)
4. New instance mounts with `isExpanded: false` → modal not shown

### Why PullToRefresh `isPullable` Works

The `isPullable` prop only controls whether the pull gesture is enabled, without changing the component tree structure. TaskCard instances remain mounted, preserving their state.

### Why Supabase Channel Names Must Be Unique

Supabase's realtime client reuses channel instances by name. If two effects both call `supabase.channel('same-name').subscribe()`, the second call fails because the channel is already subscribed.

Using `friendships-${userId}` ensures each user gets their own channel instance.

---

## Combined R7 + R8 Fix Summary

| Round | Issue | Root Cause | Fix |
|-------|-------|------------|-----|
| R7 | Profile not reaching Layout | useAuth not using React Context | Created AuthContext with shared state |
| R7 | Modal opens then closes | Other modals calling `clearLayer()` on mount | Changed useEffect pattern |
| R8 | TaskCard double-click | Conditional tree swap unmounts TaskCard | Single render path with `isPullable` |
| R8 | Friends page subscribe error | Multiple subscribe calls on same channel | Unique channel name + proper cleanup |

---

*Rose – 2025-12-04 R8*
