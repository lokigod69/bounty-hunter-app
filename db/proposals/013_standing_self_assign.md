# Proposal 013: close the standing self-assign hole

**Status**: 🟡 DRAFT — awaiting Michael's review + go (production SQL rule applies: backup first, explicit go)
**Priority**: P2 (no data at risk today; blocks any cross-household standing ladder)
**Estimated Time**: SQL apply ~1 min; client work ~30 min (one error string + one guard); test pass after
**Risk Level**: 🟢 Low (three function-body swaps, no signatures, no policies, no schema changes)

## Context

### Current State

`docs/design-v2/THE_REGISTER.md:93` states the premise the whole Standing feature rests on:

> Standing cannot be bought (the store only spends `balance`), cannot be self-awarded (approval
> requires `created_by = auth.uid()` and pays `assigned_to`), and cannot be lost.

The middle clause is false. Those two conditions are not in tension when **one person is both**.
A user who creates a contract assigned to themselves is the creator (so `approve_task`'s
`created_by = auth.uid()` check passes) and the assignee (so `increment_user_credits` pays them).
They can mint unlimited `total_earned`, and `total_earned` is the sole input to Standing
(`src/core/credits/standing.domain.ts:37`) — so unlimited rank, sigil, and creed lines.

This was recorded as a known-open decision, not a discovery:

> Standing self-assign hole remains OPEN by recorded decision: task creation never checks the
> assignee relationship, so self-created self-assigned tasks can mint `total_earned` (and thus
> Wave 2 rank). Fine for one trusted household; must close server-side before any cross-household
> ladder. — `memory/STATE.md`, Known problems

Why it is worth closing now rather than at ladder time: Wave 2 shipped the rank word, sigil, and
the RankUpCeremony (208687a, 80a7d77). The feature is now visible, so the number behind it is now
worth something to a user — including to a user who is only competing with their partner.

**The minting surface is exactly one function.** `increment_user_credits` is `service_role`-only
(`20260412100100_lock_down_increment_user_credits.sql`), the legacy `award_credits_on_completion`
trigger was dropped by 011, and `set_task_status` only permits `pending <-> in_progress`. So
`approve_task` is the only path from a client to `total_earned`. That is what makes this fix small.

### Change

Three function-body swaps. No signature, return-type, policy, or schema changes — therefore **no
`database.ts` regen and no forced client redeploy**.
Full SQL: [013_standing_self_assign.up.sql](013_standing_self_assign.up.sql).

| # | Function | Change | Layer |
|---|---|---|---|
| 1 | `create_task` | reject when `reward_type = 'credit'` AND `assigned_to = auth.uid()` → `{success:false, error:'self_assigned_credit_reward'}` | product |
| 2 | `update_task` | same rule, evaluated on the **effective post-patch** assignee + reward type | product |
| 3 | `approve_task` → **V4** | never call `increment_user_credits` when `assigned_to = created_by`; task still completes; response gains `credited` + `credit_skipped_reason` | **security** |

**Layers 1 and 2 are UX, not security.** They exist so a user never creates a promise the system
will refuse to keep. **Layer 3 is the guarantee** — it is the only one that touches the minting
function, and it holds for rows created before this proposal, rows created by a future code path
nobody remembered to guard, and hand-crafted RPC calls alike.

Why layer 3 completes the task instead of refusing it: refusing would strand every self-assigned
contract in `review` forever with no client affordance to clear it. A silent non-payment is
recoverable; an unclosable contract is a support ticket. The additive response keys let the client
say so out loud (see Client work).

**Self-assigned contracts keep working** for non-credit rewards and no-reward contracts — the
personal-todo use case is untouched. Only the credit path is closed.

## Open points (recommendations inline — decide or delegate, as with 011 B–D / 012 A–C)

- **A. Where the rule lives — recommended: all three functions, as drafted.** Layer 3 alone is
  sufficient for security and is the smaller diff. Layers 1–2 are recommended anyway because
  without them the app cheerfully accepts a 50-credit self-assigned contract and pays 0 on
  approval, which reads as a bug to the user. If you want the minimum diff, drop sections 1–2 and
  keep 3 — the guarantee is unchanged.
- **B. Friendship check on `assigned_to` — recommended: still out of scope (unchanged from 012 open
  point C).** The real generalisation of this hole is "assignee must be an accepted friend", which
  would also close assigning contracts to strangers. It is new product behaviour, it can break
  onboarding-created rows, and it needs its own proposal. 013 deliberately fixes only the
  self-assign case, which needs no relationship data to detect.
- **C. Reconciling already-minted standing — recommended: no clawback, just look.** Validation
  query #5 reports every existing self-minted contract and its credit total per user; query #6 puts
  that next to current `total_earned` and band. If the numbers are trivial (expected — this is a
  test DB that was wiped 2026-07-08), do nothing. Adjusting `total_earned` downward would be the
  first ever write that makes standing non-monotonic, which contradicts §3.1 ("can never be spent
  down") — if you want it, it should be a separate, explicitly-reasoned proposal.
- **D. Colluding accounts remain out of reach — no fix proposed.** Two accounts controlled by one
  person can issue each other contracts and inflate both standings without ever self-assigning.
  No server-side rule distinguishes that from a real household. The mitigations are velocity caps
  or per-pair limits; both are cross-household-ladder concerns, and both are premature now. Naming
  it so it is not mistaken for closed.
- **E. Pre-flight question worth answering before apply.** `TaskForm.tsx:283` populates the
  assignee dropdown from **friends only**, so the UI should not be able to self-assign — yet a live
  self-assigned contract exists (Michael's `tesatmynutes`, creator and assignee both `laqy69`).
  Either a self-friendship row exists, or `CreateBountyModal.tsx` / an onboarding path writes one.
  Validation query #7 lists every such row; if it returns anything with `reward_type='credit'`,
  find the path that created it before applying, because layers 1–2 will start rejecting it.

## Risk Analysis

- **Blast radius**: create, creator-edit, and approve. Reads, realtime, storage, rewards, and the
  other 011 lifecycle RPCs are untouched.
- **Data loss**: none. No table, column, constraint, or policy is modified.
- **Behaviour change visible to users**: (a) creating/editing a self-assigned **credit** contract
  now fails — needs the client string below, or it surfaces as a raw error; (b) approving a
  pre-existing self-assigned credit contract now pays 0 instead of paying the creator.
- **Old frontend builds**: keep working. Unlike 011/012 there is no policy drop, so there is no
  deploy-ordering window — the SQL can be applied before or after the client change. Worst case on
  an un-updated client is an ugly error message on an action that should not have been offered.
- **Rollback**: [013_standing_self_assign.down.sql](013_standing_self_assign.down.sql) restores the
  012 bodies and the V3 `approve_task` verbatim. Validation query #2 records the live body hashes
  pre-apply so "verbatim" can actually be checked rather than trusted.

## Deploy ordering

Simpler than 011/012 — no ordering constraint.

1. Pre-flight: `scripts/prod/validate_013.ps1` (queries #1–#2 and #5–#10; **#1 confirms 012 is
   applied**, #7 answers open point E, #8–#10 confirm the minting surface is still just
   `approve_task`).
2. Backup: `scripts/prod/backup_schema.ps1`.
3. Apply: `scripts/prod/apply_013_up.ps1` (single transaction).
4. Post-validate: queries #3–#4 (guards present in the shipped bodies, grants intact).
5. Browser test: create a normal contract for a friend → approve → credits land (regression); then
   the self-assigned credit attempt → refused with a readable message.

No `supabase gen types` regen — no signature changed.

## Client work (ships alongside, not gated on the apply)

- Map `self_assigned_credit_reward` to a real sentence in `en` + `de` (and the new locales) rather
  than letting the raw code reach a toast. Suggested English: *"You can't pay yourself credits —
  standing is earned from someone else's judgement. Assign this to someone, or pick a custom
  reward."*
- Optional guard in `TaskForm.tsx`: if the assignee resolves to the current user, disable the
  credit reward-type option. Cheap, and makes the server error unreachable in normal use.
- Domain test in `src/core/` asserting the envelope shape, matching the existing
  task-lifecycle RPC envelope tests.

## Approval Checklist

- [ ] Michael reviewed; open points A–E decided (or delegated)
- [ ] Pre-flight validation run (#1 confirms 012 live; #7 answers open point E; #5–#6 sized the
      existing exposure; #8–#10 minting surface still sole-path)
- [ ] Fresh backup taken (`scripts/prod/backup_schema.ps1`)
- [ ] Go given → apply → post-validate (#3–#4) → browser test (normal approve + refused self-assign)

**Created**: 2026-07-29
**Author**: Claude (Opus 5), closing the hole recorded in `memory/STATE.md` Known problems
**Review Status**: 🟡 draft, unapplied
