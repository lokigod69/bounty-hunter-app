# Database Security Hardening Changeset

**Date**: 2025-01-25
**Status**: 🟢 PARTIALLY APPLIED
**Environment**: Production (Proposal 003 deployed)

---

## Executive Summary

Comprehensive database security audit identified **3 critical RLS gaps** in actively used tables. This changeset proposes surgical fixes with zero downtime and full rollback capability.

### Key Findings
- 🔴 **1 CRITICAL** - `collected_rewards` has RLS but NO POLICIES (app broken)
- 🟡 **2 CLEANUP** - Duplicate tables (`marketplace_bounties`, `collected_bounties`) with security gaps
- ✅ **6 SECURE** - Core tables (`profiles`, `tasks`, `friendships`, `rewards_store`, `user_credits`) properly protected

### Impact
- **Affected Users**: ALL (collected_rewards feature currently broken)
- **Downtime**: **ZERO** (policies added, not changed)
- **Rollback**: **INSTANT** (DROP POLICY statements)

---

## Proposal Summary

| # | Title | Priority | Time | Risk | Status |
|---|-------|----------|------|------|--------|
| [001](../../db/proposals/001_drop_marketplace_bounties.md) | Drop marketplace_bounties | P2 (Medium) | 5 min | Low | ⏸️ Pending data verification |
| [002](../../db/proposals/002_rls_collected_bounties.md) | Drop collected_bounties | P3 (Low) | 2 min | Minimal | ⏸️ Pending (cascade from 001) |
| [003](../../db/proposals/003_rls_collected_rewards.md) | Add RLS to collected_rewards | **P0 (Critical)** | 10 min | Low | ✅ **Applied (2025-01-25)** |
| [004](../../db/proposals/004_harden_function_search_path.up.sql) | Harden function search_path | P1 (High) | 10 min | Low | ✅ **Validated (2025-01-25)** |
| [005](../../db/proposals/PROPOSAL_005_AUTH_OTP_HARDENING.md) | Auth OTP hardening | P1 (High) | 5 min | Low | ✅ **Completed (Dashboard-only)** |
| 006 | RLS for unused tables | P2 (Medium) | 5 min | Low | 📝 Draft pending |
| 007 | pg_net schema cleanup | P2 (Medium) | 2 min | Low | 📝 Draft pending |

---

## Recommended Apply Order

### Phase 1: Critical Fix (IMMEDIATE)

**Apply First**: Proposal 003 only (collected_rewards policies)

**Reason**:
- ✅ Fixes broken feature (users can't view collected rewards)
- ✅ Zero dependencies
- ✅ Fully tested and documented
- ✅ No risk of data loss

**Command**:
```bash
# Apply locally first
psql -h localhost -U postgres -d postgres < supabase/migrations/20250125120001_add_collected_rewards_policies.sql

# Validate
psql -h localhost -U postgres -d postgres -c "SELECT policyname FROM pg_policies WHERE tablename = 'collected_rewards';"
# Expected: 3 rows

# Test app
npm run dev
# Navigate to /my-rewards (when implemented)
# Verify rewards display
```

**Rollback** (if needed):
```bash
psql -h localhost -U postgres -d postgres < supabase/migrations/20250125120001_add_collected_rewards_policies_down.sql
```

**Estimated Time**: 10 minutes
**Downtime**: 0 seconds

---

### Phase 2: Schema Cleanup (OPTIONAL)

**Apply Second**: Proposals 001 + 002 (drop duplicate tables)

**Prerequisites**:
1. ✅ Verify `marketplace_bounties` is empty (or accept data loss)
2. ✅ Verify `collected_bounties` is empty (or accept data loss)
3. ✅ Confirm no business need for these tables

**Verification Queries** (run in production before dropping):
```sql
-- Check row counts
SELECT 'marketplace_bounties' AS table_name, COUNT(*) AS row_count FROM public.marketplace_bounties
UNION ALL
SELECT 'collected_bounties', COUNT(*) FROM public.collected_bounties;

-- Expected: Both 0 (if not, STOP and investigate)

-- Check for any recent activity
SELECT 'marketplace_bounties' AS table_name, MAX(created_at) AS last_activity FROM public.marketplace_bounties
UNION ALL
SELECT 'collected_bounties', MAX(collected_at) FROM public.collected_bounties;

-- Expected: Both NULL (if not, tables were used recently - investigate)
```

**Command** (only if verification passes):
```bash
# Apply locally first
psql -h localhost -U postgres -d postgres < supabase/migrations/20250125110001_drop_marketplace_bounties.sql

# Validate
psql -h localhost -U postgres -d postgres -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('marketplace_bounties', 'collected_bounties');"
# Expected: 0 rows

# Test app
npm run dev
# Navigate to /rewards-store
# Verify rewards load (from rewards_store table)
```

**Rollback** (if needed):
```bash
psql -h localhost -U postgres -d postgres < supabase/migrations/20250125110001_drop_marketplace_bounties_down.sql
```

**Estimated Time**: 5 minutes
**Downtime**: 0 seconds

---

### Phase 3: Function Hardening (FUTURE)

**Apply Third**: Proposals 004 + 005 (function security + auth hardening)

**Status**: 📝 Drafts pending (not blocking)

**Reason**: Low priority - no known exploits, but good hygiene

---

## Migration File Checklist

### Files to Create

- [x] `supabase/migrations/20250125120001_add_collected_rewards_policies.sql` (UP)
- [x] `supabase/migrations/20250125120001_add_collected_rewards_policies_down.sql` (DOWN)
- [ ] `supabase/migrations/20250125110001_drop_marketplace_bounties.sql` (UP) - Pending verification
- [ ] `supabase/migrations/20250125110001_drop_marketplace_bounties_down.sql` (DOWN) - Pending verification

### Validation Queries (Run After Each Migration)

**After Proposal 003** (collected_rewards policies):
```sql
-- Check policies exist
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'collected_rewards'
ORDER BY policyname;
-- Expected: 3 rows
--   1. Creators can view collections of their rewards (SELECT)
--   2. Users can collect rewards (INSERT)
--   3. Users can view own collected rewards (SELECT)

-- Check unique constraint
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'collected_rewards'
AND constraint_name = 'collected_rewards_unique_claim';
-- Expected: 1 row (UNIQUE)

-- Test policy (as specific user)
SET LOCAL auth.jwt_claims.sub TO '<test-user-uuid>';
SELECT * FROM collected_rewards WHERE collector_id = auth.uid();
-- Expected: User's collected rewards (not empty if user has collected rewards)

-- Test unique constraint (should fail)
INSERT INTO collected_rewards (reward_id, collector_id)
SELECT reward_id, collector_id FROM collected_rewards LIMIT 1;
-- Expected: ERROR: duplicate key value violates unique constraint
```

**After Proposal 001** (drop tables):
```sql
-- Verify tables dropped
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('marketplace_bounties', 'collected_bounties');
-- Expected: 0 rows

-- Verify app still works (query rewards_store)
SELECT COUNT(*) FROM public.rewards_store;
-- Expected: Number of active rewards (not an error)
```

---

## Rollback Order (Reverse Apply Order)

If issues arise, rollback in **REVERSE ORDER**:

1. **Rollback Proposal 001** (if applied):
   ```bash
   psql ... < 20250125110001_drop_marketplace_bounties_down.sql
   ```

2. **Rollback Proposal 003** (if applied):
   ```bash
   psql ... < 20250125120001_add_collected_rewards_policies_down.sql
   ```

**Rollback Time**: < 1 minute per proposal
**Data Loss**: None (rollback scripts restore original state)

---

## Production Deployment Procedure

### Pre-Deployment

1. **Backup database**:
   ```bash
   # Via Supabase Dashboard: Database > Backups > Create backup
   # Or via CLI:
   supabase db dump --data-only > backup_pre_changeset_20250125.sql
   ```

2. **Verify current state**:
   ```sql
   -- Check RLS status
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY tablename;

   -- Check policy count
   SELECT tablename, COUNT(*) AS policy_count
   FROM pg_policies
   WHERE schemaname = 'public'
   GROUP BY tablename
   ORDER BY tablename;
   ```

3. **Test on local mirror** (see [Local Testing](#local-testing) below)

---

### Deployment Steps

**Option A: Via Supabase Dashboard** (Recommended for safety):

1. Navigate to **Database > SQL Editor**
2. Copy migration SQL from file
3. **Review carefully** (double-check table names, policies)
4. Click **Run**
5. Check for errors in output panel
6. Run validation queries (see [Validation Queries](#validation-queries-run-after-each-migration))

**Option B: Via Supabase CLI**:

```bash
# Link to project
supabase link --project-ref <your-project-ref>

# Push migrations
supabase db push

# Verify
supabase db remote commit list
```

---

### Post-Deployment

1. **Run validation queries** (see above)

2. **Monitor logs** for 15 minutes:
   - Supabase Dashboard > Logs > Database
   - Look for RLS policy violations or errors

3. **Test app functionality**:
   ```
   1. Login as test user
   2. Navigate to /my-rewards
   3. Verify collected rewards display
   4. Attempt to collect new reward
   5. Verify credit deduction
   6. Check no console errors
   ```

4. **Verify metrics**:
   - No spike in error rate
   - No failed queries in logs
   - App response time unchanged

---

## Local Testing (Required Before Production)

### Setup Local Environment

```bash
# Start local Supabase
supabase start

# Load schema
psql -h localhost -p 54322 -U postgres -d postgres < supabase/schema_all.sql

# Seed test data
psql -h localhost -p 54322 -U postgres -d postgres < db/seeds/seed_minimal.sql
```

### Test Proposal 003 (collected_rewards policies)

```bash
# Apply migration
psql -h localhost -p 54322 -U postgres -d postgres < supabase/migrations/20250125120001_add_collected_rewards_policies.sql

# Run validation queries
psql -h localhost -p 54322 -U postgres -d postgres < db/validation/test_003_policies.sql

# Expected output:
# - 3 policies created
# - 1 unique constraint added
# - Test user can view own collected rewards
# - Test user cannot view others' collected rewards
```

### Test Proposal 001 (drop tables)

```bash
# Apply migration
psql -h localhost -p 54322 -U postgres -d postgres < supabase/migrations/20250125110001_drop_marketplace_bounties.sql

# Verify tables dropped
psql -h localhost -p 54322 -U postgres -d postgres -c "\\dt public.*bounties"

# Test app
npm run dev
# Navigate to /rewards-store
# Verify rewards load correctly
```

### Test Rollback

```bash
# Rollback proposal 001
psql -h localhost -p 54322 -U postgres -d postgres < supabase/migrations/20250125110001_drop_marketplace_bounties_down.sql

# Verify tables restored
psql -h localhost -p 54322 -U postgres -d postgres -c "\\dt public.*bounties"

# Rollback proposal 003
psql -h localhost -p 54322 -U postgres -d postgres < supabase/migrations/20250125120001_add_collected_rewards_policies_down.sql

# Verify policies removed
psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT * FROM pg_policies WHERE tablename = 'collected_rewards';"
# Expected: 0 rows
```

---

## Risk Assessment

### Proposal 003 (collected_rewards policies)

| Risk Category | Severity | Mitigation |
|---------------|----------|------------|
| Data loss | None | No data modifications, only adding policies |
| Downtime | None | Policies added online, no table locks |
| Breaking changes | None | Enabling access, not restricting |
| Rollback complexity | Trivial | Simple DROP POLICY statements |
| **Overall Risk** | **🟢 LOW** | **Safe to apply** |

### Proposal 001 (drop tables)

| Risk Category | Severity | Mitigation |
|---------------|----------|------------|
| Data loss | **High** | ✅ Verify tables are empty before applying |
| Downtime | None | Tables not used by app |
| Breaking changes | None | App doesn't reference these tables |
| Rollback complexity | Moderate | Recreate schema (no data recovery) |
| **Overall Risk** | **🟡 MEDIUM** | **Requires data verification** |

---

## Success Criteria

### Proposal 003 (collected_rewards)

- ✅ Users can view their own collected rewards
- ✅ Users cannot view others' collected rewards
- ✅ Creators can see who collected their rewards
- ✅ Cannot collect same reward twice (UNIQUE constraint)
- ✅ `useCollectedRewards()` hook returns data (not empty)
- ✅ MyCollectedRewardsPage displays rewards (when implemented)
- ✅ No RLS policy violations in logs

### Proposal 001 (drop tables)

- ✅ `marketplace_bounties` table dropped
- ✅ `collected_bounties` table dropped
- ✅ `create_bounty()` RPC function removed
- ✅ Rewards store page still works (uses `rewards_store`)
- ✅ No errors in app console
- ✅ Schema cleaner (fewer tables)

---

## Dependencies

### Blocking Dependencies
- ✅ None (all proposals independent)

### External Dependencies
- ✅ Local Supabase CLI (`supabase start`)
- ✅ PostgreSQL client (`psql`)
- ✅ Access to Supabase Dashboard (for production deployment)

---

## Communication Plan

### Before Deployment
- [ ] Notify team of upcoming changes (if applicable)
- [ ] Schedule deployment window (recommend off-peak hours)
- [ ] Confirm backup recent (< 24 hours old)

### During Deployment
- [ ] Monitor Supabase Dashboard logs
- [ ] Have rollback scripts ready
- [ ] Test each migration immediately after apply

### After Deployment
- [ ] Send "all clear" notification
- [ ] Document any issues encountered
- [ ] Update [plan.md](../../plan.md) with completion status

---

## Approval Sign-Off

### Required Approvals

- [ ] **Database Owner**: Verified backups exist
- [ ] **Lead Developer**: Reviewed SQL, tested locally
- [ ] **QA/Testing**: Validated on staging environment (if applicable)
- [ ] **Product Owner**: Confirmed business impact acceptable

### Final Checklist

- [ ] All proposals tested on local mirror
- [ ] Rollback scripts tested
- [ ] Validation queries documented
- [ ] Production verification queries prepared
- [ ] Backup recent (< 24 hours)
- [ ] Deployment window scheduled
- [ ] Team notified
- [ ] Rollback plan communicated

**Once all checkboxes complete, proceed with deployment.**

---

## Appendix: Quick Reference

### Connection Strings

**Local**:
```
postgresql://postgres:postgres@localhost:54322/postgres
```

**Production** (from Supabase Dashboard):
```
Settings > Database > Connection String > URI
```

### Useful Commands

```bash
# List all policies
psql ... -c "SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;"

# Check RLS status
psql ... -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

# Count rows in all tables
psql ... -c "SELECT table_name, (xpath('/row/count/text()', query_to_xml(format('SELECT COUNT(*) FROM %I.%I', table_schema, table_name), true, true, '')))[1]::text::int AS row_count FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

---

**Created**: 2025-01-25
**Last Updated**: 2025-01-25
**Status**: ✅ READY FOR REVIEW
**Approved By**: _Pending_

---

**END OF CHANGESET**
