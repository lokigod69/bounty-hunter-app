# Proposal 011: Task Lifecycle RPCs

**Status**: 📝 DRAFT — awaiting Michael's review. **No SQL has been applied anywhere.**
**Priority**: P1 (last item on the v1-done definition: "task lifecycle writes moved to server RPCs")
**Estimated Time**: SQL apply ~2 min; client refactor ~2–4 h; full test pass after
**Risk Level**: 🔴 High (touches the core loop: submit → reject → archive → delete)

## Context

### Current State
`approve_task` is the only lifecycle transition done server-side (atomic, race-guarded,
credits via `increment_user_credits` in the same transaction). Everything else is a direct
client `tasks` update, duplicated across **two parallel paths** (`src/hooks/useTasks.ts`
and `src/domain/missions.ts` + `src/pages/IssuedPage.tsx`), relying on broad RLS UPDATE
policies that let **either party write any column** — an assignee could set
`status='completed'` or edit `reward_text` directly with a hand-crafted request.
CODEX_NEXT_STEPS #4.

### Change
Five new `SECURITY DEFINER` RPCs (same pattern as `approve_task` v3), one dropped legacy
trigger, two dropped RLS policies. Full SQL: [011_task_lifecycle_rpcs.up.sql](011_task_lifecycle_rpcs.up.sql).

| RPC | Who | Transition | Replaces |
|---|---|---|---|
| `submit_proof(task, url?, type?, desc?)` | assignee | pending/in_progress/rejected → review; sets proof fields, `completed_at`, clears `rejection_reason` | `useTasks.ts:581`, `missions.ts:356` + `:469` (no-proof path folded in: url/desc both optional when `proof_required=false`) |
| `reject_task(task, reason?)` | creator | review → rejected; clears proof fields + `completed_at`, records reason | `missions.ts:162-180`; **canonicalizes** the divergent `useTasks.ts:429` path that reset to `pending` |
| `set_task_status(task, status)` | assignee | pending ⇄ in_progress only (whitelist) | generic status writes `useTasks.ts:429`, `missions.ts:248` |
| `archive_task(task)` | either party | `is_archived=true`, idempotent | `missions.ts:414` |
| `delete_task(task)` | creator | row delete; returns `proof_url` for client storage cleanup | `useTasks.ts:685`, `IssuedPage.tsx:110` |

All five: `auth.uid()` asserted, row locked with `FOR UPDATE`, status precondition
checked server-side, idempotent success on repeat calls, JSON `{success, error}` returns
mapped like `approve_task`.

**Also in the up.sql:**
- `DROP TRIGGER IF EXISTS award_credits_on_completion` — legacy trigger from the schema
  snapshot that would **double-credit** alongside `approve_task`'s explicit credit call.
  Validation query #3 confirms whether it exists on live before apply.
- `DROP POLICY` on the two broad UPDATE policies (`"Update tasks"`, `"Users can update
  assigned tasks"`) — the actual security payoff. The creator-side policy
  (`"Users can update own created tasks"`) **stays** because the edit-task modal still
  writes directly (see Phase B).

### Phase B (explicitly out of scope here)
`create_task` / `update_task` RPCs. Create is already constrained by the INSERT policy
(`auth.uid() = created_by`); edit is creator-only via the remaining policy. Moving them
later lets us drop ALL client write policies on `tasks`, but they carry none of the
state-machine risk this proposal targets. Smaller follow-up proposal once 011 has soaked.

## Open points for review (decide before apply)

- **A. `proof_type` whitelist**: RPC allows `image, video, pdf, document, text`. The
  schema-snapshot CHECK (`schema.sql:461`) only allowed `image, video`; proposal 010
  widened live for PDF. Validation query #5 prints the live constraint — the RPC list and
  the constraint must agree with `src/domain/proofValidation.ts` before apply.
- **B. Reject semantics**: canonical result is `status='rejected'` + reason (assignee
  resubmits from there via `submit_proof`). The old `useTasks` path that silently reset to
  `pending` disappears. OK?
- **C. Archive gating**: current client lets either party archive at any status; RPC keeps
  that parity. Alternative: restrict to `completed/rejected` — say the word.
- **D. Policy names** in the DROP POLICY statements come from the schema snapshot;
  runbook pre-flight (validation #4) lists live names first and the runbook adjusts if
  they differ.

## Risk Analysis
- **Blast radius**: every task interaction except approve (already RPC) and create/edit
  (Phase B). Old frontend builds break the moment the policies drop — ordering below.
- **Data loss**: none. No table/column changes. `delete_task` deletes exactly what the
  client already could.
- **Existing reads/writes**: reads untouched. Client writes replaced by RPC calls in the
  same commits that ship this (client refactor lands BEFORE policies drop).
- **Rollback**: [011_task_lifecycle_rpcs.down.sql](011_task_lifecycle_rpcs.down.sql) drops
  the five functions and recreates both policies (old frontend fully functional again).
  The down does **not** resurrect the double-credit trigger — intentional.

## Deploy ordering & graceful degradation
1. Apply up.sql (functions + trigger drop are invisible to the running frontend; the
   policy drops are NOT — so steps 1 and 2 ship in one maintenance window, or split the
   policy drops into a second apply after the frontend deploy).
2. Deploy frontend build that calls the RPCs (client refactor: `useTasks.ts`,
   `domain/missions.ts`, `IssuedPage.tsx`; then `supabase gen types --project-id
   mvbmpcmexkgfairnthux` regen).
3. Validate (queries #1–#4) + manual core-loop test: create → start → submit (file, text,
   none) → reject → resubmit → approve → archive → delete.

## SQL DOWN (rollback)
See [011_task_lifecycle_rpcs.down.sql](011_task_lifecycle_rpcs.down.sql).

## Approval Checklist
- [ ] Michael reviewed the five RPC bodies (esp. status preconditions)
- [ ] Open points A–D decided
- [ ] Validation #3 (trigger) and #4 (policy names) run against live, results recorded
- [ ] Fresh backup taken (`scripts/prod/backup_schema.ps1`)
- [ ] Explicit go given for apply (Iron Rule: never without it)

**Created**: 2026-07-10
**Author**: Claude (Fable), from the task-lifecycle write map (session 2026-07-10)
**Review Status**: ⏳ awaiting Michael
