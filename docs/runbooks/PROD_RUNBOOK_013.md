# PROD Runbook 013 — Close the standing self-assign hole

Stop `approve_task` minting credits when the assignee is the creator; refuse the
combination at create/edit time so the app never promises what it will not pay.

**Date**: DRAFTED 2026-07-29 — **APPROVED by Michael, NOT YET APPLIED**
**Priority**: P2 | **Risk**: 🟢 Low | **Downtime**: none | **Deploy ordering**: none

## Why Michael runs this and not Claude

The 2026-07-29 session had no production DB credentials — the password lives only in a
chat transcript, nothing in the repo stores it, and the session's attempts to reach the
Supabase CLI were blocked. The client half of 013 is already shipped and pushed; this
runbook is the remaining half.

## What This Does

Applies [db/proposals/013_standing_self_assign.up.sql](../../db/proposals/013_standing_self_assign.up.sql) —
three function-body swaps in one transaction:

| Function | Change |
|---|---|
| `create_task` | refuses `reward_type='credit'` with `assigned_to = auth.uid()` |
| `update_task` | same rule, on the **post-patch** assignee and reward type |
| `approve_task` → V4 | never calls `increment_user_credits` when `assigned_to = created_by`; the task still completes, and the response gains `credited` + `credit_skipped_reason` |

**No signature, return-type, policy, or schema changes** — so no `supabase gen types`
regen, no forced client redeploy, and no deploy-ordering window. Unlike 011 and 012 the
SQL can go before or after a client deploy.

## Prerequisites

- [x] Proposal 013 approved; open points A–E decided (2026-07-29 — see the proposal)
- [x] Client half shipped and pushed (commit `d223535`): the refusal is a real sentence in
      all twelve locales, TaskForm hides the credit option when the assignee is you, and
      approval reports a skipped payout instead of implying one happened
- [x] Open point E answered from the code — no current path can create a self-assigned
      contract, so nothing needs finding before the apply
- [ ] Fresh schema backup taken in this session
- [ ] `$env:PROD_CONFIRM = "YES"` set in the shell

Target: session pooler `aws-1-ap-south-1.pooler.supabase.com:5432`, user
`postgres.mvbmpcmexkgfairnthux`. All 013 scripts default to it.

## The whole sequence (PowerShell, repo root)

```powershell
$env:PROD_CONFIRM = "YES"
scripts\prod\validate_013.ps1     # Step 1: pre-flight (read-only; prompts for the DB password)
scripts\prod\backup_schema.ps1    # Step 2: backup — refuses to lie about a dump that did not happen
scripts\prod\apply_013_up.ps1     # Step 3: apply (single transaction, ON_ERROR_STOP)
scripts\prod\validate_013.ps1     # Step 4: post-validate
```

## Step 1: Pre-flight (read-only)

Runs [db/proposals/013_validation.sql](../../db/proposals/013_validation.sql). Check:

- **#1** — confirms 012 is live. If `create_task`/`update_task` are missing, stop: this
  proposal patches their bodies and has nothing to patch.
- **#2** — records the current function body hashes, so "the rollback restored them
  verbatim" can be checked afterwards instead of trusted.
- **#5 / #6** — size the already-minted self-standing. Per open point C the decision is
  **no clawback**; these are for the record. If the wipe runbook has already run, expect
  zero rows.
- **#7** — lists existing self-assigned rows. Informational now that E is answered.
- **#8–#10** — confirm `approve_task` is still the only path from a client to
  `increment_user_credits`. If a new caller has appeared, this proposal is no longer
  sufficient on its own — stop and re-scope.

## Step 2: Backup

`scripts\prod\backup_schema.ps1` writes `supabase\schema_backup_<timestamp>.sql` and
throws unless pg_dump exited clean **and** the file exists **and** it is over 50 KB. A
backup that did not happen is worse than no backup, because it authorises an apply.

## Step 3: Apply

`scripts\prod\apply_013_up.ps1`. Expect `BEGIN` … 3× `CREATE OR REPLACE FUNCTION` with
their `REVOKE`/`GRANT`/`COMMENT` … `COMMIT`. `ON_ERROR_STOP=1`, so any error aborts the
whole transaction and nothing is partially applied. The script checks `$LASTEXITCODE`
before claiming success.

## Step 4: Post-validate

Re-run `validate_013.ps1` and check:

- **#3** — the guards are present in the shipped bodies (`self_assigned_credit_reward`
  in create/update; the `assigned_to <> created_by` condition in approve).
- **#4** — grants intact: `authenticated` can still execute all three.

## Step 5: Browser test (the part only you can do)

1. **Regression, and the more important half** — create a normal credit contract for a
   friend, have them complete it, approve it. Credits must land exactly as before, and
   the payout ceremony must fire. If this breaks, roll back.
2. **The new rule** — try to create a credit contract assigned to yourself. In normal use
   the credit option is not even offered, so to reach the server rule you would need a
   self-assigned row that already exists. Either way the message must be the readable
   sentence, not `self_assigned_credit_reward`.
3. **A pre-existing self-assigned contract, if one survives the wipe** — approving it must
   complete the contract, pay nothing, leave `total_earned` unchanged, and say
   *"Approved and completed — no credits paid on a self-assigned contract."*

## Rollback

```powershell
scripts\prod\rollback_013.ps1
```

Restores the 012 function bodies and `approve_task` V3 verbatim. Compare against the
hashes recorded by validation query #2 to confirm "verbatim" is literally true. Nothing
in the client breaks on rollback: `approveMission` treats a missing `credited` key as
*paid*, which is exactly the V3 behaviour.

## Evidence this works before it touches production

The proposal was proven against a throwaway local Postgres on 2026-07-29 with the schema
stubbed: 20/20 assertions passed, including a pre-existing self-assigned credit row
completing with `credited=false` and `total_earned` unchanged while a real contract still
paid its hunter 25. Rollback and re-apply were both verified in the same run.
