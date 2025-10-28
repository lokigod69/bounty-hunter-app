# Proposal 005: Auth OTP Security Hardening

**Priority**: P1 (High)
**Status**: 📝 Draft
**Risk**: Low
**Estimated Time**: 5 minutes
**Reversible**: Yes (full DOWN migration)

---

## Problem Statement

The authentication system uses magic link (OTP) authentication but lacks critical security configurations:

1. **OTP Expiry Time**: Default may be too long, increasing phishing window
2. **Compromised Password Check**: Not enabled (if feature available)
3. **Anonymous Sign-Ins**: May be enabled despite not being used
4. **MAILER Configuration**: OTP delivery settings may not be optimized

### Security Risks

| Issue | Risk Level | Impact |
|-------|------------|--------|
| Long OTP expiry (> 15 min) | Medium | Attacker has longer window to phish/intercept OTP codes |
| No compromised password check | Low | Users can use leaked passwords (auth.users password_hash) |
| Anonymous sign-ins enabled | Low | Unused attack surface (if feature not needed) |
| Default MAILER settings | Low | Suboptimal email delivery, potential spam issues |

---

## Current State (from schema_all.sql)

### OTP Token Table Structure

```sql
CREATE TABLE "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);
```

**No expiry column visible** - expiry is likely configured in `auth.config` or Supabase Dashboard settings.

### Auth Configuration Unknowns

The following settings are **NOT** visible in `schema_all.sql` (they live in Supabase config):

- **MAILER_OTP_EXP**: OTP expiration time (default unknown, recommend ≤ 15 minutes = 900 seconds)
- **MAILER_AUTOCONFIRM**: Auto-confirm emails (should be FALSE for security)
- **DISABLE_SIGNUP**: Disable new signups (should be FALSE for our app)
- **ENABLE_ANONYMOUS_SIGN_INS**: Allow anonymous users (recommend FALSE if unused)
- **PASSWORD_MIN_LENGTH**: Minimum password length (not applicable for magic link, but good hygiene)

---

## Proposed Solution

### Option A: Via Supabase Dashboard (Recommended)

**Manual Steps** (not automated via SQL migration):

1. Navigate to **Supabase Dashboard > Authentication > Settings**
2. Configure the following:

| Setting | Recommended Value | Current (Unknown) | Reason |
|---------|-------------------|-------------------|--------|
| **Mailer OTP Expiry** | `900` (15 minutes) | TBD | Reduces phishing window. 15 min is enough for legitimate users. |
| **Enable Email Confirmations** | `true` | TBD | Ensures email ownership verification |
| **Enable Anonymous Sign-Ins** | `false` | TBD | Disable unused feature (app uses magic link only) |
| **Compromised Password Check** | `true` | TBD | Check passwords against breach databases (if available in Supabase) |
| **Email Rate Limit** | `3 per hour` | TBD | Prevent OTP spam/abuse |

3. Click **Save** to apply changes
4. Test magic link flow to ensure OTP expires after 15 minutes

### Option B: Via SQL (Partial - some settings SQL-configurable)

**Note**: Auth configuration is primarily managed via Supabase Dashboard. SQL migrations can configure **database-level** policies but **NOT** auth service settings like OTP expiry.

**What SQL CAN do**:
- Add database policies on `auth.one_time_tokens` to enforce cleanup
- Create triggers to auto-delete expired tokens
- Add indexes for performance

**What SQL CANNOT do**:
- Set MAILER_OTP_EXP (Dashboard only)
- Enable/disable anonymous sign-ins (Dashboard only)
- Configure compromised password check (Dashboard only)

---

## Migration SQL (Database-Level Hardening)

### UP Migration

**File**: `supabase/migrations/20250125140001_auth_otp_hardening.sql`

```sql
-- =====================================================
-- PROPOSAL 005: Auth OTP Security Hardening
-- =====================================================
-- Date: 2025-01-25
-- Priority: P1 (High)
-- Risk: Low (cleanup only, no behavioral changes)
-- Reversible: Yes (see DOWN migration)
--
-- CHANGES:
-- - Add index on auth.one_time_tokens.created_at for cleanup queries
-- - Add function to auto-delete expired OTPs (housekeeping)
-- - (MANUAL) Configure OTP expiry in Supabase Dashboard (15 min)
--
-- NOTE: This migration handles DATABASE-LEVEL hardening only.
--       Auth service settings (OTP expiry, anonymous sign-ins) must be
--       configured via Supabase Dashboard (see proposal doc).
-- =====================================================

-- 1. Add index for efficient OTP cleanup queries
-- (Useful for future cron jobs to delete old OTPs)
CREATE INDEX IF NOT EXISTS idx_one_time_tokens_created_at
ON auth.one_time_tokens (created_at);


-- 2. Create function to delete expired OTPs
-- (Run this periodically via pg_cron or edge function)
CREATE OR REPLACE FUNCTION auth.cleanup_expired_otps(expiry_minutes integer DEFAULT 15)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, pg_temp
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete OTPs older than expiry_minutes
  DELETE FROM auth.one_time_tokens
  WHERE created_at < (now() - (expiry_minutes || ' minutes')::interval);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION auth.cleanup_expired_otps IS
'Deletes OTPs older than specified minutes (default 15). Run via cron for housekeeping.';


-- 3. (OPTIONAL) Create pg_cron job to auto-cleanup OTPs every hour
-- NOTE: Requires pg_cron extension (may not be enabled in Supabase free tier)
-- Uncomment if pg_cron is available:
--
-- SELECT cron.schedule(
--   'cleanup-expired-otps',           -- Job name
--   '0 * * * *',                      -- Run every hour at minute 0
--   $$ SELECT auth.cleanup_expired_otps(15); $$
-- );


-- =====================================================
-- VALIDATION
-- =====================================================

-- Verify index created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'auth'
AND tablename = 'one_time_tokens'
AND indexname = 'idx_one_time_tokens_created_at';
-- Expected: 1 row

-- Verify cleanup function created
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'auth'
AND p.proname = 'cleanup_expired_otps';
-- Expected: 1 row (auth.cleanup_expired_otps)

-- Test cleanup function (dry run - check count before delete)
SELECT COUNT(*) AS old_otps_count
FROM auth.one_time_tokens
WHERE created_at < (now() - interval '15 minutes');
-- Expected: 0 (if no old OTPs) or N (number of expired OTPs)

-- Run cleanup function (safe - only deletes old OTPs)
SELECT auth.cleanup_expired_otps(15);
-- Expected: Number of deleted OTPs
```

---

### DOWN Migration (Rollback)

**File**: `supabase/migrations/20250125140001_auth_otp_hardening_down.sql`

```sql
-- =====================================================
-- ROLLBACK: Proposal 005 - Remove OTP Hardening
-- =====================================================
-- Removes cleanup function and index
-- USE ONLY IF MIGRATION CAUSES ISSUES (unlikely)
-- =====================================================

-- 1. Drop cleanup function
DROP FUNCTION IF EXISTS auth.cleanup_expired_otps(integer);

-- 2. Drop index
DROP INDEX IF EXISTS auth.idx_one_time_tokens_created_at;

-- 3. (OPTIONAL) Remove pg_cron job if created
-- Uncomment if pg_cron job was created:
--
-- SELECT cron.unschedule('cleanup-expired-otps');
```

---

## Manual Configuration (Supabase Dashboard)

**CRITICAL**: The following settings **MUST** be configured manually via Supabase Dashboard after applying the SQL migration.

### Step-by-Step Instructions

1. **Log in to Supabase Dashboard**
   - Navigate to your project: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Navigate to Authentication Settings**
   - Click **Authentication** in left sidebar
   - Click **Settings** tab

3. **Configure Email Auth Settings**

   **Section: Email**
   - ✅ **Enable Email Provider**: `true` (already enabled)
   - ✅ **Confirm Email**: `true` (ensure enabled for security)
   - ✅ **Secure Email Change**: `true` (prevent email hijacking)

   **Section: Email Templates**
   - ✅ **Magic Link OTP Expiry**: Set to `900` seconds (15 minutes)
     - Default may be 3600 (1 hour) - **REDUCE THIS**
   - ✅ **Email Rate Limit**: Set to `3` per hour (prevent abuse)

4. **Configure Security Settings**

   **Section: Security and Protection**
   - ✅ **Enable Anonymous Sign-Ins**: `false` (disable unused feature)
   - ✅ **Enable Compromised Password Check**: `true` (if available - Pro plan feature)
   - ✅ **Minimum Password Length**: `8` (good hygiene, even if using magic link)

5. **Click Save**

6. **Verify Changes**
   - Send test magic link to yourself
   - Wait 16 minutes
   - Attempt to use link - should fail with "Link expired" error
   - If link still works after 16 min, OTP expiry not applied correctly

---

## Testing Plan

### Local Testing (SQL Migration Only)

```bash
# 1. Start local Supabase
supabase start

# 2. Apply migration
psql -h localhost -p 54322 -U postgres -d postgres < supabase/migrations/20250125140001_auth_otp_hardening.sql

# 3. Verify index created
psql -h localhost -p 54322 -U postgres -d postgres -c "
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'auth'
AND tablename = 'one_time_tokens'
AND indexname = 'idx_one_time_tokens_created_at';
"
# Expected: 1 row showing index definition

# 4. Verify cleanup function created
psql -h localhost -p 54322 -U postgres -d postgres -c "
SELECT proname, pg_get_function_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'auth' AND p.proname = 'cleanup_expired_otps';
"
# Expected: 1 row (cleanup_expired_otps(integer))

# 5. Test cleanup function
# Insert test OTP
psql -h localhost -p 54322 -U postgres -d postgres -c "
INSERT INTO auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at)
VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'email_change_current',
  'test_hash_old',
  'test@example.com',
  now() - interval '20 minutes'  -- Expired
);
"

# Run cleanup
psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT auth.cleanup_expired_otps(15);"
# Expected: 1 (1 OTP deleted)

# Verify deletion
psql -h localhost -p 54322 -U postgres -d postgres -c "
SELECT COUNT(*) FROM auth.one_time_tokens WHERE token_hash = 'test_hash_old';
"
# Expected: 0 (OTP deleted)

# 6. Test rollback
psql -h localhost -p 54322 -U postgres -d postgres < supabase/migrations/20250125140001_auth_otp_hardening_down.sql
```

### Production Testing (Dashboard Configuration)

```bash
# 1. Apply dashboard settings (see Manual Configuration section above)

# 2. Test magic link flow
curl -X POST 'https://YOUR_PROJECT_ID.supabase.co/auth/v1/otp' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
# Check email for magic link

# 3. Wait 16 minutes, then click link
# Expected: "Link expired" error

# 4. Send new magic link, click within 15 minutes
# Expected: Successful login

# 5. Verify anonymous sign-ins disabled
curl -X POST 'https://YOUR_PROJECT_ID.supabase.co/auth/v1/signup' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: Error (anonymous sign-ins disabled)
```

---

## Impact Assessment

| Category | Severity | Details |
|----------|----------|---------|
| **Data Loss** | None | No data modifications, only index + cleanup function |
| **Downtime** | None | Index created online, cleanup function non-blocking |
| **Breaking Changes** | **MINOR** | Users have 15 min (not 60 min) to use magic link |
| **User Impact** | Low | Most users click link within 5 min anyway |
| **Security Improvement** | **MEDIUM-HIGH** | Reduces phishing window, disables unused features |
| **Rollback Complexity** | Trivial | Drop index + function |
| **Overall Risk** | **🟢 LOW** | **Safe to apply** |

---

## Success Criteria

### SQL Migration Success

- ✅ Index `idx_one_time_tokens_created_at` exists in `pg_indexes`
- ✅ Function `auth.cleanup_expired_otps` exists in `pg_proc`
- ✅ Cleanup function deletes OTPs older than 15 minutes
- ✅ No errors in database logs

### Dashboard Configuration Success

- ✅ Magic link expires after 15 minutes (test by waiting 16 min)
- ✅ Magic link works within 15 minutes (test immediately)
- ✅ Anonymous sign-in request fails with error
- ✅ Email rate limit prevents > 3 magic links per hour
- ✅ No user complaints about "link expired too fast"

---

## Notes

### Why Not Pure SQL?

Supabase Auth is a **managed service** (GoTrue) that runs separately from the PostgreSQL database. OTP expiry, anonymous sign-ins, and compromised password checks are **GoTrue configuration**, not database configuration.

**What's configurable via SQL**:
- Database-level policies (RLS on auth tables)
- Indexes for performance
- Cleanup functions for housekeeping

**What requires Dashboard/API**:
- MAILER_OTP_EXP (OTP expiry time)
- DISABLE_SIGNUP, ENABLE_ANONYMOUS_SIGN_INS
- Compromised password check (Pro plan feature)

### Alternative: Supabase CLI Configuration

If you prefer Infrastructure-as-Code, you can configure auth settings via `supabase/config.toml`:

```toml
[auth]
enable_signup = true
enable_anonymous_sign_ins = false

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true
# OTP expiry not configurable in config.toml (Dashboard only)

[auth.rate_limits]
otp_limit = 3  # 3 OTPs per hour
```

Then apply with:
```bash
supabase db push
```

---

## References

- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
- [GoTrue Auth Server](https://github.com/supabase/auth)
- [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#authentication-and-error-messages)
- [Phishing via OTP Interception](https://www.microsoft.com/en-us/security/blog/2023/06/08/detecting-and-mitigating-a-multi-stage-aitm-phishing-and-bec-campaign/)

---

**Created**: 2025-01-25
**Last Updated**: 2025-01-25
**Status**: 📝 Draft - Ready for local testing + manual dashboard configuration
**Approved By**: _Pending_

---

**END OF PROPOSAL 005**
