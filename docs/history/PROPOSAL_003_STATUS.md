# Proposal 003 Status Report

**Date**: 2025-01-25
**Status**: ✅ **DEPLOYED TO PRODUCTION**
**Priority**: P0 (CRITICAL)
**Deployed**: 2025-01-25

---

## Executive Summary

**Problem**: `collected_rewards` table has RLS enabled but ZERO policies, breaking the MyCollectedRewardsPage feature.

**Solution**: Add 3 RLS policies + UNIQUE constraint to enable legitimate access.

**Risk**: 🟢 LOW - Adding policies to enable access, not restricting. No data loss. Instant rollback available.

**Impact**: 🟢 POSITIVE - Un-breaks user-visible feature (MyCollectedRewardsPage).

---

## Deployment Status

**LOCAL TESTING**: ✅ COMPLETE
- Supabase CLI configured (port 55432 - Windows reserved port conflict resolved)
- All 3 policies validated
- UNIQUE constraint validated
- RLS enabled status verified

**PRODUCTION DEPLOYMENT**: ✅ COMPLETE (2025-01-25)
- Schema backup created
- Migration applied successfully
- Validation queries passed
- App testing confirmed working

---

## Production Validation Results

**Database Validation** (psql queries):
```
RLS Status: true (relrowsecurity = t)
Policy Count: 3
UNIQUE Constraint: collected_rewards_unique_claim (present)
```

**Policies Created** (PostgreSQL 18):
1. `Creators can view collections of their rewards` (SELECT)
2. `Users can collect rewards` (INSERT)
3. `Users can view own collected rewards` (SELECT)

**App Testing**:
- User A: MyCollectedRewards shows only User A's collected rewards ✅
- User B: MyCollectedRewards shows only User B's collected rewards ✅
- User C (no collections): MyCollectedRewards shows empty state ✅

**Result**: 🟢 ALL TESTS PASSED

---

## Files Created

✅ **Migration Files**:
- [db/proposals/003_rls_collected_rewards.up.sql](db/proposals/003_rls_collected_rewards.up.sql) - Apply migration
- [db/proposals/003_rls_collected_rewards.down.sql](db/proposals/003_rls_collected_rewards.down.sql) - Rollback migration

✅ **Documentation**:
- [db/proposals/003_rls_collected_rewards.md](db/proposals/003_rls_collected_rewards.md) - Full proposal with rationale
- [PROD_RUNBOOK_003.md](PROD_RUNBOOK_003.md) - Production deployment guide

✅ **Test Data**:
- [db/seeds/seed_minimal.sql](db/seeds/seed_minimal.sql) - Minimal dataset for testing

---

## What the Migration Does

### 3 RLS Policies Added

1. **"Users can view own collected rewards"** (SELECT)
   - Allows users to query their own collected rewards
   - `USING (collector_id = auth.uid())`
   - Fixes: `useCollectedRewards` hook

2. **"Users can collect rewards"** (INSERT)
   - Allows users to insert new collected rewards
   - `WITH CHECK (collector_id = auth.uid())`
   - Fixes: Reward claiming feature

3. **"Creators can view collections of their rewards"** (SELECT)
   - Allows reward creators to see who collected their rewards
   - `USING (EXISTS ... creator_id = auth.uid())`
   - Enables: Notifications to creators

### 1 UNIQUE Constraint Added

**`collected_rewards_unique_claim`** on `(reward_id, collector_id)`
- Prevents duplicate reward claims (race condition)
- Bonus fix from overview.md Fast Fix #2

---

## Validation Queries (Copy-Paste Ready)

After applying migration, run these in psql:

```sql
-- Verify RLS still enabled
SELECT relrowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='collected_rewards';
-- Expected: t

-- Count policies (should be 3)
SELECT count(*) FROM pg_policies
WHERE schemaname='public' AND tablename='collected_rewards';
-- Expected: 3

-- List policies
SELECT polname, cmd, roles FROM pg_policies
WHERE schemaname='public' AND tablename='collected_rewards'
ORDER BY polname;
-- Expected: 3 rows (see runbook)

-- Verify UNIQUE constraint
SELECT conname, contype FROM pg_constraint
WHERE conrelid='public.collected_rewards'::regclass
AND conname='collected_rewards_unique_claim';
-- Expected: 1 row with contype='u'
```

---

## Rollback Procedure (Emergency)

**If anything fails**:

```powershell
$env:PGPASSWORD = "<DB_PASSWORD>"
psql "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -f db\proposals\003_rls_collected_rewards.down.sql
Remove-Item Env:\PGPASSWORD
```

**Rollback time**: < 1 second
**Rollback risk**: None (simple DROP statements)

---

## Deployment Timeline

1. **Local Testing** (2025-01-25)
   - Configured Supabase CLI with port 55432
   - Applied migration locally
   - Validated 3 policies + UNIQUE constraint
   - ✅ PASS

2. **Production Deployment** (2025-01-25)
   - Backed up production schema
   - Applied `003_rls_collected_rewards.up.sql`
   - Ran validation queries
   - Tested app with real users
   - ✅ SUCCESS

**Total Deployment Time**: ~10 minutes
**Downtime**: 0 seconds
**Issues Encountered**: None

---

## What Happened

**Immediate Effects**:
- ✅ MyCollectedRewardsPage now works correctly
- ✅ Users can view their collected rewards
- ✅ Creators can see who collected their rewards
- ✅ No duplicate claims possible (UNIQUE constraint)

**Phase 0 Remaining**:
- Proposal 004: Function search_path hardening (P1) - Next
- Proposal 005: Auth OTP hardening (P1) - After 004
- Proposal 001: Drop unused tables (P2 - optional)

**Phase 1+**: See [plan.md](plan.md) for full roadmap

---

## Summary

**STATUS**: ✅ DEPLOYED AND VALIDATED
**RESULT**: Feature restored, no issues detected
**NEXT**: Generate Proposals 004 and 005 with same wrapper-free psql flow

---

**Created**: 2025-01-25
**Deployed**: 2025-01-25
**Validated**: 2025-01-25

---

**END OF STATUS REPORT**
