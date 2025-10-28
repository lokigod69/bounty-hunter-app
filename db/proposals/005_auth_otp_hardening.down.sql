-- Rollback Proposal 005: Auth OTP Hardening (Dashboard-Only)
-- No SQL changes to rollback - all configuration via dashboard

BEGIN;

-- No operations - revert dashboard settings manually:
-- 1. OTP Expiry → 3600 seconds (1 hour - default)
-- 2. Compromised Password Check → Disabled
-- 3. Anonymous Sign-ins → Enabled (if previously enabled)

-- See PROPOSAL_005_AUTH_OTP_HARDENING.md for rollback instructions

COMMIT;
