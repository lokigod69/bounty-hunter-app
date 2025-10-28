# Proposal 001: Drop marketplace_bounties Table (Unused Duplicate)

**Status**: 🟡 CLEANUP - Table unused but has security gap
**Priority**: P2 (Medium - not urgent but recommended)
**Estimated Time**: 5 minutes
**Risk Level**: Minimal (table not used by app)

---

## Context

### Current State
- **Table**: `public.marketplace_bounties`
- **RLS Status**: **NOT ENABLED** ❌ (NO RLS at all)
- **Policies**: Zero (N/A - no RLS)
- **App Usage**: ❌ **NOT USED** (app uses `rewards_store` instead)
- **Impact**: Orphaned table with potential security gap if accidentally used

### Evidence from Schema Analysis

**schema_all.sql - No RLS on marketplace_bounties**:
```bash
# Check: grep for "marketplace_bounties.*ENABLE ROW" schema_all.sql
# Result: NO MATCHES

# Compare with other tables:
# line 2875: ALTER TABLE "public"."collected_rewards" ENABLE ROW LEVEL SECURITY;
# line 2881: ALTER TABLE "public"."credit_transactions" ENABLE ROW LEVEL SECURITY;
# line 2887: ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;
# line 2893: ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
# line 2899: ALTER TABLE "public"."rewards_store" ENABLE ROW LEVEL SECURITY;
# line 2905: ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;
# line 2911: ALTER TABLE "public"."user_credits" ENABLE ROW LEVEL SECURITY;

# marketplace_bounties is MISSING from this list!
```

**App Code - Uses rewards_store, not marketplace_bounties**:
```typescript
// src/hooks/useRewardsStore.ts:71
supabase
  .from('rewards_store')  // ← Uses rewards_store, NOT marketplace_bounties
  .select('*')
```

**ERD Analysis** ([erd_live.md](../../docs/sql-inventory/erd_live.md)):
- `marketplace_bounties`: ⚫ UNUSED - Not referenced in any app code
- `rewards_store`: ✅ ACTIVE - Used by useRewardsStore, RewardsStorePage

---

## Risk Analysis

### Security Risk (Current State)
- **Severity**: 🟡 **MEDIUM** (if accidentally used)
- **Attack Vector**: Anyone with database access can read/write all rows (no RLS)
- **Data Exposure**: Zero (table is empty/unused)
- **Business Impact**: None (app doesn't use this table)
- **Future Risk**: Developer might accidentally query wrong table

### Comparison: marketplace_bounties vs. rewards_store

| Feature | marketplace_bounties | rewards_store |
|---------|----------------------|---------------|
| RLS Enabled | ❌ NO | ✅ YES |
| Policies | None | 4 policies |
| Used by App | ❌ NO | ✅ YES |
| Triggers | `on_bounties_updated` | None |
| Extra Fields | `bounty_type`, `direct_reward` | `assigned_to` (required) |
| Purpose | Unknown (legacy?) | Active bounties assigned to users |

**Recommendation**: Drop `marketplace_bounties`, keep `rewards_store`

### Blast Radius
- **Affected Tables**: `marketplace_bounties`, `collected_bounties` (FK cascade)
- **Affected Users**: None (table unused)
- **Affected Code Paths**: None (no app code references)
- **RPC Functions**: `create_bounty()` inserts into `marketplace_bounties` (function exists but never called)

### Rollback Risk
- **Rollback Complexity**: Moderate (need to recreate table + trigger)
- **Data Loss Risk**: **NONE if table is empty** (verify before dropping)
- **Downtime**: Zero

---

## Proposed Changes

### Option A: Drop Table (Recommended)

**Pros**:
- Removes security gap
- Simplifies schema
- Reduces confusion

**Cons**:
- Irreversible (unless backed up)
- If table has data, data is lost

#### SQL UP Migration

```sql
-- File: supabase/migrations/20250125110001_drop_marketplace_bounties.sql

-- ============================================================
-- Proposal 001: Drop marketplace_bounties (Unused Duplicate)
-- ============================================================
-- Removes unused table with no RLS to simplify schema
-- ============================================================

BEGIN;

-- Safety check: Verify table is empty before dropping
DO $$
DECLARE
  row_count INT;
BEGIN
  SELECT COUNT(*) INTO row_count FROM public.marketplace_bounties;
  IF row_count > 0 THEN
    RAISE EXCEPTION 'marketplace_bounties table is NOT EMPTY (% rows). Aborting drop. Investigate before proceeding.', row_count;
  END IF;
END $$;

-- Drop dependent table first (collected_bounties references marketplace_bounties)
DROP TABLE IF EXISTS public.collected_bounties CASCADE;

-- Drop marketplace_bounties table
DROP TABLE IF EXISTS public.marketplace_bounties CASCADE;

-- Drop unused RPC function that inserts into marketplace_bounties
DROP FUNCTION IF EXISTS public.create_bounty(text, text, text, integer, uuid) CASCADE;

-- Drop trigger function (if no other usage)
DROP FUNCTION IF EXISTS public.handle_bounties_updated_at() CASCADE;

COMMENT ON SCHEMA public IS 'Removed marketplace_bounties table (unused duplicate of rewards_store)';

COMMIT;
```

#### SQL DOWN Migration (Rollback)

```sql
-- File: supabase/migrations/20250125110001_drop_marketplace_bounties_down.sql

BEGIN;

-- Recreate marketplace_bounties table
CREATE TABLE public.marketplace_bounties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    image_url text,
    credit_cost integer NOT NULL,
    creator_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    bounty_type text DEFAULT 'credit'::text,
    direct_reward text,
    CONSTRAINT marketplace_bounties_bounty_type_check CHECK (bounty_type = ANY (ARRAY['credit'::text, 'direct'::text]))
);

ALTER TABLE public.marketplace_bounties ADD CONSTRAINT marketplace_bounties_pkey PRIMARY KEY (id);
ALTER TABLE public.marketplace_bounties ADD CONSTRAINT marketplace_bounties_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id);

-- Recreate collected_bounties table
CREATE TABLE public.collected_bounties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bounty_id uuid,
    collector_id uuid,
    collected_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.collected_bounties ADD CONSTRAINT collected_bounties_pkey PRIMARY KEY (id);
ALTER TABLE public.collected_bounties ADD CONSTRAINT collected_bounties_bounty_id_collector_id_key UNIQUE (bounty_id, collector_id);
ALTER TABLE public.collected_bounties ADD CONSTRAINT collected_bounties_bounty_id_fkey FOREIGN KEY (bounty_id) REFERENCES public.marketplace_bounties(id);
ALTER TABLE public.collected_bounties ADD CONSTRAINT collected_bounties_collector_id_fkey FOREIGN KEY (collector_id) REFERENCES public.profiles(id);
ALTER TABLE public.collected_bounties ENABLE ROW LEVEL SECURITY;

-- Recreate trigger function
CREATE FUNCTION public.handle_bounties_updated_at() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_bounties_updated BEFORE UPDATE ON public.marketplace_bounties FOR EACH ROW EXECUTE FUNCTION public.handle_bounties_updated_at();

-- Recreate RPC function
CREATE FUNCTION public.create_bounty(p_name text, p_description text, p_image_url text, p_credit_cost integer, p_creator_id uuid) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  new_bounty_id UUID;
BEGIN
  INSERT INTO marketplace_bounties (name, description, image_url, credit_cost, creator_id)
  VALUES (p_name, p_description, p_image_url, p_credit_cost, p_creator_id)
  RETURNING id INTO new_bounty_id;
  RETURN new_bounty_id;
END;
$$;

COMMIT;
```

---

### Option B: Keep Table + Add RLS (Not Recommended)

If you want to keep the table for future use:

```sql
-- Enable RLS
ALTER TABLE public.marketplace_bounties ENABLE ROW LEVEL SECURITY;

-- Add policies (same as rewards_store)
CREATE POLICY "Users can view active bounties" ON public.marketplace_bounties FOR SELECT USING (is_active = true);
CREATE POLICY "Creators can manage own bounties" ON public.marketplace_bounties FOR ALL USING (creator_id = auth.uid());
```

**Why Not Recommended**: Creates schema confusion, no clear benefit over `rewards_store`.

---

## Validation Steps

### Pre-Deployment Validation (Local)

1. **Verify table is empty**:
```sql
SELECT COUNT(*) FROM public.marketplace_bounties;
-- Expected: 0

SELECT COUNT(*) FROM public.collected_bounties;
-- Expected: 0
```

2. **Apply migration locally**:
```bash
psql -h localhost -U postgres -d postgres < supabase/migrations/20250125110001_drop_marketplace_bounties.sql
```

3. **Verify table dropped**:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_bounties';
-- Expected: 0 rows
```

4. **Verify app still works**:
```bash
# Start local Supabase
supabase start

# Run app
npm run dev

# Test rewards store page
# Navigate to /rewards-store
# Verify rewards load correctly (from rewards_store table)
```

### Post-Deployment Validation (Production)

1. **Query verification**:
```sql
-- Should fail (table doesn't exist)
SELECT * FROM public.marketplace_bounties;
-- Expected: ERROR: relation "public.marketplace_bounties" does not exist

-- Should work (table exists)
SELECT * FROM public.rewards_store;
-- Expected: Rows returned (active rewards)
```

2. **UI Test**:
```
1. Login to app
2. Navigate to /rewards-store
3. Verify rewards display
4. Create new reward
5. Verify reward created in rewards_store table
```

---

## Success Criteria

- ✅ `marketplace_bounties` table dropped
- ✅ `collected_bounties` table dropped (dependent table)
- ✅ `create_bounty()` RPC function removed
- ✅ No app errors (app uses `rewards_store` only)
- ✅ Schema simplified
- ✅ Security gap eliminated

---

## Dependencies

- **Blocks**: None
- **Blocked By**: Verify table is empty
- **Related**:
  - Proposal 002 (collected_bounties - will be dropped as cascade)
  - [open-questions.md #4](../../docs/open-questions.md#4-duplicate-tables---which-to-keep)

---

## Decision Required

Before applying, confirm:

1. ✅ Table `marketplace_bounties` is empty (or you accept data loss)
2. ✅ Table `collected_bounties` is empty (or you accept data loss)
3. ✅ No future plans to use these tables
4. ✅ Prefer schema simplicity over keeping unused tables

**If uncertain, choose Option B (Add RLS) instead of dropping.**

---

## Approval Checklist

- [ ] Verified `marketplace_bounties` is empty (production)
- [ ] Verified `collected_bounties` is empty (production)
- [ ] SQL UP tested on local mirror
- [ ] SQL DOWN tested (rollback verified)
- [ ] App tested without table (no errors)
- [ ] Confirmed no business need for table

**Ready for Production**: ⏸️ PENDING (awaiting data verification)

---

**Created**: 2025-01-25
**Author**: Code Cartographer (SQL Recon Mode)
**Review Status**: Pending data verification + approval
