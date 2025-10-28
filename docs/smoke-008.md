# Smoke Test Guide - Proposal 008: Atomic Purchase

**Test Date**: 2025-01-27
**Preview URL**: http://localhost:5173/
**Target**: Verify atomic purchase behavior in production UI

---

## Prerequisites

- ✅ Dev server running on http://localhost:5173/
- ✅ Logged in with user account that has credits
- ✅ At least 2 rewards available:
  - One "cheap" reward (cost ≤ your balance)
  - One "expensive" reward (cost > your balance)

---

## Test Scenarios

### 1️⃣ Successful Purchase (Balance Decrement)

**Steps**:
1. Navigate to **Rewards Store** page (`/rewards-store`)
2. Note your current balance (top-right corner or user menu)
3. Find a reward with cost ≤ your balance
4. Click **"Claim"** button on the reward card

**Expected**:
- ✅ Success toast: "Reward claimed! New balance: X credits"
- ✅ Your balance decreases by the reward's cost
- ✅ Reward appears in **My Collected Rewards** (`/my-collected-rewards`)
- ✅ Transaction logged in credit_transactions table (visible in backend)

**Evidence**:
- Toast message shows new balance
- Balance widget updates immediately
- Reward card shows "Claimed" or is disabled

---

### 2️⃣ Insufficient Funds Error

**Steps**:
1. Stay on **Rewards Store** page
2. Find a reward with cost > your current balance
3. Click **"Claim"** button on the expensive reward

**Expected**:
- ✅ Error toast: "Insufficient credits. Need X, have Y."
- ✅ Balance remains unchanged
- ✅ Reward NOT added to collected rewards
- ✅ No transaction logged

**Evidence**:
- Red/error toast displays specific amounts
- Balance widget shows same value as before
- Reward card remains claimable (button not disabled)

---

### 3️⃣ Duplicate Purchase Prevention

**Steps**:
1. Stay on **Rewards Store** page
2. Find a reward you already claimed in Test #1
3. Click **"Claim"** button again

**Expected**:
- ✅ Error toast: "You have already collected this reward."
- ✅ Balance remains unchanged
- ✅ No duplicate entry in collected rewards

**Evidence**:
- Toast displays "already collected" message
- Balance unchanged
- My Collected Rewards page shows only ONE instance of the reward

---

### 4️⃣ Concurrent Purchase Protection (Optional)

**Steps**:
1. Open **two browser tabs/windows** with same user logged in
2. In both tabs, navigate to **Rewards Store**
3. Find a reward that costs 60% of your balance
4. Click **"Claim"** in both tabs **simultaneously** (as fast as possible)

**Expected**:
- ✅ Exactly ONE purchase succeeds
- ✅ First tab: Success toast
- ✅ Second tab: Error toast (either "insufficient funds" or "already collected")
- ✅ Final balance = (initial balance - reward cost)
- ✅ Only ONE transaction logged

**Evidence**:
- One success, one error toast
- Balance decremented only once
- My Collected Rewards shows ONE instance

---

## Where to See Evidence

### In the UI:
- **Balance Widget**: Top-right corner or user menu → shows current credit balance
- **Toast Notifications**: Bottom-center of screen → success/error messages
- **Rewards Store Page**: `/rewards-store` → list of claimable rewards
- **My Collected Rewards**: `/my-collected-rewards` → list of claimed rewards

### In the Database (optional):
- **user_credits table**: Current balance for your user_id
- **collected_rewards table**: One row per claimed reward
- **credit_transactions table**: One row per purchase with negative delta

---

## Success Criteria

✅ All 4 test scenarios pass
✅ No negative balances observed
✅ Error messages are user-friendly
✅ Balance updates in real-time
✅ No console errors in browser DevTools

---

## Troubleshooting

**Issue**: "purchase_reward does not exist" error
**Fix**: Database migration not applied. Run `scripts/local/apply_008_up.ps1` first.

**Issue**: No rewards available
**Fix**: Create rewards via **Rewards Store** page → "Create Bounty" button (requires friend relationship)

**Issue**: No credits to test
**Fix**: Complete a task in **Dashboard** → assign to friend → approve → credits awarded

**Issue**: Magic link not working
**Fix**: Use existing production account or check Supabase auth logs

---

**Created**: 2025-01-27
**Status**: Ready for manual testing
