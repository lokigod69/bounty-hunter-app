# Proposal 005 - Dashboard Configuration Checklist
## Auth OTP Hardening - Manual Steps

**Date**: 2025-01-25
**Priority**: P1 (High)
**Type**: Dashboard Configuration (No SQL Migration Required for These Steps)

---

## Overview

These settings **cannot be applied via SQL migration** - they must be configured manually in the Supabase Dashboard. Complete these steps **after** applying the SQL migration ([005_auth_otp_hardening.up.sql](db/proposals/005_auth_otp_hardening.up.sql)).

**SQL Migration Handles**:
- ✅ Index on `auth.one_time_tokens.created_at`
- ✅ Cleanup function `auth.cleanup_expired_otp_tokens()`

**Dashboard Configuration Handles** (this checklist):
- OTP expiry time
- Compromised password check
- Anonymous sign-ins

---

## Prerequisites

- [ ] SQL migration ([005_auth_otp_hardening.up.sql](db/proposals/005_auth_otp_hardening.up.sql)) applied successfully
- [ ] Access to Supabase Dashboard with project admin permissions
- [ ] Production project URL: https://supabase.com/dashboard/project/tsnjpylkgsovjujoczll

---

## Step 1: Configure OTP Expiry (10-15 minutes)

**Why**: Reduce window for OTP token theft/replay attacks

**Current Default**: 1 hour (3600 seconds)
**Recommended**: 10 minutes (600 seconds)

**Steps**:
1. Navigate to **Supabase Dashboard** → https://supabase.com/dashboard/project/tsnjpylkgsovjujoczll
2. Click **Authentication** (left sidebar)
3. Click **Settings** tab
4. Scroll to **Email Auth** section
5. Find **OTP Expiry** setting
6. Change value from `3600` to `600` (10 minutes)
   - Alternative: `900` (15 minutes) if users need more time
7. Click **Save**

**Verification**:
- [ ] OTP Expiry shows `600` seconds
- [ ] Test login: Send magic link → verify email arrives
- [ ] Click link within 10 minutes → login successful
- [ ] Wait > 10 minutes → link expired (expected)

**Rollback**: Change back to `3600` seconds

---

## Step 2: Enable Compromised Password Check

**Why**: Prevent users from using passwords leaked in data breaches (Have I Been Pwned integration)

**Current Default**: Disabled
**Recommended**: Enabled

**Steps**:
1. In **Supabase Dashboard** → **Authentication** → **Settings**
2. Scroll to **Password** section
3. Find **Compromised Password Check** toggle
4. Toggle **ON** (green)
5. Click **Save**

**Verification**:
- [ ] Toggle shows **Enabled**
- [ ] Test (optional): Try signing up with a known compromised password (e.g., "password123")
   - Expected: Error message "Password has been found in a data breach"

**Note**: This app uses **Magic Link** authentication, so password checks are only relevant if you add password auth later.

**Rollback**: Toggle **OFF**

---

## Step 3: Disable Anonymous Sign-ins (Optional)

**Why**: Reduce attack surface if anonymous auth is not used

**Current State**: Unknown (check dashboard)
**Recommended**: Disabled (if not used by app)

**Steps**:
1. In **Supabase Dashboard** → **Authentication** → **Providers**
2. Scroll to **Anonymous** provider
3. If toggle is **ON** and app does NOT use anonymous sign-ins:
   - Toggle **OFF**
   - Click **Save**
4. If toggle is **OFF** → no action needed

**Verification**:
- [ ] Anonymous provider shows **Disabled**
- [ ] Test app login with magic link → still works (unaffected)

**⚠️ IMPORTANT**: Only disable if your app does NOT use `supabase.auth.signInAnonymously()`. Check codebase first:

```powershell
# Search for anonymous auth usage
rg "signInAnonymously" src/
```

If found → **DO NOT DISABLE** (app requires it)

**Rollback**: Toggle **ON**

---

## Step 4: Verify SQL Migration Components

**After completing dashboard steps**, verify the SQL migration is working:

```powershell
# Connect to production database
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

$psqlPath = "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe"

# 1. Verify index exists
& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -c "SELECT indexname FROM pg_indexes WHERE schemaname = 'auth' AND tablename = 'one_time_tokens' AND indexname = 'idx_one_time_tokens_created_at';"

# Expected: idx_one_time_tokens_created_at

# 2. Verify cleanup function exists
& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -c "SELECT proname FROM pg_proc WHERE proname = 'cleanup_expired_otp_tokens';"

# Expected: cleanup_expired_otp_tokens

# 3. Test cleanup function (dry run)
& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -c "SELECT * FROM auth.cleanup_expired_otp_tokens();"

# Expected: deleted_count (number of expired tokens removed)

$env:PGPASSWORD = $null
```

**Verification Checklist**:
- [ ] Index `idx_one_time_tokens_created_at` exists
- [ ] Function `cleanup_expired_otp_tokens` exists
- [ ] Cleanup function runs without errors

---

## Step 5: Schedule Regular Cleanup (Optional)

**Why**: Prevent `auth.one_time_tokens` table from growing indefinitely

**Recommendation**: Run cleanup function daily via cron job or Supabase Edge Function

**Option A: Manual Cleanup** (Run monthly)
```sql
SELECT * FROM auth.cleanup_expired_otp_tokens();
```

**Option B: Automated Cleanup** (via Edge Function + Supabase Cron)
1. Create edge function that calls `cleanup_expired_otp_tokens()`
2. Schedule via Supabase Dashboard → Edge Functions → Cron Triggers
3. Run daily at 2 AM UTC

**Not Implemented Yet**: Add to future Phase 1 work if table bloat becomes an issue

---

## Success Criteria

**Dashboard Configuration**:
- ✅ OTP expiry set to 600 seconds (10 minutes)
- ✅ Compromised password check enabled
- ✅ Anonymous sign-ins disabled (if not used)

**SQL Components**:
- ✅ Index `idx_one_time_tokens_created_at` exists
- ✅ Function `cleanup_expired_otp_tokens` exists and callable

**App Functionality**:
- ✅ Magic link login still works
- ✅ OTP expires after 10 minutes (test with delayed click)
- ✅ No errors in Supabase logs

---

## Rollback

**Dashboard Settings**:
1. OTP Expiry → 3600 seconds (1 hour)
2. Compromised Password Check → Disabled
3. Anonymous Sign-ins → Enabled (if previously enabled)

**SQL Migration**:
```powershell
# Run rollback script
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -f db\proposals\005_auth_otp_hardening.down.sql

$env:PGPASSWORD = $null
```

---

## Next Steps

After completing all steps:
1. Update [plan.md](plan.md) → mark Section 0.4 as 🟩 Complete
2. Update [CHANGESET_20250125.md](docs/sql-inventory/CHANGESET_20250125.md) → mark Proposal 005 as Applied
3. Phase 0 complete → proceed to Phase 1 (see plan.md)

---

**Created**: 2025-01-25
**Estimated Time**: 15 minutes (SQL + Dashboard)
**Risk**: 🟢 LOW - All changes reversible

---

**END OF CHECKLIST**
