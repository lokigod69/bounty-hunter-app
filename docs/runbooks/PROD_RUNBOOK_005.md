# Production Runbook - Proposal 005
## Auth OTP Hardening

**Date**: 2025-01-25
**Priority**: P1 (High)
**Risk**: 🟢 LOW - Index creation + cleanup function (no schema changes)
**Downtime**: 0 seconds

---

## What This Does

**SQL Migration**:
1. Creates index on `auth.one_time_tokens.created_at` for efficient cleanup
2. Creates function `auth.cleanup_expired_otp_tokens()` to purge expired tokens

**Dashboard Configuration** (Manual - see [PROPOSAL_005_DASHBOARD_CHECKLIST.md](PROPOSAL_005_DASHBOARD_CHECKLIST.md)):
- Set OTP expiry to 10-15 minutes
- Enable compromised password check
- Disable anonymous sign-ins (if unused)

**Security Benefit**: Reduces OTP token theft window, prevents use of compromised passwords, reduces attack surface.

---

## Prerequisites

1. ✅ Proposal 004 deployed and validated
2. ✅ Production schema backup recent (< 24 hours)
3. ✅ `PROD_CONFIRM=YES` environment variable set
4. ✅ Access to Supabase Dashboard (for manual steps)

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

## Step 2: Apply SQL Migration

```powershell
# Ensure PROD_CONFIRM is set
echo $env:PROD_CONFIRM  # Should print "YES"

# Apply migration
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

$psqlPath = "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe"
& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -f db\proposals\005_auth_otp_hardening.up.sql

$env:PGPASSWORD = $null
```

**Expected Output**:
```
BEGIN
CREATE INDEX
CREATE FUNCTION
COMMIT
```

**If Errors**: STOP and run rollback (see Step 5)

---

## Step 3: Validate SQL Migration

```powershell
# Run validation queries
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

$queries = @'
-- 1. Verify index exists
SELECT indexname FROM pg_indexes
WHERE schemaname = 'auth' AND tablename = 'one_time_tokens' AND indexname = 'idx_one_time_tokens_created_at';

-- 2. Verify cleanup function exists
SELECT proname FROM pg_proc WHERE proname = 'cleanup_expired_otp_tokens';

-- 3. Test cleanup function (dry run)
SELECT * FROM auth.cleanup_expired_otp_tokens();
'@

$queries | & $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres"

$env:PGPASSWORD = $null
```

**Expected Output**:
```
           indexname
------------------------------------
 idx_one_time_tokens_created_at
(1 row)

         proname
--------------------------
 cleanup_expired_otp_tokens
(1 row)

 deleted_count
---------------
             0
(1 row)
```

**Notes**:
- `deleted_count` = 0 is normal if no expired tokens exist yet
- Any positive number means expired tokens were cleaned up successfully

**If Index or Function Missing**: STOP and run rollback

---

## Step 4: Configure Dashboard Settings

**Follow Step-by-Step Guide**: [PROPOSAL_005_DASHBOARD_CHECKLIST.md](PROPOSAL_005_DASHBOARD_CHECKLIST.md)

**Quick Checklist**:
- [ ] Navigate to **Supabase Dashboard** → Authentication → Settings
- [ ] Set **OTP Expiry** to `600` seconds (10 minutes)
- [ ] Enable **Compromised Password Check**
- [ ] Disable **Anonymous Sign-ins** (if app doesn't use it)
- [ ] Click **Save**

**Verification**:
- [ ] Dashboard shows OTP Expiry = 600 seconds
- [ ] Compromised password check = Enabled
- [ ] Anonymous provider = Disabled (if applicable)

---

## Step 5: Test Application

**Test Scenario**: Magic Link Login

1. Logout from app: https://bounty-hunter-app.vercel.app
2. Click **Login**
3. Enter email address
4. Click **Send Magic Link**
5. Check email inbox
6. **Expected**: Email arrives with magic link (within 1-2 minutes)
7. Click link **within 10 minutes**
8. **Expected**: Successful login, redirected to Dashboard
9. **Test Expiry** (optional):
   - Request another magic link
   - Wait > 10 minutes before clicking
   - **Expected**: "Link expired" error

**If Login Fails**: Check Supabase Dashboard → Logs → Auth for errors → Run rollback

---

## Step 6: Rollback (Emergency Only)

**Only run if validation fails or app login broken**

**SQL Rollback**:
```powershell
$env:PROD_CONFIRM = "YES"
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -f db\proposals\005_auth_otp_hardening.down.sql

$env:PGPASSWORD = $null
```

**Expected Output**:
```
BEGIN
DROP FUNCTION
DROP INDEX
COMMIT
```

**Dashboard Rollback** (Manual):
1. OTP Expiry → 3600 seconds (1 hour)
2. Compromised Password Check → Disabled
3. Anonymous Sign-ins → Enabled (if previously enabled)

**Rollback Time**: < 5 seconds (SQL) + 2 minutes (dashboard)
**Risk**: None (restores original state)

---

## Step 7: Monitor (15 minutes)

After successful deployment, monitor for 15 minutes:

1. **Supabase Dashboard** → Logs → Auth
   - Look for: OTP generation errors, login failures
   - Expected: Normal login flow (OTP generated → user clicks → success)

2. **App Functionality**:
   - Test 2-3 magic link logins (different users)
   - All should succeed within 10-minute window

3. **Performance**:
   - Check auth response times (should be unchanged)
   - No spike in auth errors

**If All Clear**: Deployment successful ✅

---

## Success Criteria

**SQL Components**:
- ✅ Index `idx_one_time_tokens_created_at` exists
- ✅ Function `cleanup_expired_otp_tokens` exists and callable
- ✅ Test cleanup function returns deleted_count (0 or positive number)

**Dashboard Settings**:
- ✅ OTP expiry = 600 seconds (10 minutes)
- ✅ Compromised password check enabled
- ✅ Anonymous sign-ins disabled (if unused)

**App Functionality**:
- ✅ Magic link login works within 10 minutes
- ✅ Magic link expires after 10 minutes
- ✅ No auth errors in logs

---

## Communication

**Before Deployment**:
- Notify team: "Deploying Proposal 005 (auth hardening) - zero downtime, may need to re-login"

**After Deployment**:
- Send "all clear": "Proposal 005 deployed successfully - OTP expiry now 10 minutes, cleanup function active"

---

## Troubleshooting

**Error: "permission denied for schema auth"**
- Cause: Insufficient privileges to create index in auth schema
- Fix: Verify logged in as `postgres` superuser (not anon/authenticated role)

**Error: "relation auth.one_time_tokens does not exist"**
- Cause: Incompatible Supabase version or custom schema
- Fix: Check Supabase version (should be recent), run rollback

**Magic Link Expired Immediately**
- Cause: Dashboard OTP expiry set too low (< 60 seconds)
- Fix: Dashboard → OTP Expiry → increase to 600 seconds

**Cleanup Function Returns Error**
- Cause: Permission issue or schema mismatch
- Fix: Check function definition, verify `SET search_path = auth, pg_temp`

---

## Optional: Schedule Cleanup Job

To prevent `auth.one_time_tokens` table bloat, schedule monthly cleanup:

**Option 1: Manual Cleanup** (Run in psql monthly)
```sql
SELECT * FROM auth.cleanup_expired_otp_tokens();
```

**Option 2: Automated Cleanup** (Future - Phase 1)
- Create Supabase Edge Function that calls cleanup function
- Schedule via Supabase Cron (daily at 2 AM UTC)

**Not Critical**: Table bloat is low-priority, only implement if table grows > 100k rows

---

## Next Steps

After successful deployment:
1. Update [plan.md](plan.md) → mark Section 0.4 as 🟩 Complete
2. Update [CHANGESET_20250125.md](docs/sql-inventory/CHANGESET_20250125.md) → mark Proposal 005 as Applied
3. **Phase 0 Complete** 🎉 → Proceed to Phase 1 (see plan.md Section 1)

---

**Created**: 2025-01-25
**Estimated Time**: 15 minutes (SQL + Dashboard)
**Actual Downtime**: 0 seconds

---

**END OF RUNBOOK**
