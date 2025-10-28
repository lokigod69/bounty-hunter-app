# Production Runbook - Proposal 006
## Add RLS to Unused Tables

**Date**: 2025-01-25
**Priority**: P2 (Medium)
**Risk**: 🟢 LOW - Adding RLS to unused tables (defensive measure)
**Downtime**: 0 seconds

---

## What This Does

Adds minimal owner-only RLS policies to `marketplace_bounties` and `collected_bounties` tables.

**Why**: These tables exist in schema but are NOT used by the app (app uses `rewards_store` + `collected_rewards` instead). Adding RLS prevents accidental data leaks if these tables are queried.

**Future**: Proposal 001 will drop these tables entirely after data verification.

---

## Tables Secured

### 1. marketplace_bounties
- Enable RLS
- Policy: `mb_owner_select` - Users can only SELECT their own bounties (creator_id = auth.uid())
- Policy: `mb_owner_write` - Users can only INSERT/UPDATE/DELETE their own bounties

### 2. collected_bounties
- Enable RLS
- Policy: `cb_owner_select` - Users can only SELECT their own collections (collector_id = auth.uid())
- Policy: `cb_owner_write` - Users can only INSERT/UPDATE/DELETE their own collections

---

## Prerequisites

1. ✅ Proposal 003/004/005 completed
2. ✅ Production schema backup recent (< 24 hours)
3. ✅ `PROD_CONFIRM=YES` environment variable set

---

## Step 1: Backup Production Schema

```powershell
$env:PROD_CONFIRM = "YES"
powershell -ExecutionPolicy Bypass -File scripts/prod/backup_schema.ps1
```

**Expected Output**:
```
Backup written: supabase\schema_backup_YYYYMMDD_HHMMSS.sql
```

---

## Step 2: Apply Migration

```powershell
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

$psqlPath = "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe"
& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -f db\proposals\006_rls_unused_tables.up.sql

$env:PGPASSWORD = $null
```

**Expected Output**:
```
BEGIN
ALTER TABLE
CREATE POLICY
CREATE POLICY
ALTER TABLE
CREATE POLICY
CREATE POLICY
COMMIT
```

---

## Step 3: Validate Migration

```powershell
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

$queries = @'
-- Verify RLS enabled
SELECT relname, relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND relname IN ('marketplace_bounties', 'collected_bounties')
ORDER BY relname;

-- Verify policies exist (Postgres 18 uses 'policyname' column)
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('marketplace_bounties', 'collected_bounties')
ORDER BY tablename, policyname;
'@

$queries | & $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres"

$env:PGPASSWORD = $null
```

**Expected Output**:
```
       relname        | relrowsecurity
----------------------+----------------
 collected_bounties   | t
 marketplace_bounties | t
(2 rows)

      tablename       |   policyname
----------------------+----------------
 collected_bounties   | cb_owner_select
 collected_bounties   | cb_owner_write
 marketplace_bounties | mb_owner_select
 marketplace_bounties | mb_owner_write
(4 rows)
```

**Success Criteria**:
- ✅ Both tables show `relrowsecurity = t`
- ✅ 4 policies total (2 per table)

---

## Step 4: Test Application

**Test Scenario**: Verify app still works (app doesn't use these tables)

1. Login to app: https://bounty-hunter-app.vercel.app
2. Navigate to **Rewards Store** page
3. Create a new reward (uses `rewards_store` table - not affected)
4. Claim a reward (uses `collected_rewards` table - not affected)
5. **Expected**: All functionality works normally (no errors)

**If Errors**: Check browser console for RPC errors → Run rollback

---

## Step 5: Rollback (Emergency Only)

```powershell
$env:PROD_CONFIRM = "YES"
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -f db\proposals\006_rls_unused_tables.down.sql

$env:PGPASSWORD = $null
```

**Expected Output**:
```
BEGIN
DROP POLICY
DROP POLICY
ALTER TABLE
DROP POLICY
DROP POLICY
ALTER TABLE
COMMIT
```

**Rollback Time**: < 5 seconds

---

## Success Criteria

- ✅ `marketplace_bounties` has RLS enabled + 2 policies
- ✅ `collected_bounties` has RLS enabled + 2 policies
- ✅ App functionality unaffected (rewards store works)
- ✅ No errors in Supabase logs

---

## Next Steps

After successful deployment:
1. Update [plan.md](plan.md) → mark Section 0.6 (or new section) as 🟩 Complete
2. Update [CHANGESET_20250125.md](docs/sql-inventory/CHANGESET_20250125.md) → mark Proposal 006 as Applied
3. Proceed to Proposal 007 (pg_net schema cleanup)

---

**Created**: 2025-01-25
**Estimated Time**: 5 minutes
**Actual Downtime**: 0 seconds

---

**END OF RUNBOOK**
