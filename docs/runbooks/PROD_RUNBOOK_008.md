# Production Runbook - Proposal 008
## Atomic Purchase with No Negative Balances

**Date**: 2025-01-27
**Priority**: P0 (Critical - Fixes race conditions and negative balances)
**Risk**: 🟡 MEDIUM - Adds new function, constraint, and trigger (backward compatible)
**Downtime**: 0 seconds

---

## What This Does

Introduces `purchase_reward()` function with atomic transaction guarantees:

**New Features**:
1. **Row-level locking** (`SELECT ... FOR UPDATE`) prevents concurrent purchase races
2. **CHECK constraint** prevents negative balances at database level
3. **Trigger** enforces non-negative balance on all updates
4. **Comprehensive error codes**: `INSUFFICIENT_FUNDS`, `ALREADY_COLLECTED`, `SELF_PURCHASE`
5. **Transaction logging** to `credit_transactions` table

**Backward Compatibility**: Old `purchase_bounty` function remains unchanged. Frontend must migrate to `purchase_reward`.

---

## Prerequisites

1. ✅ Proposal 003/004/005/006 deployed
2. ✅ Production schema backup recent (< 24 hours)
3. ✅ `PROD_CONFIRM=YES` environment variable set
4. ✅ Frontend deployment ready (to switch RPC call)

---

## Step 1: Backup Production Schema

```powershell
$env:PROD_CONFIRM = "YES"
powershell -ExecutionPolicy Bypass -File scripts/prod/backup_schema.ps1
```

**Expected Output**:
```
Backup written: supabase\schema_backup_YYYYMMDD_HHMMSS.sql
```

---

## Step 2: Apply Migration

```powershell
# Apply migration
powershell -ExecutionPolicy Bypass -File scripts/prod/apply_008_up.ps1
```

**Expected Output**:
```
BEGIN
CREATE FUNCTION
ALTER TABLE
CREATE FUNCTION
CREATE TRIGGER
GRANT
COMMIT
Migration applied successfully
```

**If Errors**: STOP and run rollback (see Step 6)

---

## Step 3: Validate Migration

```powershell
# Run validation queries
powershell -ExecutionPolicy Bypass -File scripts/prod/validate_008.ps1
```

**Expected Key Results**:

1. **Function exists**:
   ```
   function_name  | arguments                    | security_mode
   ---------------+------------------------------+-----------------
   purchase_reward| p_reward_id uuid, ...        | SECURITY DEFINER
   ```

2. **CHECK constraint exists**:
   ```
   constraint_name                      | constraint_type | definition
   -------------------------------------+-----------------+-------------------------
   user_credits_balance_non_negative    | c               | CHECK ((balance >= 0))
   ```

3. **Trigger exists**:
   ```
   trigger_name                    | trigger_function
   --------------------------------+---------------------------
   enforce_non_negative_balance    | prevent_negative_balance
   ```

4. **No negative balances**:
   ```
   user_id | balance
   --------+---------
   (0 rows)
   ```

**Success Criteria**:
- ✅ purchase_reward function exists
- ✅ CHECK constraint present
- ✅ Trigger present
- ✅ No negative balances in database

---

## Step 4: Deploy Frontend Changes

**IMPORTANT**: Frontend must be deployed to use new `purchase_reward` RPC.

### Frontend Changes Required:

**File**: `src/hooks/usePurchaseBounty.ts`

**Change**:
```typescript
// OLD:
const { data, error: rpcError } = await supabase.rpc('purchase_bounty', {
  p_bounty_id: rewardId,
  p_collector_id: user.id
});

// NEW:
const { data, error: rpcError } = await supabase.rpc('purchase_reward', {
  p_reward_id: rewardId,
  p_collector_id: user.id
});

// Handle new error codes:
if (rpcError) {
  if (rpcError.message.includes('INSUFFICIENT_FUNDS')) {
    toast.error('Insufficient credits to purchase this reward');
  } else if (rpcError.message.includes('ALREADY_COLLECTED')) {
    toast.error('You have already collected this reward');
  } else if (rpcError.message.includes('SELF_PURCHASE')) {
    toast.error('Cannot purchase your own reward');
  } else {
    toast.error('Failed to purchase reward');
  }
  throw rpcError;
}
```

### Deployment Order:
1. ✅ Deploy database migration (Steps 1-3 above)
2. ⏸️ Deploy frontend with updated RPC call
3. ⏸️ Verify app functionality (Step 5)

---

## Step 5: Test Application (Post-Frontend Deploy)

### Test Scenario 1: Successful Purchase

1. Login to app: https://bounty-hunter-app.vercel.app
2. Navigate to **Rewards Store**
3. Note current balance (e.g., 100 credits)
4. Find a reward costing less than balance (e.g., 50 credits)
5. Click **Claim** button
6. **Expected**:
   - ✅ Success toast: "Reward purchased successfully"
   - ✅ Balance decreased by reward cost (now 50 credits)
   - ✅ Reward appears in My Collected Rewards

### Test Scenario 2: Insufficient Funds

1. Find a reward costing MORE than current balance
2. Click **Claim** button
3. **Expected**:
   - ✅ Error toast: "Insufficient credits to purchase this reward"
   - ✅ Balance unchanged
   - ✅ Reward NOT collected

### Test Scenario 3: Duplicate Purchase Prevention

1. Attempt to claim same reward twice
2. **Expected**:
   - ✅ First click: Success
   - ✅ Second click: Error toast "You have already collected this reward"

### Test Scenario 4: Concurrent Purchases (Manual)

**Setup**:
- User A has 100 credits
- Reward X costs 60 credits
- Reward Y costs 60 credits

**Test**:
- Open two browser windows (same user)
- Click "Claim" on Reward X and Reward Y simultaneously
- **Expected**:
  - ✅ Exactly ONE purchase succeeds
  - ✅ One shows success, other shows "Insufficient funds"
  - ✅ Final balance = 40 credits (100 - 60)

---

## Step 6: Rollback (Emergency Only)

**Only run if validation fails or critical app errors occur**

```powershell
$env:PROD_CONFIRM = "YES"
powershell -ExecutionPolicy Bypass -File scripts/prod/rollback_008.ps1
```

**Create rollback script** (if not exists):
```powershell
# scripts/prod/rollback_008.ps1
param(
  [string]$DbHost = "aws-0-us-east-2.pooler.supabase.com",
  [int]$DbPort    = 5432,
  [string]$DbUser = "postgres.tsnjpylkgsovjujoczll",
  [string]$DbName = "postgres",
  [string]$Sql  = "db\proposals\008_atomic_purchase.down.sql"
)

if ($env:PROD_CONFIRM -ne "YES") { throw "Set PROD_CONFIRM=YES to allow prod actions." }

function Read-Plain([string]$prompt) {
  $sec = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if (-not (Test-Path $Sql)) { throw "Rollback not found: $Sql" }
if (-not $env:PGPASSWORD) { $env:PGPASSWORD = Read-Plain "Enter PROD DB password" }

$psqlPath = "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe"
& $psqlPath "host=$DbHost port=$DbPort user=$DbUser dbname=$DbName" -f $Sql

$env:PGPASSWORD = $null
Write-Host "Rollback complete" -ForegroundColor Yellow
```

**Expected Output**:
```
BEGIN
REVOKE
DROP TRIGGER
DROP FUNCTION
ALTER TABLE
DROP FUNCTION
COMMIT
Rollback complete
```

**Post-Rollback**:
- ⚠️ Revert frontend to use old `purchase_bounty` RPC
- ⚠️ Database no longer protected against negative balances

**Rollback Time**: < 10 seconds
**Risk**: None (restores to previous state)

---

## Step 7: Monitor (15 minutes)

After successful deployment (DB + frontend), monitor for 15 minutes:

### 1. Supabase Dashboard → Logs → Database
- Look for: RPC errors, constraint violations
- Expected: Normal purchase activity, no errors

### 2. Application Logs
- Check browser console for errors
- Check Vercel logs for server errors
- Expected: No purchase-related errors

### 3. Database Queries (Live Monitoring)

```powershell
$env:PROD_CONFIRM = "YES"
$env:PGPASSWORD = Read-Host "Enter PROD DB password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

$psqlPath = "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe"

# Check for negative balances (should be 0)
& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -c "SELECT COUNT(*) AS negative_balance_count FROM public.user_credits WHERE balance < 0;"

# Check recent purchases
& $psqlPath "host=aws-0-us-east-2.pooler.supabase.com port=5432 user=postgres.tsnjpylkgsovjujoczll dbname=postgres" `
  -c "SELECT COUNT(*) AS purchases_last_15_min FROM public.collected_rewards WHERE collected_at > NOW() - INTERVAL '15 minutes';"

$env:PGPASSWORD = $null
```

**Expected**:
- `negative_balance_count`: 0
- `purchases_last_15_min`: (depends on traffic, should be > 0 if app is active)

---

## Success Criteria

**Database**:
- ✅ purchase_reward function exists with SECURITY DEFINER
- ✅ CHECK constraint prevents negative balances
- ✅ Trigger enforces non-negative balance
- ✅ Zero negative balances in production

**Application**:
- ✅ Successful purchases complete without errors
- ✅ Insufficient funds error displays correctly
- ✅ Duplicate purchase prevention works
- ✅ Concurrent purchases: exactly 1 succeeds per user/reward pair
- ✅ Balance updates correctly after purchase

**Performance**:
- ✅ Purchase response time < 500ms (no degradation)
- ✅ No database deadlocks or timeout errors

---

## Troubleshooting

### Error: "permission denied for table user_credits"
**Cause**: RLS policy blocks authenticated user from selecting own row
**Fix**: Verify user_credits RLS policies allow SELECT on own row

### Error: "duplicate key value violates unique constraint"
**Cause**: User already purchased reward (expected behavior)
**Fix**: Frontend should handle `ALREADY_COLLECTED` error gracefully

### Error: "Balance cannot be negative"
**Cause**: Trigger correctly blocked invalid update
**Fix**: This is working as intended - investigate why negative balance was attempted

### Frontend shows "purchase_reward does not exist"
**Cause**: Database migration not applied or RPC name mismatch
**Fix**: Verify Step 3 validation passed, check frontend uses correct RPC name

---

## Communication Plan

**Before Deployment**:
- Notify team: "Deploying Proposal 008 (atomic purchases) - requires frontend redeploy"
- Schedule deployment window: Low-traffic period recommended

**During Deployment**:
- Deploy database migration first (backward compatible)
- Deploy frontend immediately after (< 5 minutes gap)
- Monitor logs actively during deployment

**After Deployment**:
- Send "all clear": "Proposal 008 deployed - atomic purchases active, no negative balances possible"
- Share monitoring dashboard link if available

---

## Next Steps

After successful deployment:
1. Update [plan.md](plan.md) → mark Proposal 008 as 🟩 Complete
2. Update [CHANGESET_20250125.md](docs/sql-inventory/CHANGESET_20250125.md) → add Proposal 008 Applied
3. Create [PROD_VALIDATION_008.md](docs/sql-inventory/PROD_VALIDATION_008.md) with validation results
4. Proceed to Proposal 009 (Storage policies for proofs)

---

**Created**: 2025-01-27
**Estimated Time**: 30 minutes (DB: 10 min, Frontend: 15 min, Validation: 5 min)
**Actual Downtime**: 0 seconds

---

**END OF RUNBOOK**
