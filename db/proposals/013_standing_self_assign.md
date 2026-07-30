# Proposal 013: close the standing self-assign hole

**Status**: 🟢 **APPROVED 2026-07-29 by Michael ("yes 013 go") — NOT YET APPLIED.** Open points A–E
decided below. The client half has shipped; the SQL still needs the backup-then-apply run in
`docs/runbooks/PROD_RUNBOOK_013.md`, which is a Michael action because this session had no
production DB credentials.
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

## Open points — DECIDED 2026-07-29

Michael's answer was "yes 013 go, everything else as well", i.e. every recommendation below is
accepted as written. Recorded per point so the reasoning is not lost:

| # | Decision |
|---|---|
| A | **Accepted as drafted** — all three functions. Layer 3 is the guarantee, layers 1–2 stop the app promising credits it will not pay. |
| B | **Accepted** — friendship check on `assigned_to` stays out of scope; it is a separate proposal. |
| C | **Accepted** — no clawback. Standing stays monotonic. Moot in practice: the test data is being wiped (see `docs/runbooks/PROD_RUNBOOK_WIPE_TEST_DATA.md`). |
| D | **Accepted** — colluding accounts remain out of reach, named not fixed. |
| E | **Answered from the code — see below.** No client path in the current tree can create one, so nothing needs finding before the apply. |

### E, answered

The question was which path created the live self-assigned contract (`tesatmynutes`), because
layers 1–2 will start rejecting whatever it was. Every candidate was checked and none of them can
do it **today**:

- `TaskForm.tsx` populates the assignee dropdown from `useFriends` only, and `validateForm`
  requires a selection — you cannot pick yourself.
- A self-friendship row would put you in your own dropdown (`useFriends.ts:82` picks "the other
  side" of the pair, which for a self-pair is you). But both writers refuse to create one:
  `sendFriendRequest` rejects `userData.id === userId`, and `redeem_invite` returns `SELF_INVITE`
  when `v_inviter = v_me`.
- `create_task` does **not** default a null `p_assigned_to` to `auth.uid()` — it inserts the NULL.
- Onboarding step 4 is a pure explainer since R35; it creates nothing. `CreateBountyModal` writes
  rewards, not tasks. `db/seeds/seed_minimal.sql` seeds Alice→Bob, not a self-pair.

**Conclusion:** the row predates the current write path. Task creation only became
RPC-authoritative when 012 was applied on 2026-07-28; before that the client inserted into `tasks`
directly, under a policy that constrained `created_by` and said nothing about `assigned_to`. A
hand-made row from testing (the title `tesatmynutes` reads that way) fits every fact. **Nothing
blocks the apply** — and after the test-data wipe the row is gone regardless.

### Original recommendations (kept for the record)

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

## Client work — ✅ SHIPPED 2026-07-29 (not gated on the apply)

- `self_assigned_credit_reward` is mapped to a real sentence **in all twelve locales**
  (`taskForm.validation.selfAssignedCredit`), not just en + de. English:
  *"You can't pay yourself credits — standing is earned from someone else's judgement. Assign this
  to someone, or pick a custom reward."*
- New `TaskLifecycleRpcError` (`src/domain/missions.ts`) carries the machine-readable `code`
  alongside the English fallback message, so the UI can localize one rule without the domain layer
  taking an i18n dependency. `IssuedPage` re-throws it unwrapped — previously it rebuilt the error
  and threw the code away.
- `TaskForm.tsx` guard: when the assignee resolves to the current user the credit option is not
  rendered at all (not merely `disabled`, which screen readers still announce), an explanation
  replaces it, a selector already sitting on `credit` falls back to a custom reward, and
  `validateForm` refuses the combination last so it wins over "pick an amount".
- `approveMission` now returns `{ credited, creditSkippedReason }` and `IssuedPage` shows
  `contracts.approveSuccessNoCredit` when a contract completed without paying. **A pre-013 database
  omits the `credited` key, and absence is read as *paid*** — the old server always paid, so the
  opposite default would tell every user their credits had vanished before the SQL is applied.
- Six tests in `src/domain/missions.test.ts` under "013: self-assigned credit rewards", including
  the pre-013-server case above.

## Approval Checklist

- [x] Michael reviewed; open points A–E decided (2026-07-29 — all recommendations accepted, E answered above)
- [x] Client work shipped (see above); gates green: tsc 0, 205 tests/19 files, lint 0 errors, build pass
- [ ] Pre-flight validation run (#1 confirms 012 live; #5–#6 size the existing exposure;
      #8–#10 minting surface still sole-path). #7 is now informational — E is answered.
- [ ] Fresh backup taken (`scripts/prod/backup_schema.ps1`)
- [ ] Apply → post-validate (#3–#4) → browser test (normal approve + refused self-assign)

**Runbook**: `docs/runbooks/PROD_RUNBOOK_013.md` — one command, Michael runs it.

**Created**: 2026-07-29
**Author**: Claude (Opus 5), closing the hole recorded in `memory/STATE.md` Known problems
**Review Status**: 🟢 approved 2026-07-29, client shipped, SQL unapplied
