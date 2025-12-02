# Production Runbook - Proposal 004
## Harden SECURITY DEFINER Functions (search_path)

**Date**: 2025-01-25
**Priority**: P1 (High)
**Risk**: 🟢 LOW - No data changes, only function security hardening
**Downtime**: 0 seconds

---

## What This Does

Adds `SET search_path = public, pg_temp` to all 5 SECURITY DEFINER functions to prevent search_path poisoning attacks.

**Functions Hardened**:
1. `create_reward_store_item`
2. `delete_reward_store_item`
3. `update_reward_store_item`
4. `increment_user_credits`
5. `handle_new_user`

**Security Benefit**: Prevents malicious users from creating tables/functions in their own schema to hijack unqualified table references (e.g., `rewards_store` → `malicious_schema.rewards_store`).

---

## Prerequisites

1. ✅ Proposal 003 deployed and validated
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

**Verify**:
```powershell
ls supabase\schema_backup_*.sql | sort LastWriteTime -Descending | select -First 1
```

---

## Step 2: Apply Migration

```powershell
# Ensure PROD_CONFIRM is set
echo $env:PROD_CONFIRM  # Should print "YES"

# Apply migration
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

$psqlPath = "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe"
& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -f db\proposals\004_harden_function_search_path.up.sql

$env:PGPASSWORD = $null
```

**Expected Output**:
```
BEGIN
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
COMMIT
```

**If Errors**: STOP and run rollback (see Step 5)

---

## Step 3: Validate Migration

```powershell
# Run validation queries
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

$queries = @'
-- Verify all SECURITY DEFINER functions have search_path set
SELECT
  p.proname AS function_name,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_mode,
  pg_get_functiondef(p.oid) LIKE '%SET search_path%' AS has_search_path_set
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef = true
ORDER BY p.proname;
'@

$queries | & $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres"

$env:PGPASSWORD = $null
```

**Expected Output** (5 functions, all with `has_search_path_set = t`):
```
       function_name        | security_mode    | has_search_path_set
----------------------------+------------------+--------------------
 create_reward_store_item   | SECURITY DEFINER | t
 delete_reward_store_item   | SECURITY DEFINER | t
 handle_new_user            | SECURITY DEFINER | t
 increment_user_credits     | SECURITY DEFINER | t
 update_reward_store_item   | SECURITY DEFINER | t
(5 rows)
```

**If ANY function shows `f` (false)**: STOP and run rollback

---

## Step 4: Test Application

**Test Scenario**: Create a new reward in RewardsStorePage

1. Login to app: https://bounty-hunter-app.vercel.app
2. Navigate to **Rewards Store** page
3. Click **Create Bounty** button
4. Fill form:
   - Name: "Test Search Path Hardening"
   - Description: "Validating Proposal 004"
   - Credit Cost: 50
   - Assign to: (select a friend)
5. Click **Create**
6. **Expected**: Reward created successfully (no errors)
7. **Verify**: Reward appears in list
8. Delete test reward (cleanup)

**If Errors in Console**: Check browser DevTools → Console for RPC errors → Run rollback

---

## Step 5: Rollback (Emergency Only)

**Only run if Step 3 validation fails or Step 4 app errors occur**

```powershell
$env:PROD_CONFIRM = "YES"
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -f db\proposals\004_harden_function_search_path.down.sql

$env:PGPASSWORD = $null
```

**Expected Output**:
```
BEGIN
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
COMMIT
```

**Rollback Time**: < 5 seconds
**Risk**: None (restores original function definitions)

---

## Step 6: Monitor (15 minutes)

After successful deployment, monitor for 15 minutes:

1. **Supabase Dashboard** → Logs → Database
   - Look for: Function execution errors
   - Expected: No errors related to `create_reward_store_item`, `update_reward_store_item`, `delete_reward_store_item`

2. **App Functionality**:
   - Create 2-3 test rewards
   - Update a reward
   - Delete a reward
   - All should work normally

3. **Performance**:
   - Check response times (should be unchanged)
   - No spike in error rate

**If All Clear**: Deployment successful ✅

---

## Success Criteria

- ✅ All 5 functions show `has_search_path_set = t`
- ✅ App can create/update/delete rewards without errors
- ✅ No database errors in logs
- ✅ Response times unchanged

---

## Communication

**Before Deployment**:
- Notify team: "Deploying Proposal 004 (function hardening) - zero downtime, low risk"

**After Deployment**:
- Send "all clear": "Proposal 004 deployed successfully - 5 functions hardened against search_path attacks"

---

## Troubleshooting

**Error: "function does not exist"**
- Cause: Migration failed to create function
- Fix: Run rollback, check for syntax errors in .up.sql

**Error: "permission denied for schema public"**
- Cause: Insufficient privileges
- Fix: Verify logged in as `postgres` user (not anon/authenticated role)

**Error: "syntax error near SET"**
- Cause: Incompatible PostgreSQL version
- Fix: Check PostgreSQL version (should be 15+), run rollback

---

## Next Steps

After successful deployment:
1. Update [plan.md](plan.md) → mark Section 0.3 as 🟩 Complete
2. Update [CHANGESET_20250125.md](docs/sql-inventory/CHANGESET_20250125.md) → mark Proposal 004 as Applied
3. Proceed to Proposal 005 (Auth OTP hardening)

---

**Created**: 2025-01-25
**Estimated Time**: 10 minutes
**Actual Downtime**: 0 seconds

---

**END OF RUNBOOK**
