# Proposal 008: Atomic Purchase with No Negative Balances

**Date**: 2025-01-27
**Priority**: P0 (Critical)
**Status**: ✅ Ready for Deployment
**Risk**: 🟡 MEDIUM (New function + constraints, requires frontend update)

---

## Executive Summary

**Problem**: Current `purchase_bounty` function has race conditions allowing:
1. Concurrent purchases by same user can create negative balances
2. No transaction logging
3. No proper error codes for insufficient funds
4. Duplicate purchase prevention relies on client-side logic

**Solution**: New `purchase_reward()` function with:
- Row-level locking (`SELECT ... FOR UPDATE`)
- CHECK constraint + trigger to prevent negative balances
- Atomic transaction with credit_transactions logging
- Comprehensive error codes (INSUFFICIENT_FUNDS, ALREADY_COLLECTED, SELF_PURCHASE)

---

## Files Created

### SQL Migrations
1. **[db/proposals/008_atomic_purchase.up.sql](../../db/proposals/008_atomic_purchase.up.sql)**
   - Creates `purchase_reward(p_reward_id, p_collector_id)` function
   - Adds CHECK constraint `user_credits_balance_non_negative`
   - Creates trigger `enforce_non_negative_balance`
   - Grants execute permission to authenticated users

2. **[db/proposals/008_atomic_purchase.down.sql](../../db/proposals/008_atomic_purchase.down.sql)**
   - Drops trigger and trigger function
   - Drops CHECK constraint
   - Drops purchase_reward function
   - Revokes permissions

3. **[db/proposals/008_validation.sql](../../db/proposals/008_validation.sql)**
   - Schema validation queries (function, constraint, trigger existence)
   - Functional tests (success, insufficient funds, duplicate, self-purchase)
   - Concurrency test instructions
   - Data integrity checks

### Deployment Scripts
4. **[scripts/local/apply_008_up.ps1](../../scripts/local/apply_008_up.ps1)** - Local migration
5. **[scripts/local/validate_008.ps1](../../scripts/local/validate_008.ps1)** - Local validation
6. **[scripts/prod/apply_008_up.ps1](../../scripts/prod/apply_008_up.ps1)** - Production migration
7. **[scripts/prod/validate_008.ps1](../../scripts/prod/validate_008.ps1)** - Production validation

### Documentation
8. **[PROD_RUNBOOK_008.md](../../PROD_RUNBOOK_008.md)** - Step-by-step deployment guide

### Frontend Changes
9. **[src/hooks/usePurchaseBounty.ts](../../src/hooks/usePurchaseBounty.ts)** - Updated to use `purchase_reward` RPC

---

## Technical Details

### Function Signature

```sql
CREATE OR REPLACE FUNCTION public.purchase_reward(
  p_reward_id UUID,
  p_collector_id UUID
)
RETURNS JSON
```

### Transaction Flow

```sql
BEGIN;
  -- 1. Lock user's credit row
  SELECT balance FROM user_credits WHERE user_id = p_collector_id FOR UPDATE;

  -- 2. Validate reward exists and active
  SELECT credit_cost, creator_id, name FROM rewards_store WHERE id = p_reward_id AND is_active = true;

  -- 3. Check sufficient balance
  IF v_current_balance < v_reward_cost THEN
    RETURN json_build_object('success', false, 'error', 'INSUFFICIENT_FUNDS', ...);
  END IF;

  -- 4. Insert into collected_rewards (UNIQUE constraint prevents duplicates)
  INSERT INTO collected_rewards (reward_id, collector_id) VALUES (...);

  -- 5. Log transaction
  INSERT INTO credit_transactions (user_id, delta, reason, reference_id) VALUES (...);

  -- 6. Deduct credits
  UPDATE user_credits SET balance = balance - v_reward_cost WHERE user_id = p_collector_id;

  RETURN json_build_object('success', true, 'new_balance', ...);
COMMIT;
```

### Error Codes

| Error Code | Meaning | HTTP Analogy |
|------------|---------|--------------|
| `INSUFFICIENT_FUNDS` | User has < required credits | 402 Payment Required |
| `ALREADY_COLLECTED` | Duplicate purchase attempt | 409 Conflict |
| `SELF_PURCHASE` | User tried to buy own reward | 403 Forbidden |
| `REWARD_NOT_FOUND` | Reward doesn't exist or inactive | 404 Not Found |

### Defense Layers

1. **Row-level lock**: Prevents concurrent modifications to same user's balance
2. **UNIQUE constraint**: Prevents duplicate (reward_id, collector_id) pairs (from Proposal 003)
3. **CHECK constraint**: Database-level validation that balance >= 0
4. **Trigger**: Additional enforcement on UPDATE operations
5. **Transaction**: All-or-nothing atomicity

---

## Deployment Checklist

### Pre-Deployment
- [ ] Local Supabase running on port 55432
- [ ] Local schema loaded (`schema_all.sql`)
- [ ] Test data available (users with credits, active rewards)

### Local Testing
- [ ] Run `scripts/local/apply_008_up.ps1`
- [ ] Run `scripts/local/validate_008.ps1`
- [ ] Verify function exists
- [ ] Verify CHECK constraint present
- [ ] Verify trigger present
- [ ] Test successful purchase (sufficient funds)
- [ ] Test insufficient funds error
- [ ] Test duplicate purchase prevention
- [ ] Test concurrency (two purchases simultaneously)
- [ ] Verify no negative balances

### Production Deployment
- [ ] Create production schema backup
- [ ] Set `$env:PROD_CONFIRM = "YES"`
- [ ] Run `scripts/prod/apply_008_up.ps1`
- [ ] Run `scripts/prod/validate_008.ps1`
- [ ] Verify validation passes
- [ ] Deploy frontend with updated `purchase_reward` RPC
- [ ] Test app functionality (all 4 test scenarios)
- [ ] Monitor logs for 15 minutes
- [ ] Check for negative balances (should be 0)

### Post-Deployment
- [ ] Update [plan.md](../../plan.md) - mark Proposal 008 complete
- [ ] Update [CHANGESET_20250125.md](../sql-inventory/CHANGESET_20250125.md) - add 008 Applied
- [ ] Create [PROD_VALIDATION_008.md](../sql-inventory/PROD_VALIDATION_008.md) - document results
- [ ] Communicate deployment success to team

---

## Acceptance Criteria

### Database
✅ **Function**: `purchase_reward` exists with SECURITY DEFINER
✅ **Constraint**: `user_credits_balance_non_negative` CHECK constraint present
✅ **Trigger**: `enforce_non_negative_balance` active on user_credits
✅ **Zero Negative Balances**: Query returns 0 rows

### Functional
✅ **Successful Purchase**: Returns `{success: true, new_balance: X}`
✅ **Insufficient Funds**: Returns `{success: false, error: 'INSUFFICIENT_FUNDS'}`
✅ **Duplicate Purchase**: Returns `{success: false, error: 'ALREADY_COLLECTED'}`
✅ **Self-Purchase**: Returns `{success: false, error: 'SELF_PURCHASE'}`

### Concurrency
✅ **Race Condition**: Two simultaneous purchases for same user → exactly 1 succeeds
✅ **Final Balance**: Correct (initial - cost of successful purchase)
✅ **Transaction Log**: One negative delta entry in credit_transactions

### Frontend
✅ **Success Toast**: "Reward claimed! New balance: X credits"
✅ **Insufficient Funds Toast**: "Insufficient credits. Need X, have Y."
✅ **Already Collected Toast**: "You have already collected this reward."
✅ **Self-Purchase Toast**: "Cannot purchase your own reward."
✅ **Balance Update**: User's balance reflects purchase immediately

---

## Rollback Plan

**If critical issues occur** (e.g., deadlocks, app errors):

1. Revert frontend to use old `purchase_bounty` RPC
2. Run `scripts/prod/rollback_008.ps1` (drops new function/constraint/trigger)
3. Monitor for 10 minutes to ensure stability
4. Investigate root cause offline

**Rollback Time**: < 2 minutes
**Data Loss**: None (old purchase_bounty still exists, no data deleted)

---

## Performance Impact

**Expected**:
- Purchase response time: +50-100ms (due to row locking + transaction logging)
- Database load: Minimal increase (one additional INSERT to credit_transactions)
- Concurrency: Slight decrease in throughput (row locks serialize purchases per user)

**Acceptable**: Purchase is infrequent operation (< 10/minute expected)

**Monitoring**: Watch for:
- Deadlock errors (should be 0)
- Timeout errors (should be 0)
- Purchase p95 latency < 500ms

---

## Future Improvements (Out of Scope)

1. **Idempotency keys**: Allow safe retries with deduplication
2. **Purchase history API**: Paginated list of user's purchases
3. **Balance snapshots**: Point-in-time balance history
4. **Refund mechanism**: Admin function to reverse purchases
5. **Batch purchases**: Buy multiple rewards in one transaction

---

## References

- [Proposal 003](003_rls_collected_rewards.md) - UNIQUE constraint on collected_rewards
- [PROD_RUNBOOK_008.md](../../PROD_RUNBOOK_008.md) - Deployment guide
- [PostgreSQL Row Locking](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS)
- [CHECK Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS)

---

**Created**: 2025-01-27
**Status**: Ready for local testing
**Next Step**: Deploy to local Supabase and run validation suite

---

**END OF PROPOSAL**
