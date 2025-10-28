# Demo Data Setup for Proposal 008 Testing

**Purpose**: Quick SQL snippets to create demo rewards if needed for smoke testing.

---

## Option A: Use the UI (Recommended)

1. **Login** to http://localhost:5173/
2. **Add a Friend** (if you don't have one):
   - Go to **Friends** page
   - Click "Add Friend"
   - Enter friend's email and send request
   - Have friend accept (or use second account)
3. **Create Rewards**:
   - Go to **Rewards Store** page
   - Click "Create Bounty"
   - Fill in:
     - Name: "Cheap Test Reward"
     - Description: "For testing successful purchase"
     - Cost: 50 credits
     - Assign to: (select a friend)
   - Create another:
     - Name: "Expensive Test Reward"
     - Cost: 1000 credits

---

## Option B: Quick SQL Insert (No Schema Changes)

**Prerequisites**:
- You have a user_id (your UUID from auth.users)
- You have a friend's user_id (another UUID)

**Copy these commands to psql**:

```sql
-- Replace these UUIDs with your actual values:
-- YOUR_USER_ID: Your auth.uid()
-- FRIEND_USER_ID: Your friend's auth.uid()

-- Insert a cheap reward (50 credits)
INSERT INTO public.rewards_store (
  name,
  description,
  image_url,
  credit_cost,
  creator_id,
  assigned_to,
  is_active
) VALUES (
  'Cheap Test Reward',
  'For testing successful purchase - costs 50 credits',
  'https://via.placeholder.com/150',
  50,
  'YOUR_USER_ID'::UUID,  -- Replace with your UUID
  'FRIEND_USER_ID'::UUID, -- Replace with friend's UUID
  true
);

-- Insert an expensive reward (1000 credits)
INSERT INTO public.rewards_store (
  name,
  description,
  image_url,
  credit_cost,
  creator_id,
  assigned_to,
  is_active
) VALUES (
  'Expensive Test Reward',
  'For testing insufficient funds - costs 1000 credits',
  'https://via.placeholder.com/150',
  1000,
  'YOUR_USER_ID'::UUID,  -- Replace with your UUID
  'FRIEND_USER_ID'::UUID, -- Replace with friend's UUID
  true
);

-- Verify insertions
SELECT id, name, credit_cost, creator_id, assigned_to, is_active
FROM public.rewards_store
ORDER BY created_at DESC
LIMIT 5;
```

---

## Verify Your Setup

**Check your balance**:
```sql
SELECT balance
FROM public.user_credits
WHERE user_id = 'YOUR_USER_ID'::UUID;
```

**Expected**:
- Balance should be ≥ 50 credits to test successful purchase
- Balance should be < 1000 credits to test insufficient funds error

**If you need more credits**, complete some tasks in the UI:
1. Go to **Dashboard** → Create Task
2. Assign to friend with reward (e.g., 100 credits)
3. Have friend submit proof
4. Approve task → credits awarded

---

## Cleanup After Testing (Optional)

```sql
-- Delete test rewards (only deletes the ones you created)
DELETE FROM public.rewards_store
WHERE name IN ('Cheap Test Reward', 'Expensive Test Reward');

-- Delete collected test rewards (if you claimed them)
DELETE FROM public.collected_rewards
WHERE reward_id IN (
  SELECT id FROM public.rewards_store
  WHERE name IN ('Cheap Test Reward', 'Expensive Test Reward')
);
```

**Note**: Don't run cleanup if you want to keep testing the same scenarios!

---

**Created**: 2025-01-27
**Status**: Helper guide for demo setup
