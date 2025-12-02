# Mobile Modal/Hamburger Bug – Diagnostic Analysis Report

**Date:** 2025-01-28  
**Status:** Analysis Only (No Code Changes)  
**Target:** iPhone 16 Pro, Safari/Chrome mobile viewport

---

## Executive Summary

The mobile UI exhibits two critical bugs:
1. **Contract creation modal appears janky/half-rendered** and vanishes/reappears on scroll
2. **Header + hamburger overlap modal** with dead click areas after modal interaction

Root causes identified:
- **Multiple conflicting scroll lock mechanisms**
- **TaskForm renders directly (no portal)** while other modals use portals
- **State desynchronization** between UIContext and local component state
- **Scroll/resize handlers** potentially interfering with modal state
- **Stacking context conflicts** due to non-portaled modal rendering

---

## 1. State Map: Where Overlay/Menu State Lives

### 1.1 Mobile Menu State

**Location:** `src/context/UIContext.tsx`

**State Variables:**
- `isMobileMenuOpen: boolean` (line 29)
- `activeLayer: ActiveLayer` (line 30) - `'none' | 'menu' | 'modal' | 'critical'`

**State Changes:**
- **Opened by:**
  - `openMenu()` (line 76-85) - Sets `isMobileMenuOpen = true`, `activeLayer = 'menu'`
  - Called from: `Layout.tsx` hamburger button (line 225)
- **Closed by:**
  - `closeMobileMenu()` (line 59-65) - Sets `isMobileMenuOpen = false`, `activeLayer = 'none'`
  - `forceCloseMobileMenu()` (line 68-73) - Same as above
  - `clearLayer()` (line 107-110) - Resets both states
  - Called from: Layout backdrop click (line 244), Layout close button (line 256), Layout route change effect (line 77)

**Route Change Effect:** `Layout.tsx` lines 75-80
```typescript
useEffect(() => {
  if (previousPathname.current !== location.pathname && isMobileMenuOpen) {
    clearLayer(); // Closes menu on route change
    previousPathname.current = location.pathname;
  }
}, [location.pathname, isMobileMenuOpen, clearLayer]);
```

**Scroll Lock:** Managed by `UIContext` via `lockScroll()`/`unlockScroll()` based on `activeLayer` (lines 33-46)

---

### 1.2 TaskForm (Contract Creation) Modal State

**Location:** `src/pages/IssuedPage.tsx`

**State Variable:**
- `isTaskFormOpen: boolean` (line 78) - **Local component state**

**State Changes:**
- **Opened by:**
  - `setIsTaskFormOpen(true)` - Called from `handleCreateNewContract()` (line 267, 271)
  - Has 50ms delay if mobile menu is open (line 266-268)
- **Closed by:**
  - `setIsTaskFormOpen(false)` - Called from `onClose` handler (line 327)
  - Also calls `forceCloseMobileMenu()` if menu is open (line 329-331)

**UIContext Coordination:** `TaskForm.tsx` calls `openModal()` in `useEffect` (line 63) and `clearLayer()` on unmount (line 65)

**Critical Finding:** TaskForm does **NOT** use `createPortal` - it renders directly in the DOM tree under `IssuedPage` → `PageContainer` → `PullToRefresh`.

---

### 1.3 TaskCard Expanded Modal State

**Location:** `src/components/TaskCard.tsx`

**State Variables:**
- `isExpanded: boolean` (line 118) - **Local component state**
- `showProofModal: boolean` (line 116) - **Local component state**

**State Changes:**
- **Opened by:** `setIsExpanded(true)` - When card is clicked
- **Closed by:** `handleClose()` (line 153-160) - Sets `isAnimatingOut`, then `isExpanded = false` after 300ms delay

**UIContext Coordination:** Calls `openModal()` when `isExpanded` becomes true (line 165)

**Portal Usage:** Uses `createPortal(..., getOverlayRoot())` (line 456, 582, 585)

**Conflicting Scroll Lock:** TaskCard has its own `useEffect` that directly sets `document.body.style.overflow` (lines 127-136), which conflicts with UIContext's scroll lock system.

---

### 1.4 ProofModal State

**Location:** `src/components/ProofModal.tsx`

**State:** Controlled by parent component (`TaskCard.showProofModal`)

**Portal Usage:** Uses `createPortal(..., getOverlayRoot())` via TaskCard (line 585)

**UIContext Coordination:** None - ProofModal does not call `openModal()` or coordinate with UIContext.

---

## 2. DOM/Overlay Map: Stacking Contexts & Rendering

### 2.1 Portal Structure

**Overlay Root:** `index.html` line 18
```html
<div id="overlay-root"></div>
```

**Components Using Portal:**
- ✅ TaskCard expanded modal → `getOverlayRoot()`
- ✅ ProofModal → `getOverlayRoot()` (via TaskCard)
- ✅ ConfirmDeleteModal → `getOverlayRoot()`
- ✅ All other modals → `getOverlayRoot()`

**Components NOT Using Portal:**
- ❌ **TaskForm** → Renders directly in `IssuedPage` DOM tree
- ❌ **Mobile Menu** → Renders directly in `Layout` DOM tree

### 2.2 Z-Index Hierarchy (from `src/index.css`)

```css
--z-header: 30;
--z-mobile-menu: 35;
--z-mobile-menu-close: 45;
--z-fab: 50;
--z-modal-backdrop: 10000;
--z-modal-content: 10100;
--z-modal-controls: 10200;
--z-critical-overlay: 99000;
```

### 2.3 Stacking Context Analysis

**Header:** `Layout.tsx` line 134
- `position: sticky`
- `z-header` (30)
- Inside `<div className="h-screen flex flex-col bg-indigo-950">` (line 130)

**Mobile Menu:** `Layout.tsx` line 240-363
- `position: fixed`
- `z-mobile-menu` (35)
- Renders directly in Layout (no portal)
- **Nested divs:** Outer backdrop div (line 240) → Menu content div (line 248) → Inner scrollable div (line 263)

**TaskForm Modal:** `TaskForm.tsx` line 195-408
- `position: fixed`
- `z-modal-backdrop` (10000)
- **Renders directly in IssuedPage DOM tree** (no portal)
- Inside: `IssuedPage` → `PullToRefresh` → `PageContainer` → conditional render

**TaskCard Modal:** `TaskCard.tsx` line 456-583
- `position: fixed`
- `z-modal-backdrop` (10000)
- **Portals to `overlay-root`** (line 582)

### 2.4 Stacking Context Problem

**Hypothesis:** TaskForm renders inside `PullToRefresh` → `PageContainer`, which may have CSS properties (`transform`, `filter`, `backdrop-filter`) that create a new stacking context. Even though TaskForm has `z-index: 10000`, if its parent container creates a stacking context, the z-index comparison happens within that context, not globally.

**Evidence:**
- `glass-card` class uses `backdrop-filter: blur(10px)` (from CSS)
- `PageContainer` may have transforms/filters
- Header is `sticky` with `z-index: 30` but is outside the modal's stacking context
- On iOS, `position: sticky` elements can appear above `position: fixed` elements in different stacking contexts

---

## 3. Event Flow & Double-Firing Analysis

### 3.1 Current Logging

**UIContext:**
- `toggleMobileMenu()` logs current state (line 50)
- `closeMobileMenu()` logs (line 60)
- `openMenu()` logs current activeLayer and confirms menu opened (lines 77, 84)

**Layout:**
- Hamburger click logs (line 221)
- Backdrop click logs (line 243)
- Close button logs (line 255)
- State change effect logs (line 61)

**TaskForm:**
- Render logs (line 192)
- Backdrop click logs (line 198)
- Close button logs (line 206)

**TaskCard:**
- Backdrop click logs (line 460)

### 3.2 Potential Double-Firing Scenarios

**Scenario A: Hamburger Click**
1. User taps hamburger
2. `onClick` fires → `openMenu()` called
3. React's synthetic event system may also fire `onClick` from touch event
4. If `openMenu()` is called twice, state flips: `false → true → false`

**Scenario B: Modal Close with Route Change**
1. User closes TaskForm modal → `onClose()` called
2. `onClose()` sets `isTaskFormOpen = false`
3. If route changed, Layout's `useEffect` (line 75-80) may also fire
4. `clearLayer()` called → closes mobile menu if it was open
5. State desync: modal closed but menu state also affected

**Scenario C: Scroll/Resize Triggering Re-render**
1. User scrolls/pulls down
2. `PullToRefresh` wrapper may trigger re-render
3. Layout's scroll handler (line 94-103) updates `scrolled` state
4. If modal state is tied to any scroll-dependent logic, it may toggle

---

## 4. Scroll/Resize Impact Analysis

### 4.1 Scroll Handlers

**Layout.tsx** (lines 93-103):
```typescript
useEffect(() => {
  const handleScroll = () => {
    setScrolled(window.scrollY > 10);
  };
  window.addEventListener('scroll', handleScroll);
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}, []);
```
- Updates `scrolled` state for header styling
- Does NOT directly affect modal/menu state
- **BUT:** May cause Layout re-render, which could affect conditional rendering

**TaskCard.tsx** (lines 127-136):
```typescript
useEffect(() => {
  if (isExpanded) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
  return () => {
    document.body.style.overflow = '';
  };
}, [isExpanded]);
```
- **CONFLICTS with UIContext scroll lock**
- Directly manipulates `document.body.style.overflow`
- UIContext also manipulates body overflow via `lockScroll()`/`unlockScroll()`
- **This is a race condition:** Both systems try to control scroll lock

### 4.2 PullToRefresh Wrapper

**IssuedPage.tsx** (line 309):
```typescript
<PullToRefresh onRefresh={handleRefresh}>
  <PageContainer>
    {/* TaskForm conditionally rendered here */}
  </PageContainer>
</PullToRefresh>
```

**Potential Issues:**
- `PullToRefresh` may intercept touch/scroll events
- On iOS "pull down" gesture, it may trigger refresh logic
- If refresh causes re-render, TaskForm may unmount/remount
- This could explain "modal vanishes then reappears"

### 4.3 Resize/Orientation Handlers

**Not Found:** No explicit `resize` or `orientationchange` handlers detected in modal/menu code.

---

## 5. Hypotheses (Ranked by Likelihood)

### Hypothesis 1: TaskForm Not Using Portal + Stacking Context Conflict ⭐⭐⭐⭐⭐

**Likelihood:** Very High

**Root Cause:**
- TaskForm renders directly in `IssuedPage` → `PullToRefresh` → `PageContainer` DOM tree
- Parent containers may have CSS that creates stacking context (`backdrop-filter`, `transform`, etc.)
- Header (`z-index: 30`) is in a different stacking context (Layout's root)
- iOS Safari renders header visually above modal, but modal backdrop still catches pointer events

**Evidence:**
- TaskForm is the ONLY modal that doesn't use `createPortal`
- Other modals (TaskCard, ProofModal) work correctly because they portal to `overlay-root`
- User reports: "Header appears on top but clicks don't work" - classic stacking context symptom

**Files Affected:**
- `src/components/TaskForm.tsx` - Needs to use `createPortal(..., getOverlayRoot())`
- `src/pages/IssuedPage.tsx` - Conditional render should portal TaskForm

**Fix Complexity:** Low-Medium (change render location, ensure proper cleanup)

---

### Hypothesis 2: Conflicting Scroll Lock Mechanisms ⭐⭐⭐⭐

**Likelihood:** High

**Root Cause:**
- TaskCard has its own scroll lock effect (lines 127-136) that directly sets `document.body.style.overflow`
- UIContext also manages scroll lock via `lockScroll()`/`unlockScroll()` with reference counting
- When TaskCard modal opens, both systems try to lock scroll
- When closing, one may unlock before the other, causing scroll to re-enable prematurely
- On iOS, scroll re-enabling can cause layout shifts that make modal "vanish"

**Evidence:**
- TaskCard's scroll lock effect runs independently of UIContext
- UIContext's scroll lock is tied to `activeLayer`, not individual modal state
- User reports: "Pulling down makes modal vanish then reappear" - scroll lock conflict

**Files Affected:**
- `src/components/TaskCard.tsx` lines 127-136 - Remove direct scroll lock, rely on UIContext
- `src/context/UIContext.tsx` - Ensure scroll lock properly coordinates with all modals

**Fix Complexity:** Low (remove duplicate scroll lock, ensure UIContext handles all cases)

---

### Hypothesis 3: PullToRefresh Interfering with Modal ⭐⭐⭐

**Likelihood:** Medium

**Root Cause:**
- `PullToRefresh` wrapper around `PageContainer` intercepts touch/scroll events
- On iOS "pull down" gesture, it may trigger refresh logic or re-render
- TaskForm is rendered inside PullToRefresh, so pull gesture may affect it
- If PullToRefresh causes parent re-render, TaskForm may unmount/remount

**Evidence:**
- TaskForm is the only modal rendered inside PullToRefresh
- User reports: "Pulling down makes modal vanish then reappear"
- Other modals (TaskCard, ProofModal) portal outside PullToRefresh and work fine

**Files Affected:**
- `src/pages/IssuedPage.tsx` - Move TaskForm portal outside PullToRefresh, or disable PullToRefresh when modal is open

**Fix Complexity:** Medium (restructure render tree or add conditional logic)

---

### Hypothesis 4: State Desynchronization Between UIContext and Local State ⭐⭐

**Likelihood:** Medium-Low

**Root Cause:**
- TaskForm calls `openModal()` in `useEffect` (line 63) but doesn't check if already open
- If TaskForm re-renders while already open, `openModal()` may be called again
- UIContext's `activeLayer` may not match actual modal visibility
- Layout's route change effect (line 75-80) may close menu/modal unexpectedly

**Evidence:**
- TaskForm's `useEffect` dependencies include `openModal` and `clearLayer`, which are stable references but may cause re-runs
- No guard to prevent calling `openModal()` if modal is already open

**Files Affected:**
- `src/components/TaskForm.tsx` lines 62-67 - Add guard to prevent duplicate `openModal()` calls
- `src/pages/IssuedPage.tsx` - Ensure state synchronization

**Fix Complexity:** Low (add state guards)

---

### Hypothesis 5: iOS Safari Position Fixed + Transform Bug ⭐⭐

**Likelihood:** Low-Medium

**Root Cause:**
- iOS Safari has known bugs with `position: fixed` inside elements with `transform`/`filter`
- If any parent of TaskForm has `transform` or `filter`, `position: fixed` behaves as `position: absolute`
- This can cause modal to scroll with page or appear in wrong position
- Header (`position: sticky`) may appear above modal due to this bug

**Evidence:**
- User reports: "Modal appears janky/half-rendered"
- TaskForm doesn't portal, so it's subject to parent CSS
- `glass-card` uses `backdrop-filter` which can create stacking context

**Files Affected:**
- `src/components/TaskForm.tsx` - Portal to overlay-root (same as Hypothesis 1 fix)

**Fix Complexity:** Low (same as Hypothesis 1)

---

## 6. Recommended Investigation Steps (Before Fixing)

### Step 1: Verify DOM Structure in Browser DevTools

1. Open contract creation modal on mobile viewport
2. Inspect DOM and check:
   - Is TaskForm inside `#overlay-root`? (Should be NO currently)
   - What is the computed `z-index` of TaskForm backdrop?
   - What is the computed `z-index` of header?
   - Are there any parent elements with `transform`, `filter`, `backdrop-filter`?
   - Is `#overlay-root` a direct child of `<body>`?

### Step 2: Check Console Logs During Bug Reproduction

1. Reproduce the bug (open modal, tap X, observe header overlap)
2. Check console for:
   - Multiple `[TaskFormModal] Rendering modal` logs (indicates re-renders)
   - `[UIContext] openModal called` logs (check if called multiple times)
   - `[MobileMenu] State changed` logs (check if menu state flips unexpectedly)
   - Any errors or warnings

### Step 3: Test Scroll Lock Behavior

1. Open TaskForm modal
2. Check `document.body.style.overflow` in console (should be `'hidden'`)
3. Try to scroll page (should not scroll)
4. Close modal
5. Check `document.body.style.overflow` again (should be `''`)
6. If scroll re-enables before modal fully closes, that's the conflict

### Step 4: Test Portal vs Non-Portal Behavior

1. Temporarily modify TaskForm to use `createPortal(..., getOverlayRoot())`
2. Test if bug still occurs
3. If bug disappears, confirms Hypothesis 1

---

## 7. Suggested Fix Direction (NOT TO IMPLEMENT YET)

### Fix Priority 1: Portal TaskForm

**Change:** Make TaskForm use `createPortal` like other modals

**Files:**
- `src/components/TaskForm.tsx` - Wrap return in `createPortal(..., getOverlayRoot())`
- `src/pages/IssuedPage.tsx` - Keep conditional render, but TaskForm will portal out

**Expected Result:** TaskForm renders in same stacking context as other modals, header no longer overlaps

---

### Fix Priority 2: Remove Duplicate Scroll Lock

**Change:** Remove TaskCard's direct scroll lock, rely only on UIContext

**Files:**
- `src/components/TaskCard.tsx` lines 127-136 - Remove `useEffect` that sets `document.body.style.overflow`
- Ensure UIContext properly handles TaskCard modal scroll lock

**Expected Result:** Single source of truth for scroll lock, no conflicts

---

### Fix Priority 3: Disable PullToRefresh When Modal Open

**Change:** Conditionally disable PullToRefresh when `isTaskFormOpen === true`

**Files:**
- `src/pages/IssuedPage.tsx` - Wrap PullToRefresh with conditional, or pass `disabled` prop if supported

**Expected Result:** Pull gesture no longer interferes with modal

---

## 8. Files Requiring Attention (Summary)

1. **`src/components/TaskForm.tsx`**
   - Add `createPortal` wrapper
   - Add guard to prevent duplicate `openModal()` calls
   - Ensure proper cleanup on unmount

2. **`src/components/TaskCard.tsx`**
   - Remove duplicate scroll lock effect (lines 127-136)
   - Ensure UIContext handles scroll lock for expanded modal

3. **`src/pages/IssuedPage.tsx`**
   - Consider disabling PullToRefresh when modal is open
   - Verify TaskForm portal works correctly

4. **`src/context/UIContext.tsx`**
   - Ensure scroll lock properly coordinates with all modals
   - Consider adding guards to prevent duplicate `openModal()` calls

5. **`src/components/Layout.tsx`**
   - Verify route change effect doesn't interfere with modals
   - Consider making mobile menu also use portal (lower priority)

---

## 9. Testing Checklist (After Fixes)

1. ✅ Open contract creation modal → modal covers entire screen, header not visible
2. ✅ Tap X button → modal closes cleanly, no lingering overlay
3. ✅ Tap backdrop → modal closes cleanly
4. ✅ Pull down gesture → modal does NOT vanish/reappear
5. ✅ After closing modal → hamburger menu works normally
6. ✅ Open hamburger menu → menu stays open, doesn't auto-close
7. ✅ Open modal while menu open → menu closes, modal opens
8. ✅ Console logs show single state change per user action (no double-firing)

---

## Conclusion

The primary issue is **TaskForm not using a portal**, causing it to render in a different stacking context than other modals. This, combined with **conflicting scroll lock mechanisms** and **PullToRefresh interference**, creates the observed bugs.

The fix should be straightforward: portal TaskForm to `overlay-root` (like all other modals) and remove duplicate scroll lock logic. This aligns with the existing architecture and should resolve both the visual overlap and the scroll-related vanishing behavior.

