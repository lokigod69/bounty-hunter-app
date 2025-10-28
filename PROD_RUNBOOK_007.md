# Production Runbook - Proposal 007
## pg_net Extension Cleanup

**Date**: 2025-01-25
**Priority**: P2 (Medium)
**Risk**: 🟡 MEDIUM - Extension changes (requires verification)
**Downtime**: 0 seconds

---

## What This Does

**Problem**: Supabase Advisor recommends `pg_net` extension NOT be in `public` schema.

**Two Options**:
- **Option A**: Move pg_net to `net` schema (if app uses it)
- **Option B**: Drop pg_net entirely (if app doesn't use it)

**Choose ONE option** based on verification step below.

---

## Step 0: Verify pg_net Usage

**Run this query to check if pg_net is used**:

```powershell
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

$psqlPath = "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe"

$query = @'
-- Check if pg_net extension exists
SELECT extname, extversion, nspname
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE extname = 'pg_net';

-- Check if any functions use pg_net (http_post, http_get)
SELECT proname, prosrc
FROM pg_proc
WHERE prosrc LIKE '%http_post%' OR prosrc LIKE '%http_get%';
'@

$query | & $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres"

$env:PGPASSWORD = $null
```

**Interpretation**:
- **If pg_net extension found**: Check if functions use it
  - **If functions use http_post/http_get**: Use **Option A** (move to net schema)
  - **If NO functions use http_post/http_get**: Use **Option B** (drop extension)
- **If pg_net extension NOT found**: Skip this proposal (nothing to do)

---

## Option A: Move pg_net to net Schema (If Used)

### Prerequisites
1. ✅ Verified pg_net is used by functions
2. ✅ Production schema backup recent (< 24 hours)
3. ✅ `PROD_CONFIRM=YES` environment variable set

### Step 1: Backup Production Schema

```powershell
$env:PROD_CONFIRM = "YES"
powershell -ExecutionPolicy Bypass -File scripts/prod/backup_schema.ps1
```

### Step 2: Apply Migration

```powershell
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -f db\proposals\007_pg_net_cleanup_option_A_move.up.sql

$env:PGPASSWORD = $null
```

**Expected Output**:
```
BEGIN
CREATE SCHEMA
ALTER EXTENSION
COMMIT
```

### Step 3: Validate Migration

```powershell
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

$query = @'
-- Verify pg_net is now in net schema
SELECT extname, nspname AS schema_name
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE extname = 'pg_net';
'@

$query | & $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres"

$env:PGPASSWORD = $null
```

**Expected Output**:
```
 extname | schema_name
---------+-------------
 pg_net  | net
(1 row)
```

### Step 4: Update Function References (If Needed)

**If functions use `http_post()` without schema prefix**, update to `net.http_post()`:

```sql
-- Example: Update notify_new_bounty function
CREATE OR REPLACE FUNCTION public.notify_new_bounty()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Change from: PERFORM http_post(...)
  -- To:          PERFORM net.http_post(...)
  PERFORM net.http_post(
    url:='https://...',
    body:=...,
    headers:=...
  );
  RETURN NEW;
END;
$$;
```

### Step 5: Rollback (Emergency)

```powershell
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -f db\proposals\007_pg_net_cleanup_option_A_move.down.sql

$env:PGPASSWORD = $null
```

---

## Option B: Drop pg_net (If NOT Used)

### Prerequisites
1. ✅ Verified pg_net is NOT used by any functions
2. ✅ Production schema backup recent (< 24 hours)
3. ✅ `PROD_CONFIRM=YES` environment variable set

### Step 1: Backup Production Schema

```powershell
$env:PROD_CONFIRM = "YES"
powershell -ExecutionPolicy Bypass -File scripts/prod/backup_schema.ps1
```

### Step 2: Apply Migration

```powershell
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -f db\proposals\007_pg_net_cleanup_option_B_drop.up.sql

$env:PGPASSWORD = $null
```

**Expected Output**:
```
BEGIN
DROP EXTENSION
COMMIT
```

### Step 3: Validate Migration

```powershell
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

$query = @'
-- Verify pg_net is dropped
SELECT extname FROM pg_extension WHERE extname = 'pg_net';
'@

$query | & $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres"

$env:PGPASSWORD = $null
```

**Expected Output**:
```
 extname
---------
(0 rows)
```

### Step 4: Test Application

1. Login to app: https://bounty-hunter-app.vercel.app
2. Test core functionality (create task, create reward, etc.)
3. **Expected**: No errors (app doesn't use pg_net)

### Step 5: Rollback (Emergency)

```powershell
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -f db\proposals\007_pg_net_cleanup_option_B_drop.down.sql

$env:PGPASSWORD = $null
```

---

## Success Criteria

**Option A**:
- ✅ pg_net extension in `net` schema (not `public`)
- ✅ Functions updated to use `net.http_post()`
- ✅ App functionality works (if functions use pg_net)

**Option B**:
- ✅ pg_net extension dropped
- ✅ App functionality works (no pg_net dependency)

---

## Next Steps

After successful deployment:
1. Update [plan.md](plan.md) → mark Section 0.7 (or new section) as 🟩 Complete
2. Update [CHANGESET_20250125.md](docs/sql-inventory/CHANGESET_20250125.md) → mark Proposal 007 as Applied
3. Phase 0 complete → review remaining Advisor warnings

---

**Created**: 2025-01-25
**Estimated Time**: 10 minutes (Option A) or 5 minutes (Option B)
**Actual Downtime**: 0 seconds

---

**END OF RUNBOOK**
