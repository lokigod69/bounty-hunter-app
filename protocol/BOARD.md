# BOARD — Bounty Hunter — updated 2026-07-29 (second session)

## ⚠️ WAITING ON YOU
- **Run the two prod runbooks — I cannot.** No production DB access from this agent: the password
  is not in the environment or the repo, and both routes to it were blocked. Both are one command
  each, with their gates already proven to block.
  1. `docs/runbooks/PROD_RUNBOOK_WIPE_TEST_DATA.md` — **pick a scope first.** A (default) clears app
     data, keeps accounts. B also deletes accounts and is one-way. Run this before 013.
  2. `docs/runbooks/PROD_RUNBOOK_013.md` — the SQL half of the approved proposal 013.
- **Mobile check on a real phone, landscape included** — the one thing this session could not
  verify. Hamburger in landscape; modal submit reachable with the keyboard up; no zoom on input
  focus; German Friends tab bar reaches its first tab.
- **Try onboarding in another language** (Profile → restart onboarding). It was entirely
  hard-coded English until today.
- ~~Three decisions~~ **ALL ANSWERED AND SHIPPED 2026-07-29:** 013 approved (client half shipped,
  SQL pending), rank ladder → 0/30/150/600/2000, German → informal "du".
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
| main | All three decisions shipped; mobile BLOCKER closed; onboarding i18n'd in 12 languages; everything pushed | Jul 29 (2nd): rank ladder + 013 client half (d223535), German informal (d1d243b), mobile BLOCKER + 6 MAJORs (eed7cc0), prod runbooks (2412cb0), onboarding extracted + translated ×12 (d5dedb8); tsc 0 / **240 tests, 20 files** / lint 0 errors / build pass + warning-free | Your two prod runs (wipe, then 013) and a real-device mobile check. Then finish the extraction (EmojiPicker, FriendCard, reward modals, `themes.ts`, RPC errors), the 13 formatters + 5 pluralisations, and the 3 remaining mobile MAJORs | 🟢 active |

## Standing decisions parked for you (not blocking yet)
- ~~**Proposal 013 open points A–E**~~ **ALL DECIDED 2026-07-29** — every recommendation accepted; E answered from the code.
- Prod SQL go/no-go whenever a runbook comes up — backup + your review required, always. **Note as of 2026-07-29: the agent has no DB credentials, so you also have to be the one who runs it.**
- Residual taste-call: refresh the other empty-state art too, or keep.
- ~~Proposal 012 open points A–C~~ RESOLVED — 012 applied 2026-07-28.
- ~~Noun system~~ DECIDED 2026-07-07: Mission/Chore/Request; store items = Rewards; "Bounty" = mission credit pot.
- ~~Proof types~~ DECIDED 2026-07-07: PDF/text/private all allowed.

## Recently finished (last 5)
- 2026-07-29 (2nd) **All three parked decisions shipped**: rank ladder → 0/30/150/600/2000 (bands were unreachable at the rate the form actually offers); 013 approved with its client half shipped and open point E answered from the code; German switched to informal "du" — 29 strings, not the ~410 estimated.
- 2026-07-29 (2nd) **Mobile BLOCKER + six MAJORs closed**: landscape phones were taking the desktop header because `md:` is width-only; new `nav` screen asks about height too. Plus `dvh` + a visual-viewport clamp for the iOS keyboard, coarse-pointer input sizing, additive `.safe-top`, single page gutter, one-column reward grid, reachable first tab. 9 guards, each probed against the pre-fix shape.
- 2026-07-29 (2nd) **Onboarding extracted and translated into all twelve locales** (51 keys × 12) — the largest block of hard-coded English and the first thing a new user sees.
- 2026-07-29 (2nd) **Prod runbooks written and gated for 013 and the test-data wipe**, including the data-backup script that did not exist (the old one is schema-only). Not run — no DB access.
- 2026-07-29 **Proposal 013 drafted + proven locally**: self-assign standing hole closed in `approve_task` (the sole path to `increment_user_credits`) plus `create_task`/`update_task`; verified on a throwaway Postgres cluster — 20/20 assertions, rollback and re-apply both confirmed. UNAPPLIED, awaiting your go.
- 2026-07-29 **Five design fixes from the browser walkthrough**: one scrim token replacing five hard-coded backdrops; mission-modal empty-column root cause (a JSX children array is always truthy); equal-height panels; width-robust German header; single-option Mode selectors hidden.
- 2026-07-29 **Twelve locales live + verified**: es/pt/it/fr/ro + nl/pl/sv/da/cs via two Codex waves; 417/417 key parity each, no BOM/U+FFFD, 96-99% of leaves differ from English with zero long strings copied, rank words <=13 chars. Main bundle 392 kB with all twelve.
- 2026-07-29 **i18n rearchitected for 12 languages**: lazy locale chunks (main bundle −17 kB), filesystem-derived picker, detector dropped, 17 gate tests that immediately caught a duplicate key in en+de and a de orphan.
- 2026-07-29 **Two Codex audits collected**: adversarial mobile (1 BLOCKER + ~10 MAJOR) and hard-coded strings (~150 + 13 formatters + 5 pluralisations). Both queued as the next build items.
- 2026-07-28 **Proposal 012 APPLIED to production**; every `scripts/prod/` script fixed to stop reporting success for failed commands (a failed run had printed "Migration applied successfully").
