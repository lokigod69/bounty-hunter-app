# Proposal 005: Auth OTP Hardening (Dashboard-Only)

**Date**: 2025-01-25
**Priority**: P1 (High)
**Type**: Dashboard Configuration (No SQL Migration)
**Risk**: 🟢 LOW - Configuration changes only, fully reversible

---

## Executive Summary

**Problem**: Default OTP expiry (1 hour) creates large window for token theft/replay attacks. Compromised passwords not checked. Anonymous auth may be unused.

**Solution**: Configure Supabase Dashboard settings (no SQL changes to `auth.*` schema needed).

**Impact**: Reduces OTP attack window from 60 minutes → 10 minutes. Prevents use of breached passwords. Disables unused auth methods.

---

## Why Not SQL?

The `auth.one_time_tokens` table is owned by `supabase_auth_admin` (not `postgres`). Attempts to modify auth schema objects (indexes, functions, triggers) will fail with permission errors on hosted Supabase.

**Dashboard settings** are the correct approach for auth configuration on managed Supabase instances.

---

## Required Dashboard Changes

### 1. Set OTP Expiry to 10 Minutes

**Current**: 3600 seconds (1 hour - default)
**Recommended**: 600 seconds (10 minutes)

**Steps**:
1. **Supabase Dashboard** → Authentication → Settings
2. Scroll to **Email Auth** section
3. Find **OTP Expiry** setting
4. Change from `3600` to `600`
5. Click **Save**

**Alternative**: `900` seconds (15 minutes) if users need more time

**Benefit**: Reduces window for OTP interception/replay attacks by 6x.

---

### 2. Enable Compromised Password Check

**Current**: Disabled (default)
**Recommended**: Enabled

**Steps**:
1. **Supabase Dashboard** → Authentication → Settings
2. Scroll to **Password** section
3. Find **Compromised Password Check** toggle
4. Toggle **ON** (green)
5. Click **Save**

**Integration**: Have I Been Pwned API (checks password against known breach databases)

**Benefit**: Prevents users from using passwords leaked in data breaches.

**Note**: This app uses Magic Link auth, so password checks are only relevant if password auth is added later.

---

### 3. Disable Anonymous Sign-ins (If Unused)

**Current**: Unknown (check dashboard)
**Recommended**: Disabled (if app doesn't use `signInAnonymously()`)

**Steps**:
1. **Supabase Dashboard** → Authentication → Providers
2. Find **Anonymous** provider
3. If toggle is **ON** and app does NOT use anonymous auth:
   - Toggle **OFF**
   - Click **Save**
4. If toggle is **OFF** → no action needed

**Verification** (check codebase first):
```bash
rg "signInAnonymously" src/
```
If found → **DO NOT DISABLE** (app requires it)
If not found → **SAFE TO DISABLE**

**Benefit**: Reduces attack surface by removing unused authentication method.

---

## Validation Steps

After applying dashboard changes:

### 1. Verify Settings

- [ ] Navigate to **Supabase Dashboard** → Authentication → Settings
- [ ] **OTP Expiry** shows `600` seconds (or `900`)
- [ ] **Compromised Password Check** shows **Enabled**
- [ ] (If applicable) **Anonymous** provider shows **Disabled**

### 2. Test Magic Link Login

1. Logout from app: https://bounty-hunter-app.vercel.app
2. Click **Login**
3. Enter email address
4. Click **Send Magic Link**
5. Check email inbox
6. Click link **within 10 minutes**
7. **Expected**: Successful login
8. **Test Expiry**: Request new link, wait > 10 minutes, click
9. **Expected**: "Link expired" error

---

## Rollback

**If issues occur**, revert dashboard settings:

1. **OTP Expiry** → `3600` seconds (1 hour)
2. **Compromised Password Check** → Disabled
3. **Anonymous** → Enabled (if previously enabled)

**Rollback Time**: < 2 minutes
**Risk**: None (all settings reversible)

---

## Success Criteria

- ✅ OTP expiry = 600 seconds (10 minutes)
- ✅ Compromised password check enabled
- ✅ Anonymous sign-ins disabled (if unused)
- ✅ Magic link login works within 10-minute window
- ✅ Magic link expires after 10 minutes
- ✅ No auth errors in Supabase logs

---

## Deployment Checklist

Use the detailed step-by-step guide: [PROPOSAL_005_DASHBOARD_CHECKLIST.md](../../PROPOSAL_005_DASHBOARD_CHECKLIST.md)

**Estimated Time**: 5 minutes (dashboard configuration only)
**Downtime**: 0 seconds
**SQL Changes**: None

---

## References

- [PROPOSAL_005_DASHBOARD_CHECKLIST.md](../../PROPOSAL_005_DASHBOARD_CHECKLIST.md) - Step-by-step instructions
- [PROD_RUNBOOK_005.md](../../PROD_RUNBOOK_005.md) - Production deployment guide
- [PROD_VALIDATION_005.md](../../docs/sql-inventory/PROD_VALIDATION_005.md) - Validation results (created after deployment)

---

**Created**: 2025-01-25
**Validated**: 2025-01-25 (dashboard-only)

---

**END OF PROPOSAL**
