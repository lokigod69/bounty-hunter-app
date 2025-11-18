# V1 Testing Checklist

This checklist is for manual testing of the Bounty Hunter app before V1 release. Test each flow end-to-end to ensure the app is ready for real users.

---

## Prerequisites

- Supabase backend should be functional (or test with expected errors)
- Test with at least 2 user accounts (to test friend invites and mission assignment)
- Clear browser localStorage between test runs if needed: `localStorage.clear()`

---

## 1. New User Flow (First-Time Experience)

### 1.1 Sign Up & Onboarding
- [ ] **Sign up** with a new email
- [ ] **Onboarding Step 1**: Choose theme mode (Guild/Family/Couple)
  - [ ] Theme selection works
  - [ ] Can proceed to next step
  - [ ] "Skip setup" option works and marks onboarding complete
- [ ] **Onboarding Step 2**: Create first reward
  - [ ] Form validates required fields
  - [ ] Can create reward successfully
  - [ ] Error handling: If creation fails, shows error message
  - [ ] Can skip reward creation
  - [ ] Theme strings used (e.g., "Reward" vs "Bounty" vs "Gift")
- [ ] **Onboarding Step 3**: Invite someone (optional)
  - [ ] Can search for user by email
  - [ ] Can send invite successfully
  - [ ] Error handling: User not found shows clear error
  - [ ] Error handling: Cannot invite self shows error
  - [ ] Can skip invite step
- [ ] **Onboarding Step 4**: Create first mission
  - [ ] Form validates required fields
  - [ ] Can create mission successfully
  - [ ] Error handling: If creation fails, shows error and allows retry/skip
  - [ ] Can skip mission creation
  - [ ] Theme strings used (e.g., "Mission" vs "Chore" vs "Request")
- [ ] **After onboarding**: Redirects to Mission Inbox
- [ ] **Onboarding flag**: `bounty_onboarding_completed` is set in localStorage
- [ ] **Existing user**: User with missions/rewards skips onboarding automatically

---

## 2. Theme System

### 2.1 Theme Switching
- [ ] Navigate to Profile → Edit Profile
- [ ] **Theme Selector**: Can switch between Guild/Family/Couple modes
- [ ] **Theme persistence**: Refresh page, theme remains selected
- [ ] **Theme application**: All pages update labels immediately:
  - [ ] Mission Inbox title changes
  - [ ] Section titles change ("Do this now" vs "Today's chores" vs "Do this for your partner")
  - [ ] Reward Store title changes
  - [ ] Friends page title changes
  - [ ] Navigation labels change
  - [ ] Token labels change (Credits/Stars/Tokens)

### 2.2 Theme Consistency
- [ ] **Guild Mode**: All text uses "missions", "crew", "bounties", "credits"
- [ ] **Family Mode**: All text uses "chores", "family", "rewards", "stars"
- [ ] **Couple Mode**: All text uses "requests", "partner", "gifts", "tokens"
- [ ] No hard-coded "Dashboard", "Tasks", "Friends" strings visible

---

## 3. Mission Inbox (Dashboard)

### 3.1 Data Loading
- [ ] **Loading state**: Shows spinner while loading
- [ ] **Error state**: If Supabase fails, shows error card with retry button
- [ ] **Empty state**: Shows appropriate message and CTAs when no missions

### 3.2 Sections
- [ ] **"Do this now"**: Shows active missions assigned to current user
  - [ ] Sorted by deadline (overdue first, then soonest)
  - [ ] Daily missions show "Daily" badge
  - [ ] Daily missions show streak count if > 0
- [ ] **"Waiting for approval"**: Shows missions in review status
- [ ] **"Recently completed"**: Shows last 5-10 completed missions
- [ ] **Issued summary**: Shows count of issued missions (if any)

### 3.3 Interactions
- [ ] Can click mission card to view details
- [ ] Can update mission status
- [ ] Can submit proof
- [ ] **Store prompt**: Shows when user has credits > 0
- [ ] **Create mission CTA**: Visible in empty states

---

## 4. Reward Store

### 4.1 Data Loading
- [ ] **Loading state**: Shows loading indicator
- [ ] **Error state**: If Supabase fails, shows error card with retry button
- [ ] **Empty state**: Shows theme-aware empty state with CTA

### 4.2 Credits Summary
- [ ] **Credits display**: Shows current user credits prominently
- [ ] **0 credits**: Shows "Complete missions to earn tokens" message
- [ ] **Has credits**: Shows affordable rewards count
- [ ] **Distance to reward**: Shows credits needed for cheapest unaffordable reward

### 4.3 Reward Cards
- [ ] **Visual design**: Cards look aspirational (large image area, prominent price)
- [ ] **Affordability**: Unaffordable rewards show disabled state
- [ ] **Affordability hint**: Shows "Need N more tokens" for unaffordable rewards
- [ ] **Purchase flow**: Can purchase affordable rewards
- [ ] **Credits update**: Credits decrease after purchase

### 4.4 Create/Edit/Delete
- [ ] Can create new reward
- [ ] Can edit own rewards
- [ ] Can delete own rewards
- [ ] Error handling: Shows errors if operations fail

---

## 5. Daily Missions & Streaks

### 5.1 Creating Daily Missions
- [ ] **TaskForm**: "Make this a daily mission" checkbox present
- [ ] Can create mission with `is_daily = true`
- [ ] Daily missions show "Daily" badge in Mission Inbox
- [ ] Badge uses theme-aware label (Daily mission/Daily chore/Daily moment)

### 5.2 Streak Tracking
- [ ] **First completion**: Streak starts at 1
- [ ] **Consecutive days**: Streak increments when completed on consecutive days
- [ ] **Gap detection**: Streak resets to 1 if gap detected
- [ ] **Streak display**: Shows "🔥 N-day streak" on daily mission cards
- [ ] **Streak bonus**: Credits increase with streak (10% per day, capped at 2x)
- [ ] **Approval toast**: Shows streak bonus message (e.g., "10 credits awarded (3-day streak bonus!)")

**Note**: Full streak verification requires Supabase to be functional. Test with mock data if needed.

---

## 6. Friends/Crew Page

### 6.1 Data Loading
- [ ] **Loading state**: Shows loading indicator
- [ ] **Error state**: If Supabase fails, shows error card with retry button
- [ ] **Empty state**: Shows clear "Invite someone" CTA

### 6.2 Friend Management
- [ ] Can search for users by email/display name
- [ ] Can send friend request
- [ ] Can accept incoming requests
- [ ] Can reject incoming requests
- [ ] Can cancel sent requests
- [ ] Can remove friends
- [ ] Error handling: Shows errors for duplicate requests, self-invite, etc.

---

## 7. Error Handling & Resilience

### 7.1 Supabase Connection Issues
- [ ] **Mission Inbox**: Shows error state with retry button (doesn't crash)
- [ ] **Reward Store**: Shows error state with retry button (doesn't crash)
- [ ] **Friends Page**: Shows error state with retry button (doesn't crash)
- [ ] **System Status**: Profile → System Status shows backend connection status

### 7.2 Onboarding Errors
- [ ] **Reward creation fails**: Shows error, allows retry or skip
- [ ] **Invite fails**: Shows error, allows retry or skip
- [ ] **Mission creation fails**: Shows error, allows retry or skip
- [ ] **Skip paths**: Can skip any step and still complete onboarding
- [ ] **Completion flag**: Always set even if steps are skipped

### 7.3 Component Resilience
- [ ] **No crashes**: App doesn't crash if hooks return errors
- [ ] **Graceful degradation**: UI shows error states instead of breaking
- [ ] **Retry functionality**: Error states have retry buttons where appropriate

---

## 8. Mobile Responsiveness

### 8.1 Layout
- [ ] **Mission Inbox**: Cards stack properly on mobile
- [ ] **Reward Store**: Grid adapts to mobile (1 column)
- [ ] **Credits summary**: Responsive layout (stacks on mobile)
- [ ] **Daily badge**: Doesn't break card layout on mobile
- [ ] **Streak display**: Readable on small screens

### 8.2 Touch Targets
- [ ] All buttons are at least 44x44px (touch-friendly)
- [ ] FAB buttons are easily tappable
- [ ] Form inputs are properly sized

---

## 9. System Status & Diagnostics

### 9.1 Debug Section
- [ ] Navigate to Profile → Edit Profile
- [ ] **System Status section**: Visible at bottom
- [ ] Shows: User ID, Email, Theme Mode
- [ ] **Backend Connection**: Shows health check status
  - [ ] "Checking..." while testing
  - [ ] "Connected" if Supabase is healthy
  - [ ] "Connection Error" with message if Supabase fails

---

## 10. Core Loop Verification

### 10.1 Mission → Proof → Approval → Credits → Store
- [ ] **Create mission**: Assign to friend or self
- [ ] **Complete mission**: Update status to completed (or submit proof)
- [ ] **Approve mission**: As creator, approve the mission
- [ ] **Credits awarded**: Assignee receives credits
- [ ] **Streak bonus**: If daily mission, streak bonus applies
- [ ] **Purchase reward**: Use credits to purchase reward from store
- [ ] **Credits decrease**: Credits balance updates after purchase

### 10.2 Daily Mission Loop
- [ ] **Create daily mission**: Mark mission as daily
- [ ] **Complete & approve**: Complete mission on Day 1
- [ ] **Streak = 1**: First completion shows streak of 1
- [ ] **Complete Day 2**: Complete same mission next day
- [ ] **Streak = 2**: Streak increments, bonus applies
- [ ] **Skip a day**: Don't complete on Day 3
- [ ] **Complete Day 4**: Streak resets to 1

---

## 11. Edge Cases

### 11.1 Empty States
- [ ] **No missions**: Mission Inbox shows appropriate empty state
- [ ] **No rewards**: Reward Store shows empty state with CTA
- [ ] **No friends**: Friends page shows empty state with invite CTA
- [ ] **0 credits**: Reward Store shows "Complete missions to earn tokens"

### 11.2 Data Edge Cases
- [ ] **Mission with no assignee**: Handles gracefully
- [ ] **Reward with no cost**: Handles gracefully
- [ ] **User with no credits record**: Initializes to 0

---

## 12. Theme-Specific Testing

### 12.1 Guild Mode
- [ ] All labels use "mission", "crew", "bounty", "credit"
- [ ] Feels sci-fi/gaming themed

### 12.2 Family Mode
- [ ] All labels use "chore", "family", "reward", "star"
- [ ] Feels warm and simple

### 12.3 Couple Mode
- [ ] All labels use "request", "partner", "gift", "token"
- [ ] Feels intimate and light

---

## Known Limitations (Not Bugs)

- **Supabase API issues**: Backend may be intermittently unavailable
- **Daily streak verification**: Requires Supabase to be functional for full testing
- **Multi-group features**: Not implemented (single universe per user)
- **Notifications**: Not implemented
- **AI images**: Not implemented
- **Calendar/graph UI**: Not implemented

---

## Testing Notes

- Test with Supabase online and offline
- Test theme switching mid-session
- Test skip paths in onboarding
- Test error recovery (retry buttons)
- Test mobile viewport sizes
- Test with 0 credits, some credits, many credits
- Test with 0 missions, some missions, many missions

---

## Sign-Off

- [ ] All critical flows tested
- [ ] Error handling verified
- [ ] Theme consistency verified
- [ ] Mobile responsiveness verified
- [ ] No crashes observed
- [ ] Ready for V1 release

**Tester**: _________________  
**Date**: _________________  
**Notes**: _________________

