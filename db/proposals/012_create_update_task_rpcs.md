# Proposal 012: create_task / update_task RPCs (Phase B)

**Status**: 🟡 DRAFT — awaiting Michael's review + go (production SQL rule applies: backup first, explicit go)
**Priority**: P2 (011 closed the state-machine risk; this closes the last direct client writes on `tasks`)
**Estimated Time**: SQL apply ~1 min; client refactor ~1–2 h; full test pass after
**Risk Level**: 🟠 Medium (touches create + edit paths; no state-machine transitions involved)

## Context

### Current State
Since 011 (applied 2026-07-10), every task lifecycle transition is server-side. Two
deliberate exceptions remained ("Phase B" in 011): **create** (direct INSERT via the
`"Create tasks"` policy) and **creator edit** (direct UPDATE via `"Users can update own
created tasks"`). Both policies are row-scoped but not column-scoped — a creator can
hand-craft an UPDATE that sets `status='completed'`, `completed_at`, `approved_at`, or
proof fields on their own task, bypassing the entire RPC state machine (e.g. self-approve
prep, forging proof state). The INSERT policy similarly allows arbitrary initial `status`.
The `"Users can delete own tasks"` DELETE policy is dead weight since `delete_task`
shipped — but still usable directly.

Write sites today (the only four, verified by grep):
| Site | Operation |
|---|---|
| `useTasks.ts:318` (createTask) | INSERT title/description/reward_type/reward_text/created_by/assigned_to/deadline/status/proof_required/is_daily |
| `IssuedPage.tsx:375` (handleSubmitContract, create branch) | INSERT (spread of TaskForm data + created_by + status) |
| `useTasks.ts:231` (updateTask) | partial UPDATE of title/description/reward_type/reward_text/assigned_to/deadline/proof_required |
| `IssuedPage.tsx:352` (handleSubmitContract, edit branch) | full-form UPDATE incl. is_daily |

### Change
Two new `SECURITY DEFINER` RPCs (same pattern as 011), three dropped RLS policies.
Full SQL: [012_create_update_task_rpcs.up.sql](012_create_update_task_rpcs.up.sql).

| RPC | Who | Does | Replaces |
|---|---|---|---|
| `create_task(title, desc?, assignee?, deadline?, reward_type?, reward_text?, proof_required?, is_daily?)` | any authenticated user | INSERT with server-set `created_by = auth.uid()`, `status = 'pending'`; returns `{success, task_id}` | `useTasks.ts:318`, `IssuedPage.tsx:375` |
| `update_task(task_id, patch jsonb)` | creator | whitelisted-key jsonb patch (title, description, assigned_to, deadline, reward_type, reward_text, proof_required, is_daily); unknown key → `invalid_field`; row locked `FOR UPDATE` | `useTasks.ts:231`, `IssuedPage.tsx:352` |

The jsonb-patch shape for `update_task` preserves both call sites' exact semantics
(useTasks sends only changed fields; IssuedPage sends the full form) and makes the
column whitelist the security boundary: lifecycle columns are unreachable by
construction. Table CHECKs (`reward_type`, the 011-normalized `proof_type`) stay
authoritative.

**Policies dropped** (section 3 of up.sql): `"Create tasks"` (INSERT),
`"Users can update own created tasks"` (UPDATE), `"Users can delete own tasks"`
(DELETE). After apply, `tasks` has zero client write policies — remaining:
`"View tasks"` + `"Users can view assigned tasks"` (SELECT) and `"Admins full access"`.

## Open points (recommendations inline — decide or delegate, as with 011 B–D)

- **A. Edit gating by status — recommended: keep parity (no restriction).** Today the
  creator can edit any own task in any status; the RPC keeps that. Restricting edits
  (e.g. not while `review`) would change shipped UX and adds no column-level security
  (the whitelist already blocks lifecycle fields). Can be tightened later inside the
  function without policy churn.
- **B. Drop the DELETE policy — recommended: yes (in the up.sql).** The client has used
  `delete_task` since 011; the policy only serves hand-crafted direct deletes. Rollback
  recreates it.
- **C. No friendship check on `assigned_to` — recommended: keep parity.** The current
  INSERT policy doesn't require assignee friendship (unlike `rewards_store`), and the
  UI only offers friends. Server-side friendship enforcement would be new product
  behavior — out of scope here, note for later if wanted.

## Risk Analysis
- **Blast radius**: create-mission and edit-mission flows only. Lifecycle paths (011
  RPCs), reads, and realtime are untouched.
- **Data loss**: none. No table/column changes.
- **Old frontend builds** break on create/edit the moment the policies drop → same
  one-window ordering as 011 (client refactor is committed BEFORE apply; deploy follows
  apply immediately).
- **Rollback**: [012_create_update_task_rpcs.down.sql](012_create_update_task_rpcs.down.sql)
  drops both functions and recreates all three policies verbatim → old frontend fully
  functional again.

## Deploy ordering (same runbook shape as 011)
1. Pre-flight: `scripts/prod/validate_012.ps1` (queries #1–#5; #3 confirms live policy
   names, #4 confirms the 8 columns exist on live, #5 confirms the 011 RPCs are live).
2. Backup: `scripts/prod/backup_schema.ps1`.
3. Apply: `scripts/prod/apply_012_up.ps1` (single transaction).
4. `git push` the client refactor commit → Vercel deploy.
5. Post-validate (#1–#3) + `supabase gen types --project-id mvbmpcmexkgfairnthux` regen
   of `database.ts`, then manual create + edit test in the browser.

## Client refactor (ships with this proposal, committed LOCALLY until apply)
- `useTasks.ts` createTask → `rpc('create_task', …)`, then re-select the row with
  profile joins by returned `task_id` (SELECT policies unchanged).
- `useTasks.ts` updateTask → `rpc('update_task', {p_task_id, p_patch})`, then re-select.
- `IssuedPage.tsx` handleSubmitContract → both branches to the RPCs.
- RPC arg types come from the `database.ts` regen post-apply; until then a temporary
  typed overlay (same trick as 011) or `as never` casts at the 4 call sites.

## Approval Checklist
- [ ] Michael reviewed; open points A–C decided (or delegated)
- [ ] Pre-flight validation run (#3 policy names, #4 columns, #5 011-RPCs present)
- [ ] Fresh backup taken (`scripts/prod/backup_schema.ps1`)
- [ ] Go given → apply → push → post-validate → types regen → browser create/edit test

**Created**: 2026-07-15
**Author**: Claude (Fable), from the Phase-B scope reserved in proposal 011
**Review Status**: 🟡 draft, unapplied
