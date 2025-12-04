# V1 Live Test Script
**Target**: Verify identity pipeline and TaskCard modal flow with real data
**Updated**: 2025-12-02 R5 - Runtime Regression Fixes

---

## P0 PRIORITY CHECKS (MUST PASS BEFORE DEPLOY)

### P0-1: Identity Pipeline

**Test Steps**:
1. Open the app and login
2. Open DevTools Console (F12)
3. Look for `[Layout] Identity state:` log - verify:
   - `hasProfile: true`
   - `profileDisplayName` shows your display name (not null/undefined)
   - `profileAvatarUrl` shows URL if avatar was set

4. Open ProfileEditModal (click avatar in header/menu)
5. Change display name to something unique (e.g., "TestR5-[timestamp]")
6. Click Save
7. Watch console for:
   - `[ProfileEditModal] About to call refreshProfile`
   - `[useAuth] Force refreshing profile for user: ...`
   - `[useAuth] Profile refreshed successfully: ...`
   - `[ProfileEditModal] refreshProfile completed`
   - `[Layout] Identity state:` should show NEW display_name

**Pass Criteria**:
- [ ] Header immediately shows new name after save
- [ ] Mobile menu shows new name after save
- [ ] No page reload occurred (modal just closes)
- [ ] Console logs confirm complete refresh chain

---

### P0-2: TaskCard Click → Modal (Desktop)

**Test Steps**:
1. Go to Dashboard (/)
2. Ensure at least one task card is visible
3. Open DevTools Console (F12)
4. Click on any TaskCard

**Expected Console Output**:
```
[TaskCard] Inner div clicked, expanding task: [uuid]
```

**Pass Criteria**:
- [ ] Console log appears on click
- [ ] Expanded modal opens with task details
- [ ] Modal shows title, description, action buttons
- [ ] Clicking backdrop closes modal
- [ ] Clicking Close button closes modal

---

### P0-3: TaskCard Tap → Modal (Mobile)

**Test Steps**:
1. Go to Dashboard on mobile device or Chrome DevTools mobile emulation
2. Ensure at least one task card is visible
3. Open DevTools Console (F12)
4. TAP on any TaskCard

**Expected Console Output**:
```
[TaskCard] Touch end on inner div, expanding task: [uuid]
```

**Pass Criteria**:
- [ ] Console log appears on tap
- [ ] Modal opens (may have slight delay of ~50ms)
- [ ] Swiping left should still trigger archive (if applicable)

---

### P0-4: IssuedPage Card Interaction

**Test Steps**:
1. Go to IssuedPage (/issued)
2. Ensure at least one task card is visible (under "Missions you have created")
3. Click/tap on any TaskCard

**Pass Criteria**:
- [ ] Console log appears
- [ ] Modal opens showing Creator View
- [ ] If task is in "review" status, Approve/Reject buttons visible
- [ ] Edit/Delete available for pending tasks
- [ ] Modal closes properly

---

## Prerequisites

1. App running locally (`npm run dev`) or deployed to Vercel
2. At least one test account logged in
3. Browser DevTools Console open (F12)
4. At least one task created (for TaskCard tests)

---

## Test 1: Profile Identity Pipeline (Detailed)

### 1.1 Display Name Propagation

1. **Open ProfileEditModal**
   - Desktop: Click your avatar in header
   - Mobile: Open hamburger menu → Click profile section

2. **Edit Display Name**
   - Change display name to something unique (e.g., "TestUser-[timestamp]")
   - Click Save

3. **Verify Propagation**
   - [ ] Toast shows "Profile updated"
   - [ ] Modal closes (no page reload)
   - [ ] Header immediately shows new name
   - [ ] Refresh page → Name persists
   - [ ] Console shows `[Layout] Identity state:` with new display_name

### 1.2 Avatar Propagation

1. **Upload New Avatar** (if avatar upload is enabled)
   - Click avatar in ProfileEditModal
   - Select new image
   - Click Save

2. **Verify Propagation**
   - [ ] Header shows new avatar (no stale cached image)
   - [ ] Mobile menu shows new avatar
   - [ ] Friends page (Couple Mode) shows new avatar
   - [ ] Avatar URL in console includes `?v=` cache-buster param

---

## Test 2: TaskCard Click → Modal Flow (Detailed)

### 2.1 Dashboard (Mission Inbox)

1. **Open Dashboard** (/)

2. **Click Any TaskCard**
   - [ ] Console logs: `[TaskCard] Inner div clicked, expanding task: [id]`
   - [ ] Expanded modal appears with animation
   - [ ] Background is dimmed with backdrop

3. **Close Modal**
   - Click backdrop → [ ] Modal closes with animation
   - OR click Close button → [ ] Modal closes with animation
   - [ ] Console logs show proper cleanup

4. **Repeat for Different Task States**
   - [ ] Pending task
   - [ ] In Review task
   - [ ] Completed task

### 2.2 IssuedPage (My Missions)

1. **Open IssuedPage** (/issued)

2. **Click Any TaskCard**
   - [ ] Console logs: `[TaskCard] Inner div clicked, expanding task: [id]`
   - [ ] Expanded modal appears
   - [ ] Shows "Creator View" (Approve/Reject buttons if status=review)

3. **Close Modal**
   - [ ] Closes properly on backdrop click
   - [ ] Closes properly on Close button click

---

## Test 3: Mode-Specific Behavior

### 3.1 Theme Switching

1. **Switch to Guild Mode**
   - Settings → Theme → Guild
   - [ ] App strings use "missions", "bounties", "guild members"

2. **Switch to Family Mode**
   - Settings → Theme → Family
   - [ ] App strings use "chores", "allowance", "family members"

3. **Switch to Couple Mode**
   - Settings → Theme → Couple
   - [ ] App strings use "requests", "treats"
   - [ ] Friends page shows partner-specific UI

### 3.2 Couple Mode Partner UI

1. **Open Friends Page in Couple Mode** (/friends)
   - [ ] Shows partner state (NO_PARTNER / INVITE_SENT / INVITE_RECEIVED / PARTNERED)
   - [ ] Current user's avatar shows correctly with cache-busting

---

## Test 4: Core Loop (E2E)

### 4.1 Create → Complete → Approve

1. **Create Mission**
   - Go to /issued
   - Click "Create Mission" button
   - Fill form, assign to self or test partner
   - [ ] Mission appears in list

2. **Complete Mission**
   - Go to Dashboard (/)
   - Find the mission
   - Click TaskCard → Modal opens → Complete Task
   - [ ] Upload proof (file or text)
   - [ ] Status changes to "In Review"

3. **Approve Mission**
   - Go to /issued
   - Find the mission (status=review)
   - Click TaskCard → Modal opens → Approve
   - [ ] Status changes to "Completed"
   - [ ] Credits update for assignee

---

## Test 5: Mobile-Specific

### 5.1 Hamburger Menu

1. **Open Menu**
   - Click hamburger icon
   - [ ] Menu slides in
   - [ ] User profile shows correct avatar/name

2. **Navigate**
   - Click any nav link
   - [ ] Menu closes automatically
   - [ ] Page navigates correctly

3. **Profile Modal from Menu**
   - Open menu → Click profile section
   - [ ] Profile modal opens
   - [ ] Menu closes first

### 5.2 TaskCard Touch

1. **Tap TaskCard**
   - [ ] Modal opens (no double-tap needed)
   - [ ] Touch targets are large enough (min 44px)

2. **Close Modal**
   - Tap backdrop
   - [ ] Modal closes properly

---

## Console Logs to Watch

**Identity Pipeline**:
```
[Layout] Identity state: { userId: ..., profileDisplayName: ..., hasProfile: true }
[ProfileEditModal] About to call refreshProfile, current profile: {...}
[ProfileEditModal] refreshProfile completed
[useAuth] Force refreshing profile for user: ...
[useAuth] Profile refreshed successfully: ...
```

**TaskCard Modal Flow**:
```
[TaskCard] Inner div clicked, expanding task: [uuid]
[TaskCard] Touch end on inner div, expanding task: [uuid]
[UIContext] activeLayer: modal isMobileMenuOpen: false
```

**Mobile Menu**:
```
[MobileMenu] State changed, isOpen: true/false
[Layout] Profile button clicked in mobile menu
```

---

## P1 VISUAL CHECKS

### P1-1: Store Token Display

**Test Steps**:
1. Go to Rewards Store (/rewards-store)
2. Look at the Credits Summary section at the top

**Pass Criteria**:
- [ ] Only ONE coin icon visible (spinning, from CreditDisplay)
- [ ] Number + coin are clearly separated, not overlapping
- [ ] Balance is readable

### P1-2: My Bounties Layout

**Test Steps**:
1. Go to Rewards Store → "Created" tab (My Bounties)
2. Look at any reward card

**Pass Criteria**:
- [ ] Cost shows as "Cost: [number] 🪙"
- [ ] Edit and Delete buttons are side-by-side with proper spacing
- [ ] Number doesn't overlap with coin

---

## Common Issues & Fixes (Updated R5)

| Symptom | Cause | Fix Applied (R5) |
|---------|-------|------------------|
| Name doesn't update in header | Profile null or display_name null | Unified displayName with fallback chain |
| Avatar shows old image | Browser cache | Cache-busting via `?v=updated_at` |
| TaskCard click does nothing (desktop) | `trackMouse: true` intercepting | Removed trackMouse from swipeHandlers |
| TaskCard tap does nothing (mobile) | Touch events not handled | Added explicit `onTouchEnd` handler |
| Store shows double coin | Static emoji + CreditDisplay | Removed static emoji |
| Header shows email | profile.display_name is falsy | Fallback: profile → user_metadata → email |
| Mobile menu conflicts | Layer management | UIContext coordinates layers |

---

## Sign-Off

- [ ] **P0-1: Identity Pipeline PASSES**
- [ ] **P0-2: TaskCard Click (Desktop) PASSES**
- [ ] **P0-3: TaskCard Tap (Mobile) PASSES**
- [ ] **P0-4: IssuedPage Cards PASS**
- [ ] **P1-1: Store Token Display PASSES**
- [ ] **P1-2: My Bounties Layout PASSES**
- [ ] All detailed test steps pass
- [ ] All Test 5 steps pass

**Tester**: _____________
**Date**: _____________
**Build/Commit**: _____________
