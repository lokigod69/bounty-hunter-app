# Bounty Hunter App - Open Questions & Blockers

## Critical Blockers

### 1. Migration Files Have Placeholder Timestamps

**Issue**: Migration files use `YYYYMMDDHHMMSS_*.sql` naming convention instead of actual timestamps.

**Evidence**:
- [supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql](../supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql)
- [supabase/migrations/YYYYMMDDHHMMSS_create_bounty_rpc.sql](../supabase/migrations/YYYYMMDDHHMMSS_create_bounty_rpc.sql)
- 6+ other migration files

**Impact**:
- Migrations will not run in correct order
- Supabase CLI may reject files
- Cannot track which migrations are applied

**Questions**:
1. What is the intended chronological order of these migrations?
2. Should they run before or after the dated migrations (`20231117000000_*`, `20250615*_*`)?

**Recommended Action**:
Replace `YYYYMMDDHHMMSS` with proper timestamps, e.g.:
- `20250101120000_create_bounties_table.sql`
- `20250101120100_create_bounty_rpc.sql` (1 minute after previous)

**File Locations**:
- [supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql](../supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql)
- [supabase/migrations/YYYYMMDDHHMMSS_create_bounty_rpc.sql](../supabase/migrations/YYYYMMDDHHMMSS_create_bounty_rpc.sql)
- [supabase/migrations/YYYYMMDDHHMMSS_create_collected_bounties_table.sql](../supabase/migrations/YYYYMMDDHHMMSS_create_collected_bounties_table.sql)
- [supabase/migrations/YYYYMMDDHHMMSS_increment_user_credits_rpc.sql](../supabase/migrations/YYYYMMDDHHMMSS_increment_user_credits_rpc.sql)
- [supabase/migrations/YYYYMMDDHHMMSS_decrement_user_credits_rpc.sql](../supabase/migrations/YYYYMMDDHHMMSS_decrement_user_credits_rpc.sql)
- [supabase/migrations/YYYYMMDDHHMMSS_purchase_bounty_rpc.sql](../supabase/migrations/YYYYMMDDHHMMSS_purchase_bounty_rpc.sql)

---

### 2. Schema Drift: Table Name Mismatch

**Issue**: Migrations create `bounties` and `collected_bounties` tables, but app code queries `rewards_store` and `collected_rewards`.

**Evidence**:
- Migration creates: `CREATE TABLE public.bounties` ([YYYYMMDDHHMMSS_create_bounties_table.sql:4](../supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql#L4))
- App queries: `.from('rewards_store')` ([useRewardsStore.ts:71](../src/hooks/useRewardsStore.ts#L71))

**Impact**:
- App will fail if migrations run as-is
- RLS policies applied to wrong table
- Cannot deploy without manual intervention

**Questions**:
1. Is `rewards_store` the correct table name?
2. Should migrations be updated to create `rewards_store` instead of `bounties`?
3. Or should app code be updated to use `bounties`?
4. Are `marketplace_bounties` and `bounties` the same table?

**Schema in Database** (from [database.ts](../src/types/database.ts)):
- `marketplace_bounties` table exists
- `rewards_store` table exists
- Both have similar schemas

**Recommended Action**:
**Option A** (Preferred): Update migrations to match app code:
```sql
-- In YYYYMMDDHHMMSS_create_bounties_table.sql
CREATE TABLE public.rewards_store (  -- Changed from 'bounties'
  ...
);
```

**Option B**: Update all app code to use `bounties` instead of `rewards_store` (breaking change, not recommended).

**File Locations**:
- Migration: [supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql:4](../supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql#L4)
- App hooks: [src/hooks/useRewardsStore.ts:71](../src/hooks/useRewardsStore.ts#L71), [src/hooks/useCollectedRewards.ts:53](../src/hooks/useCollectedRewards.ts#L53)

---

### 3. RLS Policies Incomplete or Missing

**Issue**: Several critical tables lack Row-Level Security policies or have policies on wrong table.

**Missing RLS Policies**:

| Table | Migration Status | App Usage | Risk Level |
|-------|------------------|-----------|------------|
| `rewards_store` | Policies defined for `bounties` instead | Queried in [useRewardsStore.ts:71](../src/hooks/useRewardsStore.ts#L71) | 🔴 **CRITICAL** |
| `user_credits` | No policies visible | Queried in [UserCredits.tsx:36](../src/components/UserCredits.tsx#L36) | 🔴 **CRITICAL** |
| `collected_rewards` | No policies visible | Queried in [useCollectedRewards.ts:53](../src/hooks/useCollectedRewards.ts#L53) | 🔴 **CRITICAL** |
| `credit_transactions` | No policies visible | Not queried in app (unused?) | 🟡 Medium |

**RLS Policies on Wrong Table**:
- [YYYYMMDDHHMMSS_create_bounties_table.sql:19-29](../supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql#L19-L29) - Policies created for `bounties` table, but app uses `rewards_store`

**Questions**:
1. What are the intended RLS policies for `rewards_store`?
   - Should all active rewards be publicly visible?
   - Or only rewards assigned to the current user?
2. For `user_credits`:
   - Should users only see their own balance?
   - Can users view others' credit balances?
3. For `collected_rewards`:
   - Should users only see their own collected rewards?
   - Can creators see who collected their rewards?

**Recommended Policies** (draft):

```sql
-- rewards_store
CREATE POLICY "Users can view active rewards assigned to them"
ON rewards_store FOR SELECT
TO authenticated
USING (is_active = true AND assigned_to = auth.uid());

CREATE POLICY "Creators can view their own rewards"
ON rewards_store FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

-- user_credits
CREATE POLICY "Users can view their own credits"
ON user_credits FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- collected_rewards
CREATE POLICY "Users can view their collected rewards"
ON collected_rewards FOR SELECT
TO authenticated
USING (collector_id = auth.uid());
```

**File Locations**:
- [supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql](../supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql)

---

## High-Priority Questions

### 4. Duplicate Tables - Which to Keep?

**Issue**: Database schema has duplicate/similar tables with different names.

**Duplicates**:
1. `bounties` (marketplace_bounties in schema) vs. `rewards_store`
   - Both have similar columns: name, description, credit_cost, creator_id, is_active
   - `rewards_store` has `assigned_to` (personalized rewards)
   - `marketplace_bounties` has `bounty_type`, `direct_reward` (unused fields)

2. `collected_bounties` vs. `collected_rewards`
   - Both track claimed rewards
   - `collected_bounties` has `purchase_price` (price at time of claim)
   - `collected_rewards` does not

**Questions**:
1. Are these intentionally separate systems (marketplace vs. personal rewards)?
2. Should one be removed?
3. If keeping both, what is the use case distinction?

**App Code Usage**:
- App ONLY uses: `rewards_store` and `collected_rewards`
- App NEVER uses: `marketplace_bounties` and `collected_bounties`

**Recommended Action**:
**Option A** (Clean): Remove `marketplace_bounties` and `collected_bounties` tables entirely.

**Option B** (Feature Split): Implement dual system:
- `rewards_store`: Personal rewards (assigned to specific users)
- `marketplace_bounties`: Public marketplace (anyone can claim)

**File Locations**:
- [src/types/database.ts:168-217](../src/types/database.ts#L168-L217) - marketplace_bounties definition
- [src/types/database.ts:245-291](../src/types/database.ts#L245-L291) - rewards_store definition

---

### 5. Recurring Tasks Feature - Complete or Remove?

**Issue**: Database has tables and RPC for recurring tasks, but feature not implemented in frontend.

**Existing Backend**:
- Tables: `recurring_task_templates`, `recurring_task_instances` ([20250615224500_create_or_update_recurring_task_instances.sql:7](../supabase/migrations/20250615224500_create_or_update_recurring_task_instances.sql#L7))
- RPC: `complete_task_instance` ([20231117000000_complete_task_instance.sql:7](../supabase/migrations/20231117000000_complete_task_instance.sql#L7))
- Fields on `tasks` table: `frequency_limit`, `frequency_period`

**Missing Frontend**:
- No UI to create recurring task templates
- No UI to view recurring instances
- `complete_task_instance` RPC never called

**Questions**:
1. Was recurring tasks feature abandoned?
2. Should tables/RPC be removed to reduce complexity?
3. Or should feature be implemented?

**Recommended Action**:
**Option A** (Clean): Remove recurring task tables and RPC if feature not planned.

**Option B** (Implement): Build UI for:
- Creating recurring templates
- Auto-generating instances
- Completing instances

**File Locations**:
- [supabase/migrations/20231117000000_complete_task_instance.sql](../supabase/migrations/20231117000000_complete_task_instance.sql)
- [supabase/migrations/20250615224500_create_or_update_recurring_task_instances.sql](../supabase/migrations/20250615224500_create_or_update_recurring_task_instances.sql)

---

### 6. Email Notifications Not Functional

**Issue**: Edge function `notify-reward-creator` is mocked and does not send emails.

**Evidence**:
- [supabase/functions/notify-reward-creator/index.ts:11-44](../supabase/functions/notify-reward-creator/index.ts#L11-L44) - `sendEmail()` function is a mock
- Commented-out Resend API integration code exists but not active

**Impact**:
- Reward creators never notified when their bounties are claimed
- Poor UX for creators

**Questions**:
1. Which email service should be used? (Resend, SendGrid, Mailgun?)
2. Do we have API keys for the chosen service?
3. Should email templates be customized?
4. What sender domain/email should be used?

**Recommended Action**:
1. Choose email provider (Resend recommended - code already present)
2. Sign up for account, get API key
3. Verify sender domain
4. Uncomment and configure Resend integration in edge function
5. Add `RESEND_API_KEY` to Supabase secrets

**File Locations**:
- [supabase/functions/notify-reward-creator/index.ts:11-44](../supabase/functions/notify-reward-creator/index.ts#L11-L44)

---

### 7. Credit Awarding Security Vulnerability

**Issue**: `increment_user_credits` RPC is callable by authenticated users, allowing self-awarding of credits.

**Evidence**:
- [supabase/migrations/YYYYMMDDHHMMSS_increment_user_credits_rpc.sql:26](../supabase/migrations/YYYYMMDDHHMMSS_increment_user_credits_rpc.sql#L26) - `GRANT EXECUTE ... TO authenticated`
- [src/pages/IssuedPage.tsx:165](../src/pages/IssuedPage.tsx#L165) - Direct client call to RPC

**Attack Vector**:
```javascript
// Malicious user can run in browser console:
await supabase.rpc('increment_user_credits', {
  user_id_param: myUserId,
  amount_param: 9999999
});
```

**Questions**:
1. Should credit awarding be moved to a database trigger?
2. Or should RPC be service_role-only and called from edge function?
3. How to handle idempotency (prevent double-awarding on task approval)?

**Recommended Solution**:
**Option A** (Database Trigger - Preferred):
```sql
CREATE OR REPLACE FUNCTION award_credits_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM increment_user_credits(NEW.assigned_to, NEW.reward_value);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_completed
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION award_credits_on_completion();
```

Then revoke client access:
```sql
REVOKE EXECUTE ON FUNCTION increment_user_credits FROM authenticated;
```

**Option B** (Edge Function):
- Create edge function `award-task-credits`
- Call from client after task approval
- Use service_role key to call `increment_user_credits`

**File Locations**:
- [supabase/migrations/YYYYMMDDHHMMSS_increment_user_credits_rpc.sql:26](../supabase/migrations/YYYYMMDDHHMMSS_increment_user_credits_rpc.sql#L26)
- [src/pages/IssuedPage.tsx:165](../src/pages/IssuedPage.tsx#L165)

---

### 8. Proof Upload Storage Bucket Policies

**Issue**: No explicit storage bucket policies visible in repo. Buckets may not exist or policies may be misconfigured.

**Evidence**:
- Code uploads to `bounty-proofs` bucket ([useTasks.ts:532](../src/hooks/useTasks.ts#L532))
- Code uploads to `avatars` bucket ([ProfileEditModal.tsx:84](../src/components/ProfileEditModal.tsx#L84))
- No migration files or setup scripts for buckets

**Questions**:
1. Do these buckets exist in production?
2. What are the current bucket policies?
3. Should buckets be public or private?
4. Are there file size/type restrictions enforced server-side?

**Recommended Policies** (from [runbook.md](./runbook.md#create-storage-buckets)):
- Public buckets (anyone can view via URL)
- Authenticated users can upload
- File size limits: 10MB for proofs, 5MB for avatars
- MIME type restrictions: `image/*`, `video/*` for proofs; `image/*` for avatars

**Action Required**:
Document bucket creation and policy setup in migration or setup script.

**File Locations**:
- [src/hooks/useTasks.ts:532](../src/hooks/useTasks.ts#L532)
- [src/components/ProfileEditModal.tsx:84](../src/components/ProfileEditModal.tsx#L84)

---

## Medium-Priority Questions

### 9. MyCollectedRewardsPage Not Implemented

**Issue**: Page component exists but is a placeholder ("under construction").

**Evidence**:
- [src/pages/MyCollectedRewardsPage.tsx](../src/pages/MyCollectedRewardsPage.tsx) - Stub component
- Hook `useCollectedRewards` exists and works ([useCollectedRewards.ts:53](../src/hooks/useCollectedRewards.ts#L53))

**Questions**:
1. Is this page planned for implementation?
2. Should it be removed from navigation until implemented?
3. What UI pattern should it follow (similar to ArchivePage)?

**Recommended Action**:
Implement page using pattern from [ArchivePage.tsx](../src/pages/ArchivePage.tsx):
```tsx
const { collectedRewards, isLoading, error } = useCollectedRewards(userId);

return (
  <div>
    {isLoading && <Skeleton />}
    {collectedRewards.map(reward => (
      <RewardCard key={reward.id} reward={reward} />
    ))}
  </div>
);
```

**File Locations**:
- [src/pages/MyCollectedRewardsPage.tsx](../src/pages/MyCollectedRewardsPage.tsx)
- [src/hooks/useCollectedRewards.ts](../src/hooks/useCollectedRewards.ts)

---

### 10. Typo Folder: "supabse" vs "supabase"

**Issue**: Root directory has both `supabase/` and `supabse/` folders.

**Evidence**:
- [./supabase/](../supabase/) - Correct folder with migrations and functions
- [./supabse/](../supabse/) - Typo folder (check contents)

**Questions**:
1. Is `supabse/` a typo or intentional duplicate?
2. What files are inside `supabse/`?
3. Should it be deleted?

**Recommended Action**:
```bash
# Check contents first
ls -la supabse/

# If empty or duplicate, delete
rm -rf supabse/
```

**File Locations**:
- [./supabse/](../supabse/)

---

### 11. Credit Transactions Table Unused

**Issue**: `credit_transactions` table exists but is never queried in app code.

**Evidence**:
- Table defined in schema ([database.ts:77-117](../src/types/database.ts#L77-L117))
- No queries in any hook or component

**Questions**:
1. Is this table intended for audit logging?
2. Should credit changes auto-insert into this table via trigger?
3. Or is this table obsolete?

**Recommended Action**:
**Option A** (Implement Audit): Add trigger to track all credit changes:
```sql
CREATE OR REPLACE FUNCTION log_credit_transaction()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO credit_transactions (user_id, amount, transaction_type)
  VALUES (NEW.user_id, NEW.balance - OLD.balance, 'system');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_credits_changed
  AFTER UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION log_credit_transaction();
```

**Option B** (Remove): Drop table if not needed.

**File Locations**:
- [src/types/database.ts:77-117](../src/types/database.ts#L77-L117)

---

### 12. Race Condition in Bounty Purchase

**Issue**: Check for duplicate purchase and insert not atomic.

**Evidence**:
- [purchase_bounty RPC:26-30](../supabase/migrations/YYYYMMDDHHMMSS_purchase_bounty_rpc.sql#L26-L30) - IF EXISTS check
- [purchase_bounty RPC:41-44](../supabase/migrations/YYYYMMDDHHMMSS_purchase_bounty_rpc.sql#L41-L44) - INSERT

**Attack Vector**:
Two requests at exact same time could both pass the "already collected" check and insert twice.

**Questions**:
1. Should we add UNIQUE constraint instead of IF EXISTS check?
2. Or wrap in transaction with SERIALIZABLE isolation?

**Recommended Solution**:
```sql
-- Add constraint (prevents race condition at DB level)
ALTER TABLE collected_rewards
ADD CONSTRAINT unique_collection UNIQUE(reward_id, collector_id);

-- Remove IF EXISTS check in RPC (constraint handles it)
-- Let constraint violation error if already claimed
```

**File Locations**:
- [supabase/migrations/YYYYMMDDHHMMSS_purchase_bounty_rpc.sql:26-30](../supabase/migrations/YYYYMMDDHHMMSS_purchase_bounty_rpc.sql#L26-L30)

---

### 13. OAuth vs Magic Link Confusion

**Issue**: Original requirements mention Google OAuth, but implementation uses magic links only.

**Evidence**:
- [INSTRUCTIONS.md:20](../INSTRUCTIONS.md#L20) - "Google OAuth login"
- [MANUAL_TASKS.md:10-14](../MANUAL_TASKS.md#L10-L14) - "Enable Google" auth
- [useAuth.ts](../src/hooks/useAuth.ts) - Only magic link implementation

**Questions**:
1. Should Google OAuth be implemented?
2. Or was magic link a deliberate change?
3. Should INSTRUCTIONS.md be updated?

**Recommended Action**:
Update documentation to reflect current auth method (magic link only).

**File Locations**:
- [INSTRUCTIONS.md:20](../INSTRUCTIONS.md#L20)
- [MANUAL_TASKS.md:10-14](../MANUAL_TASKS.md#L10-L14)

---

## Low-Priority Questions

### 14. Test Data Seeding Strategy

**Issue**: No seed script or test data fixtures.

**Questions**:
1. Should seed script be created for development?
2. What test data is needed?
3. Should fixtures include sample users, tasks, friendships?

**Recommended Action**:
Create `supabase/seed.sql` with:
- 3-5 test users
- 10+ sample tasks
- Friend connections between users
- Sample rewards
- Initial credits for testing purchases

---

### 15. Missing .env.example File

**Issue**: No `.env.example` file in repo to guide setup.

**Impact**:
- New developers don't know what env vars are required
- Easy to miss required configuration

**Questions**:
1. Should `.env.example` be created?
2. What variables should be documented?

**Recommended Content**:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: For local Supabase development
# VITE_SUPABASE_URL=http://localhost:54321
# VITE_SUPABASE_ANON_KEY=<local-anon-key>
```

---

### 16. TypeScript database.ts Encoding Issue

**Issue**: [database.ts](../src/types/database.ts) appears to have character encoding issues when read via tools.

**Evidence**:
- Characters appear spaced out: `e x p o r t   t y p e   J s o n`
- Likely UTF-16 LE encoding instead of UTF-8

**Questions**:
1. Is file corrupted or is this a tooling issue?
2. Should file be regenerated with `supabase gen types`?

**Recommended Action**:
```bash
# Regenerate types with correct encoding
supabase gen types typescript --project-ref <ref> > src/types/database.ts
```

**File Locations**:
- [src/types/database.ts](../src/types/database.ts)

---

## Summary of Required Decisions

| # | Question | Options | Priority |
|---|----------|---------|----------|
| 1 | Migration timestamps | Replace with actual dates | 🔴 Critical |
| 2 | Table name (bounties vs rewards_store) | A) Use rewards_store B) Use bounties | 🔴 Critical |
| 3 | RLS policies for rewards tables | Define policies for rewards_store, user_credits, collected_rewards | 🔴 Critical |
| 4 | Duplicate tables | A) Remove marketplace_bounties B) Implement dual system | 🟡 High |
| 5 | Recurring tasks feature | A) Remove B) Implement | 🟡 High |
| 6 | Email service | Choose provider (Resend, SendGrid, etc.) | 🟡 High |
| 7 | Credit awarding security | A) Database trigger B) Edge function | 🔴 Critical |
| 8 | Storage bucket policies | Document and configure | 🟡 High |
| 12 | Bounty purchase race condition | Add UNIQUE constraint | 🟡 High |

---

**Last Updated**: 2025-10-25
**Next Steps**: Address critical blockers (#1-3, #7) before production deployment.
