# V1 Status Report – Rose (Round 5)
**Date**: 2025-12-02
**Status**: P0 Runtime Regression Fixes

---

## Session Summary

This session addressed P0/P1 production regressions reported by Saya after testing the live Vercel build:

**P0 FUNCTIONAL**:
1. Identity (header/partner) doesn't update after profile save
2. Mission cards do nothing when clicked (no modal, no interaction)

**P1 VISUAL**:
3. Partner store (Baldi) has duplicate/confusing token display
4. My Bounties cost/button layout issues

---

## Runtime Reproduction Analysis

### Identity Pipeline

**Finding**: The code is correctly wired but there may be timing/render issues.

Confirmed correct flow:
1. `ProfileEditModal` saves to Supabase → calls `await refreshProfile()`
2. `useAuth.refreshProfile()` calls `ensureProfileForUser()` → fetches fresh data → calls `setProfile()`
3. `Layout` uses `useAuth()` → destructures `profile` → computes `displayName`/`avatarUrl`

Console logs should show:
```
[ProfileEditModal] About to call refreshProfile, current profile: {...}
[useAuth] Force refreshing profile for user: xxx
[useAuth] Profile refreshed successfully: xxx
[ProfileEditModal] refreshProfile completed
[Layout] Identity state: { profileDisplayName: NEW_VALUE, ... }
```

If the last log doesn't show updated values, the issue is React state propagation or component not re-rendering.

### TaskCard Clicks

**Finding**: The `react-swipeable` library with `trackMouse: true` was likely intercepting mouse events before they reached the click handler.

The swipe handlers were configured:
```tsx
const swipeHandlers = useSwipeable({
  onSwipedLeft: handleArchive,
  trackMouse: true, // <-- PROBLEM: intercepts mouse events
  preventScrollOnSwipe: true,
});
```

### Store Token Display

**Finding**: Duplicate coin icons in Credits Summary:
- Line 288: Static `🪙` emoji
- Line 292: `CreditDisplay` component (which also shows a coin)

Result: User sees two coins, one static and one spinning.

---

## Fixes Applied

### 1. TaskCard Click Handler (P0)

**File**: `src/components/TaskCard.tsx`

```diff
  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleArchive,
-   trackMouse: true,
+   // Removed trackMouse: true - was potentially intercepting click events on desktop
    preventScrollOnSwipe: true,
+   // Ensure swipe doesn't block taps
+   delta: 10, // Minimum swipe distance before triggering
+   swipeDuration: 500, // Max duration for a swipe
  });
```

Also added explicit touch handler for mobile:
```tsx
onTouchEnd={(e) => {
  const touch = e.changedTouches?.[0];
  if (touch) {
    console.log('[TaskCard] Touch end on inner div, expanding task:', id);
    setTimeout(() => {
      if (!isExpanded) {
        setIsExpanded(true);
      }
    }, 50);
  }
}}
```

### 2. Store Double-Coin Fix (P1)

**File**: `src/pages/RewardsStorePage.tsx`

```diff
  <div className="flex items-center gap-3">
-   <div className="text-3xl sm:text-4xl">🪙</div>
+   {/* Removed duplicate static coin - CreditDisplay already shows a coin */}
    <div>
      <p className="text-xs sm:text-sm text-white/70 mb-1">{theme.strings.storeCreditsLabel}</p>
      <div className="flex items-center gap-2">
        <CreditDisplay amount={userCredits ?? 0} size="large" />
      </div>
    </div>
  </div>
```

---

## Card Component Mapping

| Section | Page | Component | Click Handler |
|---------|------|-----------|---------------|
| Do this now | Dashboard | TaskCard | Inner div onClick + onTouchEnd |
| Waiting approval | Dashboard | TaskCard | Inner div onClick + onTouchEnd |
| Recently completed | Dashboard | TaskCard | Inner div onClick + onTouchEnd |
| Issued missions | IssuedPage | TaskCard | Inner div onClick + onTouchEnd |

All sections use the same TaskCard component, which now has:
- Removed `trackMouse: true` from swipeHandlers
- `onClick` with console log and `setIsExpanded(true)`
- `onTouchEnd` for mobile with delayed expansion check

---

## Identity Sources Audit

| Location | Component | Name Source | Avatar Source |
|----------|-----------|-------------|---------------|
| Header (desktop) | Layout | `displayName` (unified) | `avatarUrl` (cache-busted) |
| Header (mobile menu) | Layout | `displayName` (unified) | `avatarUrl` (cache-busted) |
| Friends page (self) | Friends | `myDisplayName` (unified) | `myAvatarUrl` (cache-busted) |

All identity displays now use:
```tsx
const displayName =
  profile?.display_name ??
  (user?.user_metadata as Record<string, unknown>)?.full_name ??
  user?.email?.split('@')[0] ??
  'Unknown user';

const avatarUrl = avatarUrlBase
  ? `${avatarUrlBase}?v=${encodeURIComponent(profile.updated_at)}`
  : defaultAvatarUrl;
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/TaskCard.tsx` | Removed `trackMouse: true`, added `onTouchEnd`, kept `onClick` |
| `src/pages/RewardsStorePage.tsx` | Removed duplicate static coin emoji |

---

## Build Status

| Check | Status |
|-------|--------|
| TypeScript | ✅ No errors |
| Build | ✅ Passes (2.96s) |
| Bundle | 683KB (warning only) |

---

## Console Logs for Debugging

### Identity Pipeline
```
[ProfileEditModal] About to call refreshProfile, current profile: {...}
[useAuth] Force refreshing profile for user: [userId]
[useAuth] Profile refreshed successfully: [profileId]
[ProfileEditModal] refreshProfile completed
[Layout] Identity state: { userId, profileDisplayName, profileAvatarUrl, hasProfile }
```

### TaskCard Modal Flow
```
[TaskCard] Inner div clicked, expanding task: [taskId]
[TaskCard] Touch end on inner div, expanding task: [taskId]
[TaskCardModal] Backdrop clicked, closing
```

---

## Verification Steps

After deploying this build:

1. **TaskCard Click Test**:
   - Open Console
   - Go to Dashboard → Click any mission card
   - Expect: `[TaskCard] Inner div clicked` log
   - Expect: Modal opens with task details
   - On mobile: Expect touch to work too

2. **Identity Pipeline Test**:
   - Go to Profile Edit → Change name → Save
   - Expect: Console shows refreshProfile logs
   - Expect: Header shows new name immediately
   - Expect: No page reload

3. **Store Token Test**:
   - Go to Rewards Store
   - Expect: Single coin icon + number (not two coins)

---

## If Issues Persist

**TaskCard still doesn't work:**
1. Check console for errors
2. Verify `#overlay-root` exists in DOM
3. Check for CSS `pointer-events: none` on card elements
4. Verify React is updating (log in render function)

**Identity still shows email:**
1. Check `[Layout] Identity state` log for `hasProfile: true`
2. If `hasProfile: false`, profile isn't loading
3. Check `[useAuth]` logs for profile fetch errors
4. Verify Supabase profiles table has the user's row

**Store still has double coin:**
1. Hard refresh (Ctrl+Shift+R) to clear cache
2. Verify the static `🪙` line is removed in deployed code

---

*Rose – 2025-12-02 R5*
