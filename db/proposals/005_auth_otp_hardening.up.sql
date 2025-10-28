-- Proposal 005: Auth OTP Hardening (Dashboard-Only)
-- No SQL changes permitted - auth.* schema owned by supabase_auth_admin

-- This is a no-op migration stub required by pipeline
-- All configuration done via Supabase Dashboard → Authentication → Settings

BEGIN;

-- No operations - dashboard-only configuration:
-- 1. OTP Expiry → 600 seconds (10 minutes)
-- 2. Compromised Password Check → Enabled
-- 3. Anonymous Sign-ins → Disabled (if unused)

-- See PROPOSAL_005_AUTH_OTP_HARDENING.md for detailed instructions

COMMIT;
