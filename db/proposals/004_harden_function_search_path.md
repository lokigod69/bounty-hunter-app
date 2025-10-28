# Proposal 004: Harden Function search_path Security

**Priority**: P1 (High)
**Status**: 📝 Draft
**Risk**: Low
**Estimated Time**: 15 minutes
**Reversible**: Yes (full DOWN migration)

---

## Problem Statement

All `SECURITY DEFINER` functions in the database lack explicit `search_path` configuration, creating a **privilege escalation vulnerability**.

### Vulnerability Explanation

When a `SECURITY DEFINER` function runs, it executes with the privileges of the function owner (usually `postgres` or admin). If the `search_path` is not hardened:

1. **Attacker** can manipulate their session's `search_path` (e.g., `SET search_path = malicious_schema, public, pg_temp`)
2. **Function** executes with attacker's `search_path`
3. **Database** resolves unqualified table/function names using attacker's schema FIRST
4. **Exploit** allows arbitrary code execution with elevated privileges

### Current State

5 functions are vulnerable:

| Function | Line | Schema Qualification | Risk |
|----------|------|----------------------|------|
| `create_reward_store_item` | 283 | ✅ Fully qualified (`public.friendships`, `auth.uid()`) | Low (but should fix) |
| `delete_reward_store_item` | 323 | ✅ Fully qualified (`public.rewards_store`, `auth.uid()`) | Low (but should fix) |
| `handle_new_user` | 361 | ✅ Fully qualified (`public.profiles`) | Low (but should fix) |
| `increment_user_credits` | 399 | ❌ Unqualified (`user_credits`) | **MEDIUM** - exploitable |
| `update_reward_store_item` | 495 | ✅ Fully qualified (`public.rewards_store`, `auth.uid()`) | Low (but should fix) |

**Good News**: 4/5 functions use fully qualified names (`public.table_name`), reducing immediate risk.
**Bad News**: `increment_user_credits` uses unqualified `user_credits` table reference (line 402) - **EXPLOITABLE**.

### Example Attack Scenario

```sql
-- 1. Attacker creates malicious schema
CREATE SCHEMA evil;
CREATE TABLE evil.user_credits (user_id uuid, balance integer);

-- 2. Attacker manipulates search_path
SET search_path = evil, public, pg_temp;

-- 3. Attacker calls vulnerable function
SELECT increment_user_credits('<attacker-uuid>', 999999);
-- Function writes to evil.user_credits instead of public.user_credits
-- Real credits table unchanged, but function executes attacker code
```

---

## Proposed Solution

Add `SET search_path = public, pg_temp` to all `SECURITY DEFINER` functions. This forces the database to:

1. Search `public` schema first (our app tables)
2. Search `pg_temp` schema second (temporary tables - safe)
3. **IGNORE** any user-controlled schemas

### PostgreSQL Best Practice

From [PostgreSQL Security Hardening Guide](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY):

> "For security, `search_path` should be set to contain only schemas writable by trusted users."

From [Supabase Security Advisor](https://supabase.com/docs/guides/database/database-advisors):

> "Functions with role-mutable `search_path` can execute with caller's search path, allowing schema poisoning attacks."

---

## Migration SQL

### UP Migration

**File**: `supabase/migrations/20250125130001_harden_function_search_path.sql`

```sql
-- =====================================================
-- PROPOSAL 004: Harden Function search_path Security
-- =====================================================
-- Date: 2025-01-25
-- Priority: P1 (High)
-- Risk: Low (no behavior changes, only security hardening)
-- Reversible: Yes (see DOWN migration)
--
-- CHANGES:
-- - Add `SET search_path = public, pg_temp` to 5 SECURITY DEFINER functions
-- - Prevents privilege escalation via search_path manipulation
--
-- AFFECTED FUNCTIONS:
-- 1. create_reward_store_item
-- 2. delete_reward_store_item
-- 3. handle_new_user
-- 4. increment_user_credits (CRITICAL - has unqualified table ref)
-- 5. update_reward_store_item
--
-- NO BEHAVIORAL CHANGES - only hardening
-- =====================================================

-- 1. Harden create_reward_store_item
-- (Already uses qualified names, but add search_path for defense-in-depth)
CREATE OR REPLACE FUNCTION "public"."create_reward_store_item"("p_name" "text", "p_description" "text", "p_image_url" "text", "p_credit_cost" integer, "p_assigned_to" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
DECLARE
  v_new_id UUID;
  v_are_friends BOOLEAN;
BEGIN
  -- Check friendship
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND ((user1_id = auth.uid() AND user2_id = p_assigned_to)
      OR (user2_id = auth.uid() AND user1_id = p_assigned_to))
  ) INTO v_are_friends;

  IF NOT v_are_friends THEN
    RETURN json_build_object('success', false, 'error', 'Can only create bounties for friends');
  END IF;

  -- Validate credits
  IF p_credit_cost < 1 OR p_credit_cost > 1000000 THEN
    RETURN json_build_object('success', false, 'error', 'Credit cost must be between 1 and 1,000,000');
  END IF;

  -- Insert
  INSERT INTO public.rewards_store (
    name, description, image_url, credit_cost, creator_id, assigned_to
  ) VALUES (
    p_name, p_description, p_image_url, p_credit_cost, auth.uid(), p_assigned_to
  ) RETURNING id INTO v_new_id;

  RETURN json_build_object('success', true, 'reward_id', v_new_id);
END;
$$;


-- 2. Harden delete_reward_store_item
CREATE OR REPLACE FUNCTION "public"."delete_reward_store_item"("p_bounty_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
BEGIN
  -- Check if user owns this bounty
  IF NOT EXISTS (
    SELECT 1 FROM public.rewards_store
    WHERE id = p_bounty_id AND creator_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Delete the bounty
  DELETE FROM public.rewards_store WHERE id = p_bounty_id;

  RETURN json_build_object('success', true);
END;
$$;


-- 3. Harden handle_new_user
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    SPLIT_PART(new.email, '@', 1),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;


-- 4. Harden increment_user_credits (CRITICAL)
-- This function had unqualified 'user_credits' reference - NOW HARDENED
CREATE OR REPLACE FUNCTION "public"."increment_user_credits"("user_id_param" "uuid", "amount_param" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
BEGIN
  UPDATE public.user_credits  -- NOW QUALIFIED (was: user_credits)
  SET balance = balance + amount_param
  WHERE user_id = user_id_param;
END;
$$;


-- 5. Harden update_reward_store_item
CREATE OR REPLACE FUNCTION "public"."update_reward_store_item"("p_bounty_id" "uuid", "p_name" "text", "p_description" "text", "p_image_url" "text", "p_credit_cost" integer) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
BEGIN
  -- Check ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.rewards_store
    WHERE id = p_bounty_id AND creator_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Update WITHOUT updated_at (remove that line)
  UPDATE public.rewards_store
  SET
    name = p_name,
    description = p_description,
    image_url = p_image_url,
    credit_cost = p_credit_cost
  WHERE id = p_bounty_id;

  RETURN json_build_object('success', true);
END;
$$;


-- =====================================================
-- VALIDATION
-- =====================================================
-- Run after migration to verify all functions hardened

-- Check that all SECURITY DEFINER functions now have search_path set
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  CASE
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END AS security_type,
  proconfig AS configuration
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
ORDER BY p.proname;

-- Expected output:
--   schema | function_name              | security_type     | configuration
--   -------|----------------------------|-------------------|--------------------------------
--   public | create_reward_store_item   | SECURITY DEFINER  | {search_path=public,pg_temp}
--   public | delete_reward_store_item   | SECURITY DEFINER  | {search_path=public,pg_temp}
--   public | handle_new_user            | SECURITY DEFINER  | {search_path=public,pg_temp}
--   public | increment_user_credits     | SECURITY DEFINER  | {search_path=public,pg_temp}
--   public | update_reward_store_item   | SECURITY DEFINER  | {search_path=public,pg_temp}
--
-- All 5 functions should show configuration = {search_path=public,pg_temp}
```

---

### DOWN Migration (Rollback)

**File**: `supabase/migrations/20250125130001_harden_function_search_path_down.sql`

```sql
-- =====================================================
-- ROLLBACK: Proposal 004 - Remove search_path Hardening
-- =====================================================
-- Restores functions to original state WITHOUT search_path configuration
-- USE ONLY IF MIGRATION CAUSES ISSUES (unlikely)
-- =====================================================

-- 1. Restore create_reward_store_item (remove SET search_path)
CREATE OR REPLACE FUNCTION "public"."create_reward_store_item"("p_name" "text", "p_description" "text", "p_image_url" "text", "p_credit_cost" integer, "p_assigned_to" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_new_id UUID;
  v_are_friends BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND ((user1_id = auth.uid() AND user2_id = p_assigned_to)
      OR (user2_id = auth.uid() AND user1_id = p_assigned_to))
  ) INTO v_are_friends;

  IF NOT v_are_friends THEN
    RETURN json_build_object('success', false, 'error', 'Can only create bounties for friends');
  END IF;

  IF p_credit_cost < 1 OR p_credit_cost > 1000000 THEN
    RETURN json_build_object('success', false, 'error', 'Credit cost must be between 1 and 1,000,000');
  END IF;

  INSERT INTO public.rewards_store (
    name, description, image_url, credit_cost, creator_id, assigned_to
  ) VALUES (
    p_name, p_description, p_image_url, p_credit_cost, auth.uid(), p_assigned_to
  ) RETURNING id INTO v_new_id;

  RETURN json_build_object('success', true, 'reward_id', v_new_id);
END;
$$;


-- 2. Restore delete_reward_store_item
CREATE OR REPLACE FUNCTION "public"."delete_reward_store_item"("p_bounty_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.rewards_store
    WHERE id = p_bounty_id AND creator_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  DELETE FROM public.rewards_store WHERE id = p_bounty_id;

  RETURN json_build_object('success', true);
END;
$$;


-- 3. Restore handle_new_user
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    SPLIT_PART(new.email, '@', 1),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;


-- 4. Restore increment_user_credits (REVERT TO UNQUALIFIED - VULNERABLE)
CREATE OR REPLACE FUNCTION "public"."increment_user_credits"("user_id_param" "uuid", "amount_param" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE user_credits  -- UNQUALIFIED (original vulnerable state)
  SET balance = balance + amount_param
  WHERE user_id = user_id_param;
END;
$$;


-- 5. Restore update_reward_store_item
CREATE OR REPLACE FUNCTION "public"."update_reward_store_item"("p_bounty_id" "uuid", "p_name" "text", "p_description" "text", "p_image_url" "text", "p_credit_cost" integer) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.rewards_store
    WHERE id = p_bounty_id AND creator_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE public.rewards_store
  SET
    name = p_name,
    description = p_description,
    image_url = p_image_url,
    credit_cost = p_credit_cost
  WHERE id = p_bounty_id;

  RETURN json_build_object('success', true);
END;
$$;
```

---

## Testing Plan

### Local Testing

```bash
# 1. Start local Supabase
supabase start

# 2. Load schema
psql -h localhost -p 54322 -U postgres -d postgres < supabase/schema_all.sql

# 3. Apply migration
psql -h localhost -p 54322 -U postgres -d postgres < supabase/migrations/20250125130001_harden_function_search_path.sql

# 4. Verify search_path configuration
psql -h localhost -p 54322 -U postgres -d postgres -c "
SELECT
  p.proname AS function_name,
  CASE WHEN prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_type,
  proconfig AS configuration
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
ORDER BY p.proname;
"
# Expected: All 5 functions show configuration = {search_path=public,pg_temp}

# 5. Test functions still work
psql -h localhost -p 54322 -U postgres -d postgres -c "
-- Set auth context
SET LOCAL auth.jwt_claims.sub TO '11111111-1111-1111-1111-111111111111';

-- Test create_reward_store_item
SELECT create_reward_store_item(
  'Test Reward',
  'Test Description',
  'https://example.com/image.png',
  50,
  '22222222-2222-2222-2222-222222222222'::uuid
);
"
# Expected: JSON response with success: true

# 6. Test attack scenario no longer works
psql -h localhost -p 54322 -U postgres -d postgres -c "
-- Create malicious schema
CREATE SCHEMA evil;
CREATE TABLE evil.user_credits (user_id uuid, balance integer);

-- Manipulate search_path
SET search_path = evil, public, pg_temp;

-- Attempt exploit
SELECT increment_user_credits('11111111-1111-1111-1111-111111111111'::uuid, 999999);

-- Verify attack failed (function used public.user_credits, not evil.user_credits)
SELECT COUNT(*) FROM evil.user_credits;  -- Expected: 0 (not written)
SELECT balance FROM public.user_credits WHERE user_id = '11111111-1111-1111-1111-111111111111';
-- Expected: Balance unchanged (or increased by proper amount if function ran normally)
"

# 7. Test rollback
psql -h localhost -p 54322 -U postgres -d postgres < supabase/migrations/20250125130001_harden_function_search_path_down.sql

# 8. Verify rollback successful
psql -h localhost -p 54322 -U postgres -d postgres -c "
SELECT proname, proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prosecdef = true;
"
# Expected: configuration = NULL (search_path removed)
```

---

## Impact Assessment

| Category | Severity | Details |
|----------|----------|---------|
| **Data Loss** | None | No data modifications, only function configuration changes |
| **Downtime** | None | Functions replaced online, no locks |
| **Breaking Changes** | None | Functions behave identically (search_path already included public schema by default) |
| **Performance** | None | No performance impact |
| **Security Improvement** | **HIGH** | Closes privilege escalation vulnerability |
| **Rollback Complexity** | Trivial | Simple `CREATE OR REPLACE` statements |
| **Overall Risk** | **🟢 LOW** | **Safe to apply immediately** |

---

## Success Criteria

- ✅ All 5 `SECURITY DEFINER` functions show `configuration = {search_path=public,pg_temp}` in `pg_proc`
- ✅ Functions continue to work normally (no app errors)
- ✅ Attack scenario test fails (malicious schema not used)
- ✅ App functionality unchanged (create rewards, delete rewards, user signup, credit operations)
- ✅ No errors in Supabase logs after deployment

---

## References

- [PostgreSQL SECURITY DEFINER Documentation](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [PostgreSQL search_path Security](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)
- [Supabase Security Advisors](https://supabase.com/docs/guides/database/database-advisors)
- [OWASP: SQL Injection via search_path](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

---

**Created**: 2025-01-25
**Last Updated**: 2025-01-25
**Status**: 📝 Draft - Ready for local testing
**Approved By**: _Pending_

---

**END OF PROPOSAL 004**
