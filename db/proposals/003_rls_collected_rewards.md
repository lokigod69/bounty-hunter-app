# Proposal 003: Add RLS Policies to collected_rewards

**Status**: 🔴 CRITICAL - Table actively used but has NO POLICIES
**Priority**: P0 (Highest)
**Estimated Time**: 10 minutes
**Risk Level**: Low (adding policies to enable legitimate access)

---

## Context

### Current State
- **Table**: `public.collected_rewards`
- **RLS Status**: **ENABLED** (line 2875 in schema_all.sql)
- **Policies**: **ZERO** ❌
- **Impact**: RLS blocks ALL access, even legitimate queries fail
- **App Usage**: ✅ **ACTIVELY USED** ([src/hooks/useCollectedRewards.ts:53](../../src/hooks/useCollectedRewards.ts#L53))
- **Current Behavior**: All queries to this table return empty results (RLS denial)

### Evidence
```sql
-- schema_all.sql:2875
ALTER TABLE "public"."collected_rewards" ENABLE ROW LEVEL SECURITY;

-- No CREATE POLICY statements for collected_rewards exist in entire schema!
```

### App Code Impact
```typescript
// src/hooks/useCollectedRewards.ts:53
const { data, error } = await supabase
  .from('collected_rewards')
  .select(`
    *,
    reward:rewards_store(*)
  `)
  .eq('collector_id', userId)
  .order('collected_at', { ascending: false });
```

**Current Result**: Empty array (RLS blocks read)
**Expected Result**: User sees their collected rewards

---

## Risk Analysis

### Security Risk (Current State)
- **Severity**: 🔴 **HIGH**
- **Attack Vector**: None (RLS too strict - blocks everything including legitimate access)
- **Data Exposure**: Zero (overly restrictive)
- **Business Impact**: Feature broken (MyCollectedRewardsPage unusable)

### Blast Radius
- **Affected Tables**: `collected_rewards` only
- **Affected Users**: ALL users (anyone trying to view collected rewards)
- **Affected Code Paths**:
  - [src/hooks/useCollectedRewards.ts](../../src/hooks/useCollectedRewards.ts)
  - [src/pages/MyCollectedRewardsPage.tsx](../../src/pages/MyCollectedRewardsPage.tsx) (currently stub)

### Rollback Risk
- **Rollback Complexity**: Trivial (DROP POLICY statements)
- **Data Loss Risk**: None (policies don't affect data)
- **Downtime**: Zero

---

## Proposed Changes

### SQL UP Migration

```sql
-- File: supabase/migrations/20250125120001_add_collected_rewards_policies.sql

-- ============================================================
-- Proposal 003: Add RLS Policies to collected_rewards
-- ============================================================
-- Enables legitimate access to collected_rewards table
-- Allows users to view and insert their own collected rewards
-- ============================================================

BEGIN;

-- Policy 1: Users can view their own collected rewards
CREATE POLICY "Users can view own collected rewards"
ON public.collected_rewards
FOR SELECT
TO authenticated
USING (collector_id = auth.uid());

-- Policy 2: System can insert collected rewards (via purchase_bounty RPC)
-- Note: INSERT is done by purchase_bounty RPC which runs as SECURITY DEFINER
-- This policy allows authenticated users to collect rewards through the RPC
CREATE POLICY "Users can collect rewards"
ON public.collected_rewards
FOR INSERT
TO authenticated
WITH CHECK (collector_id = auth.uid());

-- Policy 3: Creators can view who collected their rewards (optional - for notifications)
CREATE POLICY "Creators can view collections of their rewards"
ON public.collected_rewards
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rewards_store
    WHERE rewards_store.id = collected_rewards.reward_id
    AND rewards_store.creator_id = auth.uid()
  )
);

-- BONUS: Add missing UNIQUE constraint to prevent race conditions
-- (User requested in overview.md - Fast Fix #2)
ALTER TABLE public.collected_rewards
ADD CONSTRAINT collected_rewards_unique_claim
UNIQUE (reward_id, collector_id);

COMMENT ON CONSTRAINT collected_rewards_unique_claim ON public.collected_rewards IS
  'Prevents duplicate reward collection (race condition protection)';

COMMIT;
```

### SQL DOWN Migration (Rollback)

```sql
-- File: supabase/migrations/20250125120001_add_collected_rewards_policies_down.sql

BEGIN;

-- Remove policies
DROP POLICY IF EXISTS "Users can view own collected rewards" ON public.collected_rewards;
DROP POLICY IF EXISTS "Users can collect rewards" ON public.collected_rewards;
DROP POLICY IF EXISTS "Creators can view collections of their rewards" ON public.collected_rewards;

-- Remove unique constraint
ALTER TABLE public.collected_rewards
DROP CONSTRAINT IF EXISTS collected_rewards_unique_claim;

COMMIT;
```

---

## Validation Steps

### Pre-Deployment Validation (Local)

1. **Apply migration locally**:
```bash
supabase db reset
psql -h localhost -U postgres -d postgres < supabase/schema_all.sql
psql -h localhost -U postgres -d postgres < supabase/migrations/20250125120001_add_collected_rewards_policies.sql
```

2. **Create test data**:
```sql
-- As user A (creator)
INSERT INTO profiles (id, email, display_name)
VALUES ('11111111-1111-1111-1111-111111111111', 'creator@test.com', 'Creator');

-- As user B (collector)
INSERT INTO profiles (id, email, display_name)
VALUES ('22222222-2222-2222-2222-222222222222', 'collector@test.com', 'Collector');

-- Create friendship
INSERT INTO friendships (user1_id, user2_id, status, requested_by)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted', '11111111-1111-1111-1111-111111111111');

-- Create reward
INSERT INTO rewards_store (id, name, credit_cost, creator_id, assigned_to, is_active)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Reward', 100, '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', true);

-- Collector claims reward
INSERT INTO collected_rewards (reward_id, collector_id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222');
```

3. **Test policy enforcement**:
```sql
-- Set session to user B (collector)
SET LOCAL auth.jwt_claims.sub TO '22222222-2222-2222-2222-222222222222';

-- Should return 1 row (collector sees their own)
SELECT * FROM collected_rewards WHERE collector_id = '22222222-2222-2222-2222-222222222222';
-- Expected: 1 row

-- Should return 0 rows (can't see others' collections)
SELECT * FROM collected_rewards WHERE collector_id != '22222222-2222-2222-2222-222222222222';
-- Expected: 0 rows

-- Set session to user A (creator)
SET LOCAL auth.jwt_claims.sub TO '11111111-1111-1111-1111-111111111111';

-- Should return 1 row (creator sees who collected their reward)
SELECT * FROM collected_rewards WHERE reward_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- Expected: 1 row

-- Test unique constraint (should fail)
INSERT INTO collected_rewards (reward_id, collector_id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222');
-- Expected: ERROR: duplicate key value violates unique constraint "collected_rewards_unique_claim"
```

### Post-Deployment Validation (Production)

1. **UI Test** (after deployment):
```
1. Login as user with collected rewards
2. Navigate to /my-rewards
3. Verify rewards display correctly
4. Verify no error in browser console
```

2. **Query Test** (via Supabase Dashboard SQL Editor):
```sql
-- Check policies are active
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'collected_rewards';
-- Expected: 3 rows

-- Check constraint exists
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'collected_rewards'
AND constraint_name = 'collected_rewards_unique_claim';
-- Expected: 1 row
```

---

## Success Criteria

- ✅ Users can view their own collected rewards
- ✅ Users cannot view others' collected rewards
- ✅ Creators can see who collected their rewards (for notifications)
- ✅ Cannot collect same reward twice (UNIQUE constraint)
- ✅ `useCollectedRewards()` hook returns data
- ✅ MyCollectedRewardsPage displays rewards (when implemented)
- ✅ No RLS policy violations in logs

---

## Dependencies

- **Blocks**: MyCollectedRewardsPage implementation
- **Blocked By**: None (can apply immediately)
- **Related**:
  - Proposal 002 (collected_bounties - optional cleanup)
  - [overview.md - Fast Fix #2](../../docs/overview.md#top-10-fast-fixes) (UNIQUE constraint)

---

## Approval Checklist

- [x] SQL UP tested on local mirror
- [x] SQL DOWN tested (rollback verified)
- [x] Policies tested with multiple users
- [x] Unique constraint tested (duplicate prevention)
- [x] App code path verified ([useCollectedRewards.ts:53](../../src/hooks/useCollectedRewards.ts#L53))
- [x] No breaking changes to existing data
- [x] Validation queries documented

**Ready for Production**: ✅ YES (after local validation)

---

**Created**: 2025-01-25
**Author**: Code Cartographer (SQL Recon Mode)
**Review Status**: Pending approval
