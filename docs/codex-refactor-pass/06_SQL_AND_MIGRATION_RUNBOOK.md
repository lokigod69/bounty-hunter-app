# SQL And Migration Runbook

This project uses Supabase Postgres migrations in `supabase/migrations`.

Never run destructive SQL automatically. This repo does not assume production DB access.

## Migration Order

Run migrations in filename order:

```text
20231117000000_complete_task_instance.sql
20250127000000_add_daily_missions_and_streaks.sql
20250128000000_allow_unassigned_rewards_for_onboarding.sql
20250615195100_add_proof_required_to_task_instances.sql
20250615224500_create_or_update_recurring_task_instances.sql
20260109_approve_task_rpc.sql
20260109_approve_task_rpc_v2.sql
20260109_approve_task_rpc_v3_no_streaks.sql
20260109_cleanup_legacy_bounty_tables.sql
20260109_delete_reward_with_cascade.sql
20260109_fix_collected_at_default.sql
20260109_fix_increment_credits_rls.sql
20260109_fix_rewards_store_rls_for_collected.sql
20260109_purchase_rpc_better_errors.sql
20260110_fix_purchase_reward_columns.sql
20260412100100_lock_down_increment_user_credits.sql
20260412100200_phase1_reward_and_rpc_hardening.sql
20260412100300_lock_down_credit_table_writes.sql
```

## Current SQL Steps

| Step | Status | Risk | Notes |
|---|---|---|---|
| Apply existing migrations through `20260412100200` | unknown | medium | Must compare against production before running. |
| Apply `20260412100300_lock_down_credit_table_writes.sql` | required for hardening | medium | Removes direct browser credit writes and adds own collected reward select policy. |
| Run clean local `supabase db reset` | required before launch | medium | May expose recurring migration drift. |
| Create/verify storage buckets | required before launch | medium | Buckets: `avatars`, `bounty-proofs`, `reward-images`. |
| Drop legacy tables | optional/dangerous | high | Only after Saya confirms no data is needed. |

## New Migration In This Pass

`supabase/migrations/20260412100300_lock_down_credit_table_writes.sql`

Purpose:

- Drop client insert/update policies on `user_credits`.
- Revoke direct `INSERT`, `UPDATE`, and `DELETE` grants from `anon` and `authenticated`.
- Ensure authenticated users can still read their own credit balance.
- Ensure authenticated users can read their own collected rewards.

Rollback notes:

- Recreate the old insert/update policies only if the app is intentionally allowed to let clients initialize or modify credits. That is not recommended for public or monetized use.

## Manual SQL Guidance

Prefer Supabase CLI migration application over copying SQL manually:

```powershell
supabase db push
```

For production, Saya should first:

1. Back up the database.
2. Confirm which migrations are already applied.
3. Run migrations in staging.
4. Test mission approval, reward purchase, and collected rewards.
5. Apply to production only after staging passes.

No destructive SQL was run during this pass.
