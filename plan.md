# Bounty Hunter App - Remediation Plan

**Overall Progress: 32% Complete (12/38 tasks)**

---

## Phase 0: Database Inventory & Hardening 🔍

**Purpose**: Complete audit of PostgreSQL schema, identify security gaps, propose minimal reversible fixes. All work LOCAL ONLY - no production changes without approval.

### 0.1 Schema Inventory & Documentation

**Status**: 🟩 Complete

**Tasks**:
- [x] Parse `/supabase/schema_all.sql` for complete database structure
- [x] Create `/docs/sql-inventory/tables.csv` - Inventory all tables with RLS status
- [x] Create `/docs/sql-inventory/policies.csv` - Catalog all 27 RLS policies
- [x] Create `/docs/sql-inventory/indexes.csv` - List constraints and indexes
- [x] Create `/docs/sql-inventory/erd_live.md` - Comprehensive Mermaid ERD with security annotations

**Files Created**:
- `docs/sql-inventory/tables.csv`
- `docs/sql-inventory/policies.csv`
- `docs/sql-inventory/indexes.csv`
- `docs/sql-inventory/erd_live.md`

**Key Findings**:
- ✅ 6 tables properly secured (profiles, tasks, friendships, rewards_store, user_credits, credit_transactions)
- 🔴 3 CRITICAL gaps: `collected_rewards` (RLS but no policies - app broken), `marketplace_bounties` (no RLS), `collected_bounties` (RLS but no policies)

---

### 0.2 Critical RLS Fix - collected_rewards (P0)

**Status**: 🟩 Complete (✅ **DEPLOYED TO PRODUCTION** - 2025-01-25)

**Tasks**:
- [x] Draft `/db/proposals/003_rls_collected_rewards.md`
- [x] Create UP migration: Add 3 RLS policies (view own, insert, creator view collections)
- [x] Create DOWN migration: Rollback script
- [x] Add UNIQUE constraint to prevent duplicate claims (reward_id, collector_id)
- [x] Document validation queries and test scenarios
- [x] **LOCAL VALIDATION**: ✅ PASS (all policies created, constraint added)
- [x] **PROD DEPLOYMENT**: ✅ SUCCESS (applied, validated)
- [x] **APP TESTING**: ✅ PASS (User A sees only A's rewards, User B sees only B's, User C sees empty)

**Files Created**:
- `db/proposals/003_rls_collected_rewards.md`
- `db/proposals/003_rls_collected_rewards.up.sql`
- `db/proposals/003_rls_collected_rewards.down.sql`
- `docs/sql-inventory/LOCAL_VALIDATION_003.md`
- `PROD_RUNBOOK_003.md`

**Deployment Details**:
- **Deployed**: 2025-01-25
- **RLS Status**: ✅ Enabled
- **Policies Added**: 3 (Users can view own collected rewards, Users can collect rewards, Creators can view collections of their rewards)
- **Constraint Added**: `collected_rewards_unique_claim` UNIQUE (reward_id, collector_id)
- **Result**: MyCollectedRewardsPage now works - users see only their own data

**References**: [Proposal 003](db/proposals/003_rls_collected_rewards.md), [Status Report](PROPOSAL_003_STATUS.md)

---

### 0.3 Schema Cleanup - Drop Duplicate Tables (P2)

**Status**: 🟩 Complete

**Tasks**:
- [x] Draft `/db/proposals/001_drop_marketplace_bounties.md`
- [x] Create UP migration: Drop `marketplace_bounties` + `collected_bounties` + `create_bounty()` RPC
- [x] Create DOWN migration: Restore schema (no data recovery)
- [x] Add safety check: Verify tables empty before dropping
- [x] Document verification queries

**Files Created**:
- `db/proposals/001_drop_marketplace_bounties.md`
- `supabase/migrations/20250125110001_drop_marketplace_bounties.sql`
- `supabase/migrations/20250125110001_drop_marketplace_bounties_down.sql`

**Impact**: **MEDIUM** - Removes unused tables with security gaps. App uses `rewards_store`, not `marketplace_bounties`.

**Status**: ⏸️ **PENDING** - Awaiting production data verification (tables must be empty).

**References**: [Proposal 001](db/proposals/001_drop_marketplace_bounties.md), [Changeset Lines 370-378](docs/sql-inventory/CHANGESET_20250125.md#proposal-001-drop-tables)

---

### 0.4 Function Security Hardening (P1)

**Status**: 🟩 Complete (✅ **VALIDATED** - 2025-01-25)

**Tasks**:
- [x] Audit all SECURITY DEFINER functions for `search_path` vulnerability
- [x] Create migration: Add `SET search_path = public, pg_temp` to all 5 SECURITY DEFINER functions
- [x] Create rollback script
- [x] Create validation queries
- [x] **PRODUCTION VALIDATION**: ✅ PASS (all 5 functions have search_path hardening)

**Files Created**:
- `db/proposals/004_harden_function_search_path.up.sql`
- `db/proposals/004_harden_function_search_path.down.sql`
- `db/proposals/004_validation_queries.sql`
- `PROD_RUNBOOK_004.md`
- `docs/sql-inventory/PROD_VALIDATION_004.md`

**Functions Hardened**:
1. `create_reward_store_item` - SET search_path = public, pg_temp ✅
2. `delete_reward_store_item` - SET search_path = public, pg_temp ✅
3. `update_reward_store_item` - SET search_path = public, pg_temp ✅
4. `increment_user_credits` - SET search_path = public, pg_temp ✅
5. `handle_new_user` - SET search_path = public, pg_temp ✅

**Impact**: Prevents privilege escalation via search_path poisoning attacks.

**References**: [PROD_VALIDATION_004.md](docs/sql-inventory/PROD_VALIDATION_004.md), [Runbook](PROD_RUNBOOK_004.md)

---

### 0.5 Auth OTP Hardening (P1)

**Status**: 🟩 Complete (✅ **DASHBOARD-ONLY** - 2025-01-25)

**Tasks**:
- [x] Audit auth configuration requirements
- [x] Create proposal documentation
- [x] Document dashboard configuration steps
- [x] Create no-op SQL stubs (auth.* not modifiable on managed Supabase)
- [x] **APPROACH**: Dashboard-only (auth schema owned by supabase_auth_admin)

**Files Created**:
- `db/proposals/PROPOSAL_005_AUTH_OTP_HARDENING.md`
- `db/proposals/005_auth_otp_hardening.up.sql` (no-op stub)
- `db/proposals/005_auth_otp_hardening.down.sql` (no-op stub)
- `PROPOSAL_005_DASHBOARD_CHECKLIST.md`
- `PROD_RUNBOOK_005.md`
- `docs/sql-inventory/PROD_VALIDATION_005.md`

**Dashboard Settings** (user to apply):
- **OTP Expiry**: 600 seconds (10 minutes) - reduces attack window 6x
- **Compromised Password Check**: Enabled - prevents use of leaked passwords
- **Anonymous Sign-ins**: Disabled (if unused) - reduces attack surface

**Why No SQL**: `auth.one_time_tokens` table owned by `supabase_auth_admin` (not `postgres`). Dashboard configuration is the correct approach for managed Supabase.

**Impact**: Reduces OTP theft window from 60 minutes → 10 minutes. Enables password breach protection.

**References**: [PROPOSAL_005_AUTH_OTP_HARDENING.md](db/proposals/PROPOSAL_005_AUTH_OTP_HARDENING.md), [Dashboard Checklist](PROPOSAL_005_DASHBOARD_CHECKLIST.md), [PROD_VALIDATION_005.md](docs/sql-inventory/PROD_VALIDATION_005.md)

---

### 0.6 Test Data Generation

**Status**: 🟩 Complete

**Tasks**:
- [x] Create `/db/seeds/seed_minimal.sql`
- [x] Add 2 test users (Alice Creator, Bob Hunter)
- [x] Add 1 friendship (accepted)
- [x] Add 1 complete task lifecycle (pending → proof → approved → credits awarded)
- [x] Add 1 reward (created by Alice, assigned to Bob)
- [x] Add 1 reward collection (Bob claims reward)
- [x] Add validation queries

**Files Created**:
- `db/seeds/seed_minimal.sql`

**Purpose**: Minimal dataset for local testing of all proposals without needing real users.

**References**: [seed_minimal.sql](db/seeds/seed_minimal.sql)

---

### 0.7 Master Changeset Documentation

**Status**: 🟩 Complete

**Tasks**:
- [x] Create `/docs/sql-inventory/CHANGESET_20250125.md`
- [x] Document executive summary (3 critical gaps)
- [x] Create proposal summary table with priorities
- [x] Define recommended apply order (Phase 1: P0, Phase 2: cleanup, Phase 3: future)
- [x] Write detailed validation queries per proposal
- [x] Document rollback procedures (reverse order)
- [x] Create risk assessment matrix
- [x] Write success criteria checklists
- [x] Document local testing procedures
- [x] Write production deployment guide

**Files Created**:
- `docs/sql-inventory/CHANGESET_20250125.md`

**Purpose**: Single authoritative document for database changes. Includes complete deployment runbook.

**References**: [CHANGESET_20250125.md](docs/sql-inventory/CHANGESET_20250125.md)

---

### 0.8 Local Testing - Proposal 003 (Critical)

**Status**: 🟩 Complete

**Tasks**:
- [x] Start local Supabase: `supabase start`
- [x] Load schema: `psql ... < supabase/schema_all.sql`
- [x] Load test data: `psql ... < db/seeds/seed_minimal.sql`
- [x] Apply migration: `psql ... < db/proposals/003_rls_collected_rewards.up.sql`
- [x] Run validation queries (3 policies created, 1 constraint added)
- [x] Test rollback capability

**Result**: ✅ PASS - All 3 policies created, UNIQUE constraint added, RLS enabled

**References**: [LOCAL_VALIDATION_003.md](docs/sql-inventory/LOCAL_VALIDATION_003.md)

---

### 0.9 Local Testing - Proposal 001 (Cleanup)

**Status**: 🟥 To Do

**Prerequisites**:
- [ ] Verify `marketplace_bounties` is empty in production: `SELECT COUNT(*) FROM marketplace_bounties`
- [ ] Verify `collected_bounties` is empty in production: `SELECT COUNT(*) FROM collected_bounties`
- [ ] Confirm NO business need for these tables

**Tasks**:
- [ ] Apply migration locally: `psql ... < supabase/migrations/20250125110001_drop_marketplace_bounties.sql`
- [ ] Verify tables dropped: `\dt public.*bounties`
- [ ] Test app: Navigate to /rewards-store, verify rewards load from `rewards_store`
- [ ] Test rollback: `psql ... < supabase/migrations/20250125110001_drop_marketplace_bounties_down.sql`

**Expected Result**: App continues working, unused tables removed, schema cleaner.

**References**: [Changeset Lines 74-122](docs/sql-inventory/CHANGESET_20250125.md#phase-2-schema-cleanup-optional)

---

### 0.10 Production Deployment - Proposal 003

**Status**: 🟩 Complete (✅ **DEPLOYED** - 2025-01-25)

**Prerequisites**:
- [x] ✅ Local testing passed (0.8)
- [x] ✅ Backup production database
- [x] ✅ Rollback script tested locally
- [x] ✅ Approval sign-off obtained

**Tasks**:
- [x] Backup production schema (timestamped)
- [x] Apply migration via psql
- [x] Run validation queries (3 policies, 1 constraint)
- [x] Test app with real users
- [x] Monitor for issues

**Result**: ✅ SUCCESS
- RLS enabled: ✅ true
- Policies created: ✅ 3
- Constraint added: ✅ `collected_rewards_unique_claim`
- App test: ✅ Users see only their own rewards
- MyCollectedRewardsPage: ✅ NOW WORKS

**Rollback** (if needed):
```bash
psql <production-uri> < supabase/migrations/20250125120001_add_collected_rewards_policies_down.sql
```

**References**: [Changeset Lines 211-290](docs/sql-inventory/CHANGESET_20250125.md#production-deployment-procedure)

---

## Phase 1: Critical Schema & Security Fixes 🔴

### 1.1 Migration File Corrections

**Status**: 🟥 To Do

**Tasks**:
- [ ] Rename `YYYYMMDDHHMMSS_create_bounties_table.sql` → `20250101120000_create_rewards_store_table.sql`
- [ ] Update file content: `CREATE TABLE public.bounties` → `CREATE TABLE public.rewards_store`
- [ ] Rename `YYYYMMDDHHMMSS_create_collected_bounties_table.sql` → `20250101120100_create_collected_rewards_table.sql`
- [ ] Update file content: `CREATE TABLE public.collected_bounties` → `CREATE TABLE public.collected_rewards`
- [ ] Rename `YYYYMMDDHHMMSS_create_bounty_rpc.sql` → `20250101120200_create_reward_store_item_rpc.sql`
- [ ] Rename `YYYYMMDDHHMMSS_increment_user_credits_rpc.sql` → `20250101120300_increment_user_credits_rpc.sql`
- [ ] Rename `YYYYMMDDHHMMSS_decrement_user_credits_rpc.sql` → `20250101120400_decrement_user_credits_rpc.sql`
- [ ] Rename `YYYYMMDDHHMMSS_purchase_bounty_rpc.sql` → `20250101120500_purchase_bounty_rpc.sql`

**Files Modified**:
- `supabase/migrations/YYYYMMDDHHMMSS_*.sql` (all 6 files)

**References**: [open-questions.md #1](docs/open-questions.md#1-migration-files-have-placeholder-timestamps), [open-questions.md #2](docs/open-questions.md#2-schema-drift-table-name-mismatch)

---

### 1.2 Add Missing RLS Policies

**Status**: 🟥 To Do

**Tasks**:
- [ ] Create migration: `20250101120600_add_rewards_store_rls.sql`
- [ ] Add policy: Users can view active rewards assigned to them
- [ ] Add policy: Creators can view their own rewards
- [ ] Add policy: Creators can insert/update/delete their own rewards
- [ ] Create migration: `20250101120700_add_user_credits_rls.sql`
- [ ] Add policy: Users can view only their own credits
- [ ] Create migration: `20250101120800_add_collected_rewards_rls.sql`
- [ ] Add policy: Users can view only their collected rewards

**New Files**:
- `supabase/migrations/20250101120600_add_rewards_store_rls.sql`
- `supabase/migrations/20250101120700_add_user_credits_rls.sql`
- `supabase/migrations/20250101120800_add_collected_rewards_rls.sql`

**References**: [open-questions.md #3](docs/open-questions.md#3-rls-policies-incomplete-or-missing), [data-model.md - Schema Discrepancies](docs/data-model.md#schema-discrepancies--issues)

---

### 1.3 Secure Credit Awarding

**Status**: 🟥 To Do

**Tasks**:
- [ ] Create migration: `20250101120900_secure_credit_awarding.sql`
- [ ] Create trigger function `award_credits_on_completion()` (auto-awards on status='completed')
- [ ] Add trigger `on_task_completed` to tasks table
- [ ] Revoke authenticated access: `REVOKE EXECUTE ON FUNCTION increment_user_credits FROM authenticated`
- [ ] Update `src/pages/IssuedPage.tsx:165` - Remove direct RPC call to `increment_user_credits`
- [ ] Update logic: Just update task status to 'completed', trigger handles credits

**Files Modified**:
- `supabase/migrations/20250101120900_secure_credit_awarding.sql` (new)
- `src/pages/IssuedPage.tsx`

**References**: [open-questions.md #7](docs/open-questions.md#7-credit-awarding-security-vulnerability), [overview.md - Risk #2](docs/overview.md#top-10-risks)

---

### 1.4 Fix Race Condition in Bounty Purchase

**Status**: 🟥 To Do

**Tasks**:
- [ ] Create migration: `20250101121000_add_unique_collection_constraint.sql`
- [ ] Add constraint: `ALTER TABLE collected_rewards ADD CONSTRAINT unique_collection UNIQUE(reward_id, collector_id)`
- [ ] Update `purchase_bounty` RPC - Remove manual duplicate check (constraint handles it)
- [ ] Add proper error handling for constraint violations

**Files Modified**:
- `supabase/migrations/20250101121000_add_unique_collection_constraint.sql` (new)
- `supabase/migrations/20250101120500_purchase_bounty_rpc.sql` (from 1.1 rename)

**References**: [open-questions.md #12](docs/open-questions.md#12-race-condition-in-bounty-purchase), [overview.md - Risk #7](docs/overview.md#top-10-risks)

---

## Phase 2: Database Cleanup 🟡

### 2.1 Remove Duplicate Tables

**Status**: 🟥 To Do

**Tasks**:
- [ ] Verify `marketplace_bounties` table is unused (grep app code)
- [ ] Verify `collected_bounties` table is unused (grep app code)
- [ ] Create migration: `20250101121100_remove_duplicate_tables.sql`
- [ ] Drop table: `DROP TABLE IF EXISTS collected_bounties CASCADE`
- [ ] Drop table: `DROP TABLE IF EXISTS marketplace_bounties CASCADE`

**Files Modified**:
- `supabase/migrations/20250101121100_remove_duplicate_tables.sql` (new)

**References**: [open-questions.md #4](docs/open-questions.md#4-duplicate-tables---which-to-keep)

---

### 2.2 Remove Recurring Tasks Feature (Optional)

**Status**: 🟥 To Do

**Decision Required**: Confirm removal vs. implementation

**Tasks** (if removing):
- [ ] Create migration: `20250101121200_remove_recurring_tasks.sql`
- [ ] Drop table: `DROP TABLE IF EXISTS recurring_task_instances CASCADE`
- [ ] Drop table: `DROP TABLE IF EXISTS recurring_task_templates CASCADE`
- [ ] Drop function: `DROP FUNCTION IF EXISTS complete_task_instance`
- [ ] Remove columns from tasks: `ALTER TABLE tasks DROP COLUMN frequency_limit, DROP COLUMN frequency_period`

**Files Modified**:
- `supabase/migrations/20250101121200_remove_recurring_tasks.sql` (new)

**References**: [open-questions.md #5](docs/open-questions.md#5-recurring-tasks-feature---complete-or-remove)

---

### 2.3 Add Missing Indexes

**Status**: 🟥 To Do

**Tasks**:
- [ ] Create migration: `20250101121300_add_performance_indexes.sql`
- [ ] Add index: `CREATE INDEX idx_tasks_status ON tasks(status)`
- [ ] Add index: `CREATE INDEX idx_tasks_is_archived ON tasks(is_archived)`
- [ ] Add index: `CREATE INDEX idx_rewards_store_is_active ON rewards_store(is_active)`
- [ ] Add index: `CREATE INDEX idx_rewards_store_assigned_to ON rewards_store(assigned_to)`
- [ ] Add index: `CREATE INDEX idx_collected_rewards_collector_id ON collected_rewards(collector_id)`

**Files Modified**:
- `supabase/migrations/20250101121300_add_performance_indexes.sql` (new)

**References**: [data-model.md - Missing Indexes](docs/data-model.md#missing-indexes-recommendations)

---

### 2.4 Delete Typo Folder

**Status**: 🟥 To Do

**Tasks**:
- [ ] Verify contents of `supabse/` folder
- [ ] Delete folder: `rm -rf supabse/` (if empty or duplicate)

**Files Deleted**:
- `supabse/` (entire folder)

**References**: [open-questions.md #10](docs/open-questions.md#10-typo-folder-supabse-vs-supabase)

---

## Phase 3: Feature Completion 🟢

### 3.1 Implement Email Notifications

**Status**: 🟥 To Do

**Decision Required**: Choose email provider (Resend recommended)

**Tasks**:
- [ ] Sign up for Resend account, get API key
- [ ] Add sender domain verification in Resend dashboard
- [ ] Update `supabase/functions/notify-reward-creator/index.ts:20-42` - Uncomment Resend integration
- [ ] Configure email template (subject, body)
- [ ] Deploy edge function: `supabase functions deploy notify-reward-creator`
- [ ] Set secret: `supabase secrets set RESEND_API_KEY=<key>`
- [ ] Test with real email

**Files Modified**:
- `supabase/functions/notify-reward-creator/index.ts`

**References**: [open-questions.md #6](docs/open-questions.md#6-email-notifications-not-functional), [overview.md - Risk #8](docs/overview.md#top-10-risks)

---

### 3.2 Implement MyCollectedRewardsPage

**Status**: 🟥 To Do

**Tasks**:
- [ ] Update `src/pages/MyCollectedRewardsPage.tsx` - Replace stub with real implementation
- [ ] Use `useCollectedRewards()` hook to fetch data
- [ ] Copy layout pattern from `ArchivePage.tsx`
- [ ] Display rewards using `RewardCard` component (read-only mode)
- [ ] Add empty state ("No rewards collected yet")
- [ ] Add loading skeleton

**Files Modified**:
- `src/pages/MyCollectedRewardsPage.tsx`

**References**: [open-questions.md #9](docs/open-questions.md#9-mycollectedrewardspage-not-implemented), [overview.md - Risk #10](docs/overview.md#top-10-risks)

---

## Phase 4: Storage & Environment Setup 🔵

### 4.1 Create Storage Buckets

**Status**: 🟥 To Do

**Tasks** (Manual - Supabase Dashboard):
- [ ] Create bucket `bounty-proofs` (public, 10MB limit, image/video only)
- [ ] Create bucket `avatars` (public, 5MB limit, image only)
- [ ] Apply policies: Authenticated can upload, public can view
- [ ] Test upload from app

**References**: [runbook.md - Create Storage Buckets](docs/runbook.md#create-storage-buckets), [open-questions.md #8](docs/open-questions.md#8-proof-upload-storage-bucket-policies)

---

### 4.2 Create .env.example File

**Status**: 🟥 To Do

**Tasks**:
- [ ] Create `.env.example` in project root
- [ ] Add `VITE_SUPABASE_URL` with placeholder
- [ ] Add `VITE_SUPABASE_ANON_KEY` with placeholder
- [ ] Add comments explaining where to find values
- [ ] Commit to repository

**Files Created**:
- `.env.example`

**References**: [open-questions.md #15](docs/open-questions.md#15-missing-envexample-file), [runbook.md - Environment Setup](docs/runbook.md#environment-setup)

---

## Phase 5: Documentation Updates 📝

### 5.1 Update INSTRUCTIONS.md

**Status**: 🟥 To Do

**Tasks**:
- [ ] Update `INSTRUCTIONS.md:20` - Change "Google OAuth login" to "Magic Link (OTP) login"
- [ ] Update authentication section to reflect current implementation
- [ ] Remove references to Google OAuth if not planned

**Files Modified**:
- `INSTRUCTIONS.md`

**References**: [open-questions.md #13](docs/open-questions.md#13-oauth-vs-magic-link-confusion)

---

### 5.2 Update MANUAL_TASKS.md

**Status**: 🟥 To Do

**Tasks**:
- [ ] Update `MANUAL_TASKS.md:10-14` - Remove Google OAuth setup instructions
- [ ] Add magic link configuration instructions
- [ ] Update SQL schema to reflect `rewards_store` table name
- [ ] Add storage bucket creation instructions

**Files Modified**:
- `MANUAL_TASKS.md`

**References**: [open-questions.md #13](docs/open-questions.md#13-oauth-vs-magic-link-confusion)

---

## Phase 6: Testing & Validation ✅

### 6.1 Test Local Migration Sequence

**Status**: 🟥 To Do

**Tasks**:
- [ ] Reset local database: `supabase db reset`
- [ ] Run all migrations in order
- [ ] Verify all tables created with correct names
- [ ] Verify all RLS policies applied
- [ ] Verify all indexes created
- [ ] Check for migration errors

**References**: [runbook.md - Run Migrations](docs/runbook.md#run-migrations)

---

### 6.2 Test RLS Policies

**Status**: 🟥 To Do

**Tasks**:
- [ ] Create 2 test users
- [ ] User A creates reward assigned to User B
- [ ] Verify User B can see reward, User C cannot
- [ ] User B purchases reward
- [ ] Verify User B credits deducted, User A notified
- [ ] Verify User A can view who collected their reward

**References**: [data-model.md - RLS Policies](docs/data-model.md#row-level-security-rls)

---

### 6.3 Test Credit Security

**Status**: 🟥 To Do

**Tasks**:
- [ ] Open browser console
- [ ] Attempt to call `increment_user_credits` RPC directly
- [ ] Verify RPC call fails with permission error
- [ ] Complete a task and verify credits awarded via trigger
- [ ] Check task status updates correctly without manual RPC call

**References**: [open-questions.md #7](docs/open-questions.md#7-credit-awarding-security-vulnerability)

---

### 6.4 Test Bounty Purchase Race Condition

**Status**: 🟥 To Do

**Tasks**:
- [ ] Create test reward
- [ ] Simulate concurrent purchase requests (2 requests at same time)
- [ ] Verify only 1 purchase succeeds
- [ ] Verify second request fails with constraint violation
- [ ] Verify credits only deducted once

**References**: [open-questions.md #12](docs/open-questions.md#12-race-condition-in-bounty-purchase)

---

### 6.5 Test Email Notifications

**Status**: 🟥 To Do

**Tasks**:
- [ ] Create reward as User A
- [ ] Purchase reward as User B
- [ ] Verify User A receives email notification
- [ ] Check email content (reward name, collector name)
- [ ] Verify email sent from correct sender domain

**References**: [open-questions.md #6](docs/open-questions.md#6-email-notifications-not-functional)

---

## Phase 7: Deployment Preparation 🚀

### 7.1 Deploy Migrations to Production

**Status**: 🟥 To Do

**Tasks**:
- [ ] Backup production database
- [ ] Run migrations via Supabase Dashboard SQL Editor
- [ ] Verify all tables/policies/functions created
- [ ] Verify no data loss
- [ ] Test app functionality on production

**References**: [runbook.md - Deployment](docs/runbook.md#deployment)

---

### 7.2 Configure Production Storage

**Status**: 🟥 To Do

**Tasks**:
- [ ] Create production storage buckets (same as local)
- [ ] Configure bucket policies
- [ ] Test file uploads in production
- [ ] Verify public URL access works

**References**: [runbook.md - Create Storage Buckets](docs/runbook.md#create-storage-buckets)

---

### 7.3 Deploy Edge Function

**Status**: 🟥 To Do

**Tasks**:
- [ ] Deploy: `supabase functions deploy notify-reward-creator`
- [ ] Set production secrets: `supabase secrets set RESEND_API_KEY=<key>`
- [ ] Test function invocation
- [ ] Monitor edge function logs

**References**: [runbook.md - Backend Deployment](docs/runbook.md#backend-supabase-edge-functions)

---

### 7.4 Configure Vercel Deployment

**Status**: 🟥 To Do

**Tasks**:
- [ ] Connect GitHub repo to Vercel
- [ ] Set environment variables in Vercel dashboard
- [ ] Deploy to production
- [ ] Update Supabase auth redirect URLs
- [ ] Test production app end-to-end

**References**: [runbook.md - Frontend Deployment](docs/runbook.md#frontend-vercel)

---

## Phase 8: Optional Enhancements 💡

### 8.1 Add React Query for Caching

**Status**: 🟥 To Do (Optional)

**Tasks**:
- [ ] Install `@tanstack/react-query`
- [ ] Wrap app in `QueryClientProvider`
- [ ] Migrate `useTasks` to use `useQuery`
- [ ] Migrate `useFriends` to use `useQuery`
- [ ] Configure cache invalidation on real-time events

**References**: [state-and-events.md - Performance](docs/state-and-events.md#performance-considerations)

---

### 8.2 Add Seed Script

**Status**: 🟥 To Do (Optional)

**Tasks**:
- [ ] Create `supabase/seed.sql`
- [ ] Add 5 test users with profiles
- [ ] Add 10+ sample tasks
- [ ] Add friend connections
- [ ] Add sample rewards
- [ ] Add initial credits for testing

**References**: [open-questions.md #14](docs/open-questions.md#14-test-data-seeding-strategy)

---

### 8.3 Implement Credit Transactions Audit Log

**Status**: 🟥 To Do (Optional)

**Tasks**:
- [ ] Create trigger `log_credit_transaction()` on `user_credits` UPDATE
- [ ] Auto-insert into `credit_transactions` on balance change
- [ ] Add UI page to view transaction history
- [ ] Add filters (date range, transaction type)

**References**: [open-questions.md #11](docs/open-questions.md#11-credit-transactions-table-unused)

---

## Phase 9: Final Validation ✔️

### 9.1 Security Audit

**Status**: 🟥 To Do

**Tasks**:
- [ ] Review all RLS policies - ensure no gaps
- [ ] Test unauthorized access attempts
- [ ] Verify service_role key not exposed
- [ ] Check for SQL injection vulnerabilities in RPC functions
- [ ] Review storage bucket policies

**References**: [api-map.md - API Security Summary](docs/api-map.md#api-security-summary)

---

### 9.2 Performance Testing

**Status**: 🟥 To Do

**Tasks**:
- [ ] Test with 100+ tasks
- [ ] Test with 50+ friends
- [ ] Measure page load times
- [ ] Check real-time subscription performance
- [ ] Analyze bundle size: `npx vite-bundle-visualizer`

**References**: [runbook.md - Performance Optimization](docs/runbook.md#performance-optimization)

---

### 9.3 End-to-End User Testing

**Status**: 🟥 To Do

**Tasks**:
- [ ] Test complete task flow: create → assign → submit proof → approve
- [ ] Test complete bounty flow: create → purchase → notification
- [ ] Test friend flow: request → accept → assign task
- [ ] Test error scenarios (insufficient credits, duplicate claim)
- [ ] Test on mobile devices

**References**: [state-and-events.md - Event Flows](docs/state-and-events.md#event-flows)

---

## Summary

**Total Tasks**: 38 steps across 10 phases (Phase 0 + original 9 phases)

**Critical Path** (must complete before production):
1. **Phase 0: Database Audit (PRIORITY)** - 7 tasks complete, 3 pending
   - 0.4: Function hardening (P1)
   - 0.5: Auth OTP hardening (P1)
   - 0.8: Local testing Proposal 003 (P0 - BLOCKS DEPLOYMENT)
2. Phase 1: Schema & Security (4 steps) - **BLOCKING**
3. Phase 4.1: Storage Buckets (1 step) - **BLOCKING**
4. Phase 6: Testing (5 steps) - **BLOCKING**
5. Phase 7: Deployment (4 steps) - **BLOCKING**

**Optional Enhancements**:
- Phase 0.9: Local testing Proposal 001 (cleanup - optional)
- Phase 0.10: Production deployment (requires approval)
- Phase 2.2: Remove recurring tasks (if not needed)
- Phase 8: All optional enhancements

**Estimated Time**:
- Phase 0 remaining: 2-3 hours (proposals 004, 005, local testing)
- Critical fixes: 4-6 hours
- Feature completion: 2-3 hours
- Testing: 2-3 hours
- Deployment: 1-2 hours
- **Total**: 11-17 hours

**Phase 0 Status**: 7/10 complete (70%) - Inventory done, critical proposals drafted, local testing pending

---

**Last Updated**: 2025-10-25
**Status**: Phase 0 in progress - local testing and remaining proposals pending
