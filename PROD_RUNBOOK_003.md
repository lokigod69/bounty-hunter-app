# Production Runbook: Proposal 003 (collected_rewards RLS)

**Date**: 2025-01-25
**Priority**: P0 (CRITICAL)
**Issue**: `collected_rewards` table has RLS enabled but ZERO policies - feature broken
**Impact**: Users cannot view collected rewards (MyCollectedRewardsPage returns empty)
**Risk**: LOW - Adding policies to enable access, not restricting
**Estimated Time**: 5 minutes
**Rollback**: Simple DROP statements (included below)

---

## Pre-Flight Checklist

- [ ] Docker is running (for local test)
- [ ] Supabase CLI installed (`supabase --version`)
- [ ] Database password available (from Supabase Dashboard > Settings > Database)
- [ ] Backup command ready (below)
- [ ] Rollback script ready (below)

---

## Step 1: Backup Production Schema

**CRITICAL**: Always backup before applying changes.

```powershell
# Set database password (from Supabase Dashboard)
$env:PGPASSWORD = "<YOUR_DB_PASSWORD>"

# Backup schema (schema-only, no data)
pg_dump --schema-only --no-owner --no-privileges --quote-all-identifiers `
  --role=postgres `
  --host "aws-0-us-east-2.pooler.supabase.com" --port 5432 `
  --username "postgres.tsnjpylkgsovjujoczll" --dbname "postgres" `
  -f "supabase\schema_backup_$(get-date -Format yyyyMMdd_HHmmss).sql"

# Clear password from environment
Remove-Item Env:\PGPASSWORD
```

**Expected**: File created in `supabase\schema_backup_YYYYMMDD_HHMMSS.sql` (~500KB)

---

## Step 2: Apply Proposal 003 (UP Migration)

```powershell
# Set database password
$env:PGPASSWORD = "<YOUR_DB_PASSWORD>"

# Apply migration
psql "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -f db\proposals\003_rls_collected_rewards.up.sql

# Clear password
Remove-Item Env:\PGPASSWORD
```

**Expected Output**:
```
BEGIN
CREATE POLICY
CREATE POLICY
CREATE POLICY
ALTER TABLE
COMMENT
COMMIT
```

**If ERROR occurs**: STOP. Do not proceed. Check error message and run rollback (Step 5).

---

## Step 3: Validation (SQL Queries)

```powershell
# Set database password
$env:PGPASSWORD = "<YOUR_DB_PASSWORD>"

# Run validation queries
psql "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres"
```

**Inside psql session, run these queries**:

### Query 1: Verify RLS is still enabled
```sql
SELECT relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'collected_rewards';
```
**Expected**: `t` (true)

### Query 2: Count policies (should be 3)
```sql
SELECT count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'collected_rewards';
```
**Expected**: `3`

### Query 3: List all policies
```sql
SELECT polname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'collected_rewards'
ORDER BY polname;
```
**Expected**:
```
                       polname                        |  cmd   |     roles
------------------------------------------------------+--------+----------------
 Creators can view collections of their rewards       | SELECT | {authenticated}
 Users can collect rewards                            | INSERT | {authenticated}
 Users can view own collected rewards                 | SELECT | {authenticated}
```

### Query 4: Verify UNIQUE constraint exists
```sql
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.collected_rewards'::regclass
AND conname = 'collected_rewards_unique_claim';
```
**Expected**: 1 row with `contype = 'u'` (unique)

**Exit psql**: `\q`

```powershell
# Clear password
Remove-Item Env:\PGPASSWORD
```

---

## Step 4: Validation (App Smoke Test)

**Prerequisite**: Have 2 test users in production (or use existing accounts).

### Test Scenario 1: User can view own collected rewards
1. Log in as **User A** (collector)
2. Navigate to `/my-rewards` (MyCollectedRewardsPage)
3. **Expected**: Page loads, shows rewards collected by User A (or empty state if none)
4. **Previously**: Page showed empty even if User A had collected rewards

### Test Scenario 2: User cannot view other users' collected rewards
1. Still logged in as **User A**
2. Open browser console
3. Run:
   ```javascript
   await supabase.from('collected_rewards').select('*')
   ```
4. **Expected**: Returns only rows where `collector_id = User A's ID`
5. **Previously**: Returned empty (no policies)

### Test Scenario 3: Creator can view who collected their rewards
1. Log in as **User B** (creator who made a reward)
2. Check if User B can query collections of their rewards
3. **Expected**: User B can see who collected rewards they created
4. **Previously**: Empty

**If ANY test fails**: Run rollback immediately (Step 5).

---

## Step 5: Rollback (If Needed)

**ONLY run this if Step 3 or Step 4 validation fails.**

```powershell
# Set database password
$env:PGPASSWORD = "<YOUR_DB_PASSWORD>"

# Apply rollback (DOWN migration)
psql "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -f db\proposals\003_rls_collected_rewards.down.sql

# Clear password
Remove-Item Env:\PGPASSWORD
```

**Expected Output**:
```
BEGIN
DROP POLICY
DROP POLICY
DROP POLICY
ALTER TABLE
COMMIT
```

**Verify rollback**:
```sql
SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collected_rewards';
-- Expected: 0 (back to broken state)
```

**Then**: Investigate error, fix migration, re-test locally before retrying.

---

## Step 6: Post-Deployment Monitor

**For 15 minutes after deployment**:

1. **Check Supabase Logs** (Dashboard > Logs > Database)
   - Look for RLS policy errors
   - Look for constraint violations

2. **Monitor Error Tracking** (if you have Sentry/etc)
   - Watch for `useCollectedRewards` errors
   - Watch for `collected_rewards` query failures

3. **User Feedback**
   - Check if users can now see MyCollectedRewardsPage
   - Check if any users report permission errors

**If errors appear**: Run rollback (Step 5) and investigate.

---

## Success Criteria

- ✅ 3 policies exist on `collected_rewards` table
- ✅ UNIQUE constraint `collected_rewards_unique_claim` exists
- ✅ MyCollectedRewardsPage loads for users with collected rewards
- ✅ Users can only see their own collected rewards (RLS working)
- ✅ Creators can see who collected their rewards
- ✅ No errors in Supabase logs for 15 minutes
- ✅ No user complaints about broken page

---

## Troubleshooting

### Error: "duplicate key value violates unique constraint"
**Cause**: Existing duplicate rows in `collected_rewards` (user collected same reward twice)
**Solution**:
1. Run rollback to remove constraint
2. Find duplicates:
   ```sql
   SELECT reward_id, collector_id, count(*)
   FROM collected_rewards
   GROUP BY reward_id, collector_id
   HAVING count(*) > 1;
   ```
3. Manually delete duplicates (keep oldest row)
4. Re-apply migration

### Error: "permission denied for table collected_rewards"
**Cause**: Policy logic error or auth.uid() not set
**Solution**:
1. Run rollback
2. Check policy USING clauses in migration
3. Test locally with seed data first
4. Re-apply after fixing

### Error: "relation 'collected_rewards' does not exist"
**Cause**: Wrong database or schema
**Solution**: Verify connection string points to correct database

---

## Quick Reference

**Connection String**:
```
host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres
```

**Files**:
- UP migration: `db\proposals\003_rls_collected_rewards.up.sql`
- DOWN migration: `db\proposals\003_rls_collected_rewards.down.sql`
- Backup location: `supabase\schema_backup_YYYYMMDD_HHMMSS.sql`

**Estimated Downtime**: 0 seconds (policies added online, no locks)

**Affected Users**: All users trying to view MyCollectedRewardsPage (currently broken for everyone)

**Post-Deployment**: Feature now works - users can view collected rewards

---

**END OF RUNBOOK**
