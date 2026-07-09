# PROD Runbook 011 — Task Lifecycle RPCs (DRAFT)
Move submit/reject/status/archive/delete task transitions to server RPCs; tighten tasks RLS

**Date**: DRAFT (created 2026-07-10 — do not run until proposal 011 is approved)
**Priority**: P1 | **Risk**: 🔴 High | **Downtime**: none if steps 3–4 ship back-to-back

## What This Does
Applies [db/proposals/011_task_lifecycle_rpcs.up.sql](../../db/proposals/011_task_lifecycle_rpcs.up.sql):
five SECURITY DEFINER RPCs (`submit_proof`, `reject_task`, `set_task_status`,
`archive_task`, `delete_task`), drops the legacy `award_credits_on_completion` trigger
(double-credit hazard), and drops the two broad assignee-side UPDATE policies on `tasks`.

## Prerequisites
- [ ] Proposal 011 approved by Michael (all four open points A–D decided)
- [ ] Frontend build that calls the RPCs is ready to deploy (client refactor merged)
- [ ] Fresh schema backup: `scripts/prod/backup_schema.ps1`
- [ ] `PROD_CONFIRM=YES` set for the apply script
- [ ] Target: session pooler `aws-1-ap-south-1.pooler.supabase.com:5432`,
  user `postgres.mvbmpcmexkgfairnthux` (current live project)
- [ ] Apply/validate/rollback scripts created (`scripts/prod/apply_011_up.ps1`,
  `validate_011.ps1`, `rollback_011.ps1` — TODO on approval, copy the 008 pattern)

## Step 1: Pre-flight (read-only)
Run validation queries **#3** (trigger existence) and **#4** (live policy names) from
[db/proposals/011_validation.sql](../../db/proposals/011_validation.sql). If the policy
names differ from the snapshot names in the up.sql, edit the DROP POLICY lines first.

## Step 2: Backup
`scripts/prod/backup_schema.ps1` — verify the dump file exists and is non-trivial in size.

## Step 3: Apply
`scripts/prod/apply_011_up.ps1` — expect `BEGIN` … `DROP TRIGGER` … 5× `CREATE FUNCTION`
+ `REVOKE`/`GRANT`/`COMMENT` … 2× `DROP POLICY` … `COMMIT`.

## Step 4: Deploy frontend
Deploy the RPC-calling build to Vercel immediately (until then, old clients' direct
submit/reject/status/archive writes fail at RLS — the window should be minutes).

## Step 5: Validate
Queries #1, #2, #4 from 011_validation.sql; then manual core loop as two users:
create → start → submit proof (file / text / no-proof) → reject with reason → resubmit →
approve (credits land exactly once) → archive → delete.

## Step 6: Rollback (if needed)
`scripts/prod/rollback_011.ps1` → runs
[011_task_lifecycle_rpcs.down.sql](../../db/proposals/011_task_lifecycle_rpcs.down.sql),
then redeploy the previous frontend build. (Down restores policies, not the
double-credit trigger — intentional.)

## Step 7: Monitor
15 min: Supabase logs for RPC errors (`submit_proof` etc.), credit balances for
double-credits, toast errors in the app.

## Success Criteria
- 5 RPCs live, SECURITY DEFINER, `authenticated`-only EXECUTE
- Assignee-side broad UPDATE policies gone; creator edit policy intact
- Core loop passes end-to-end; credits land exactly once per approval

**END OF RUNBOOK (DRAFT)**
