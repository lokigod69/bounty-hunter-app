# PROD Runbook 011 — Task Lifecycle RPCs
Move submit/reject/status/archive/delete task transitions to server RPCs; normalize the proof_type CHECK; tighten tasks RLS

**Date**: APPLIED 2026-07-10 (Michael ran the sequence live; see LOG for verification detail)
**Priority**: P1 | **Risk**: 🔴 High | **Downtime**: none if steps 3–4 ship back-to-back

## What This Does
Applies [db/proposals/011_task_lifecycle_rpcs.up.sql](../../db/proposals/011_task_lifecycle_rpcs.up.sql):
five SECURITY DEFINER RPCs (`submit_proof`, `reject_task`, `set_task_status`,
`archive_task`, `delete_task`), drops the legacy `award_credits_on_completion` trigger
(double-credit hazard), **normalizes `tasks_proof_type_check` to
`image/video/document/text`** (snapshots still show the original `image/video` — text and
PDF proofs likely violate the live CHECK today), and drops the two broad assignee-side
UPDATE policies on `tasks`.

## Prerequisites
- [x] Proposal 011 approved by Michael (2026-07-10; all four open points decided)
- [ ] Frontend build that calls the RPCs is ready to deploy (client refactor committed — check `git log`)
- [ ] Fresh schema backup taken in this session
- [ ] `$env:PROD_CONFIRM = "YES"` set in the shell
- Target: session pooler `aws-1-ap-south-1.pooler.supabase.com:5432`,
  user `postgres.mvbmpcmexkgfairnthux` (current live project — all 011 scripts default to it)

## The whole sequence (PowerShell, repo root)
```powershell
$env:PROD_CONFIRM = "YES"
scripts\prod\validate_011.ps1     # Step 1: pre-flight (read-only; prompts for DB password)
scripts\prod\backup_schema.ps1    # Step 2: backup
scripts\prod\apply_011_up.ps1     # Step 3: apply
git push                          # Step 4: push the RPC frontend build -> Vercel deploy
scripts\prod\validate_011.ps1     # Step 5: post-validate
```

## Step 1: Pre-flight (read-only)
`scripts\prod\validate_011.ps1` runs all queries in
[db/proposals/011_validation.sql](../../db/proposals/011_validation.sql). Check:
- **#3**: does `award_credits_on_completion` appear? (If yes, the DROP TRIGGER is load-bearing.)
- **#4**: do the live UPDATE policy names match `"Update tasks"` / `"Users can update
  assigned tasks"`? If they differ, edit the two DROP POLICY lines in the up.sql first —
  `IF EXISTS` would silently no-op on a wrong name and leave the security hole open.
- **#5**: record the current `tasks_proof_type_check` definition.
- **#5b**: MUST return zero rows (any row shown would make the new CHECK fail at apply).

## Step 2: Backup
`scripts\prod\backup_schema.ps1` — verify the dump file exists and is non-trivial in size
(written to `supabase\schema_backup_<timestamp>.sql`).

## Step 3: Apply
`scripts\prod\apply_011_up.ps1` — expect `BEGIN` … `DROP TRIGGER` … 2× `ALTER TABLE`
(constraint) … 5× `CREATE FUNCTION` + `REVOKE`/`GRANT`/`COMMENT` … 2× `DROP POLICY` …
`COMMIT`. Runs with `ON_ERROR_STOP` — any error aborts the whole transaction (nothing
partially applied).

## Step 4: Deploy frontend
`git push` — the RPC-calling client refactor is committed locally but deliberately NOT
pushed until the SQL is in (the RPC build breaks against a DB without the functions;
the old build breaks once the policies drop — the window between step 3 and the Vercel
build finishing should be minutes).

## Step 5: Validate
`scripts\prod\validate_011.ps1` again. Check:
- **#1**: 5 rows, `security_definer = t`, config contains `search_path=public`.
- **#2**: `authenticated = t` for all five. `anon` also shows `t` — this is Supabase's platform default (new `public`-schema functions auto-grant EXECUTE to `anon`/`authenticated`/`service_role`; `REVOKE ALL FROM PUBLIC` doesn't undo it), confirmed identical on `approve_task`/`purchase_reward`/`mark_reward_redeemed`. Harmless: every RPC checks `auth.uid()` first and returns `{success:false, error:'not_authenticated'}` for anon callers.
- **#4**: both assignee-side UPDATE policies GONE; creator-side
  `"Users can update own created tasks"` (+ INSERT/SELECT/DELETE policies) remain.
- **#5**: constraint now `image/video/document/text`.

Then manual core loop as two users: create → start → submit proof (file / text /
no-proof) → reject with reason → resubmit → approve (credits land exactly once) →
archive → delete.

## Step 6: Rollback (if needed)
`scripts\prod\rollback_011.ps1` → runs
[011_task_lifecycle_rpcs.down.sql](../../db/proposals/011_task_lifecycle_rpcs.down.sql),
then redeploy the previous frontend build (Vercel → Deployments → previous → Redeploy).
Down restores the two policies; it does NOT restore the double-credit trigger, and does
NOT re-narrow the proof_type CHECK (the old frontend writes 'document'/'text' too) —
both intentional.

## Step 7: Monitor
15 min: Supabase logs for RPC errors (`submit_proof` etc.), credit balances for
double-credits, toast errors in the app.

## Success Criteria
- 5 RPCs live, SECURITY DEFINER, `authenticated`-only EXECUTE
- `tasks_proof_type_check` = `image/video/document/text` (NULL allowed)
- Assignee-side broad UPDATE policies gone; creator edit policy intact
- Core loop passes end-to-end; credits land exactly once per approval

**END OF RUNBOOK**
