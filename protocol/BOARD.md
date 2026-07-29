# BOARD — Bounty Hunter — updated 2026-07-29

## ⚠️ WAITING ON YOU
- **Three decisions, all with recommendations** (detail in `protocol/NEXT_STEP.md`):
  1. **Proposal 013 go/no-go** — `db/proposals/013_standing_self_assign.md`, open points A–E. Closes the standing self-assign hole; already proven against a throwaway local Postgres (20/20 assertions, rollback + re-apply verified). Low risk: three function-body swaps, no signatures/policies/schema, no types regen, no deploy-ordering window. **Answer E first** — a self-assigned contract exists on live even though the assignee dropdown only offers friends.
  2. **Rank ladder recalibration** — thresholds assume ~20 credits/contract; the form offers 1/2/3/5/10, so bands 3–4 are unreachable. Recommend 0/30/150/600/2000. Retroactively promotes your current rank, so it is your call.
  3. **German formal "Sie" → informal "du"** — the ten new locales use informal; German is the odd one out. ~410 strings, so not done silently.
- **Browser-test one create + one edit mission** — the last unverified piece of the 012 path (needs a real `auth.uid()`).
- **Eyeball the five design fixes** from your walkthrough (scrim opacity, centred reward when there is no description, equal-height panels, German header, Mode picker gone).
- **Two-user lifecycle test on prod**: submit PHOTO proof → view proof BOTH sides → reject → resubmit → approve (credits once) → archive → delete.
- **Paste the branded email templates** — Dashboard → Authentication → Emails → **Templates tab**: "Confirm signup" ← `supabase/templates/confirm-signup.html`, "Magic Link" ← `supabase/templates/magic-link.html`.
- **Check the realtime publication** (Dashboard → Database → Publications → `supabase_realtime`): `friendships` in it; add `tasks` too.
- **Phase 5 Mac leg**: `docs/runbooks/IOS_SHIP_RUNBOOK.md` end-to-end (Xcode signing → device smoke → TestFlight).
- Sound audition; taste-call on refreshing the remaining empty-state art (chest/pedestal/horn).
- ~~Rotate the DB password~~ **CANCELLED 2026-07-29 by your decision** — risk accepted and recorded in `memory/STATE.md`.

## Workstreams
| Workstream | Phase/Gate | Last done | Next | State |
|---|---|---|---|---|
| main | Walkthrough feedback shipped; 013 drafted + locally proven; i18n rearchitected for 12 locales | Jul 29: 5 design fixes (7831ff9), proposal 013 DRAFT + 20/20 local assertions (24a7613), lazy-locale i18n (9620413), **12 locales live + verified (565e565)**; tsc 0 / 198 tests / lint 0 errors / build pass + warning-free | Your 3 decisions above. Then the **mobile pass** (Codex audit: 1 BLOCKER + ~10 MAJOR), then the ~150-string i18n extraction, then a second translation pass | 🟢 active |

## Standing decisions parked for you (not blocking yet)
- **Proposal 013 open points A–E** — recommendations in the proposal doc; decide or delegate like 011 B–D and 012 A–C.
- Prod SQL go/no-go whenever a runbook comes up — backup + your review required, always.
- Residual taste-call: refresh the other empty-state art too, or keep.
- ~~Proposal 012 open points A–C~~ RESOLVED — 012 applied 2026-07-28.
- ~~Noun system~~ DECIDED 2026-07-07: Mission/Chore/Request; store items = Rewards; "Bounty" = mission credit pot.
- ~~Proof types~~ DECIDED 2026-07-07: PDF/text/private all allowed.

## Recently finished (last 5)
- 2026-07-29 **Proposal 013 drafted + proven locally**: self-assign standing hole closed in `approve_task` (the sole path to `increment_user_credits`) plus `create_task`/`update_task`; verified on a throwaway Postgres cluster — 20/20 assertions, rollback and re-apply both confirmed. UNAPPLIED, awaiting your go.
- 2026-07-29 **Five design fixes from the browser walkthrough**: one scrim token replacing five hard-coded backdrops; mission-modal empty-column root cause (a JSX children array is always truthy); equal-height panels; width-robust German header; single-option Mode selectors hidden.
- 2026-07-29 **Twelve locales live + verified**: es/pt/it/fr/ro + nl/pl/sv/da/cs via two Codex waves; 417/417 key parity each, no BOM/U+FFFD, 96-99% of leaves differ from English with zero long strings copied, rank words <=13 chars. Main bundle 392 kB with all twelve.
- 2026-07-29 **i18n rearchitected for 12 languages**: lazy locale chunks (main bundle −17 kB), filesystem-derived picker, detector dropped, 17 gate tests that immediately caught a duplicate key in en+de and a de orphan.
- 2026-07-29 **Two Codex audits collected**: adversarial mobile (1 BLOCKER + ~10 MAJOR) and hard-coded strings (~150 + 13 formatters + 5 pluralisations). Both queued as the next build items.
- 2026-07-28 **Proposal 012 APPLIED to production**; every `scripts/prod/` script fixed to stop reporting success for failed commands (a failed run had printed "Migration applied successfully").
