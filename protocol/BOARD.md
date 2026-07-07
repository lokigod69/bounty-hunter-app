# BOARD — Bounty Hunter — updated 2026-07-08 late night

## ⚠️ WAITING ON YOU
- **New project dashboard config** — magic-link login (and the invite round-trip) won't work until Site URL + redirect URLs are set in the Supabase dashboard (Authentication → URL Configuration): add http://localhost:6075 and your Vercel domain.
- **Browser eyeball of Phases 1–4** (all the new art PLUS the Phase-4 sound pass: volumes, which placeholder sounds to replace) — unblocked once auth config is set.

## Workstreams
| Workstream | Phase/Gate | Last done | Next | State |
|---|---|---|---|---|
| main | Premium V1 polish — **Phases 0–4 COMPLETE + committed** | Jul 8 late night: Phase 4 sound & haptics committed (70bdff3) — feedback.ts unifies sound+haptic behind one API, AppButton/Fab tap haptics, approve/claim payday, volume pass; 49/49 tests, browser-smoked on the dev server | Your auth config + eyeball/audition; then Phase 5 ship vehicle or task-lifecycle RPCs | 🟢 active |

## Standing decisions parked for you (not blocking yet)
- Prod SQL go/no-go whenever a runbook comes up — backup + your review required, always.
- ~~Noun system~~ DECIDED 2026-07-07: Mission/Chore/Request; store items = Rewards; "Bounty" = mission credit pot.
- ~~Proof types~~ DECIDED 2026-07-07: PDF/text/private all allowed.

## Recently finished (last 5)
- 2026-07-08 (late night) **Phase 4 sound & haptics shipped + committed (70bdff3)**: `feedback.ts` semantic API (tap/success/payday/warning/error) pairs sound + haptic and respects the sound toggle; AppButton/Fab light-impact on tap; approve = success buzz + coin, reject = warning (was silent), claim = payday (was silent); per-sound volume pass + `payday` key; 5 new tests (49 total); found + fixed: static @capacitor import white-screens vite dev → lazy import rule recorded in DECISIONS
- 2026-07-08 (night) **Phase 3 visual identity shipped + committed (37b3a4b)**: 16 masters generated via Codex/gpt-image-2 (3 race-duplicates caught by eyeball + regenerated serialized), 17 WebP wired by 5 reviewed sub-agents — raster coin, per-mode gift emblems, type-based card accents, onboarding heroes, 5 empty-state illustrations, 4 store placeholders, iOS icon/splash; Phase-2 tree committed first (47e7eb7)
- 2026-07-08 (later) Applied all 9 migrations (6-batch hardening + 3 new: profiles theme/onboarding, collected redeemed, invites) to the new DB via psql/pooler, backups first, tracker→10 rows; shipped Phase 2 leftovers via 3 reviewed sub-agents — invite links (/invite/:token + redeem RPC + post-login round-trip), mode/onboarding persistence, orphan /profile/edit deleted + Restart-Onboarding folded into modal, collected-rewards mark-redeemed; build/lint/test green (44), 0 net-new type errors (caught + fixed a build-masked type regression); UNCOMMITTED pending Michael's go
- 2026-07-08 Supabase revived: Jan-2026 cluster backup restored into NEW project mvbmpcmexkgfairnthux (ap-south-1) via IPv4 session pooler; all data wiped for clean testing (buckets kept); .env.local + supabase link switched; found schema is pre-April-2026 hardening → 6-migration batch queued for Michael's go
- 2026-07-07 Phase 2 UX coherence (4 sub-agents, 2 waves): noun system implemented per Michael's call, tasks realtime + action badges (review//issued, rejected//), History nav back, rejection loop (persisted 'rejected' + reason + resubmit; migration 20260707220000 unapplied), PDF proofs aligned (migration 20260707221000 unapplied); 41/41 tests
- 2026-07-07 Supabase found PAUSED → restore runbook written (docs/runbooks/SUPABASE_RESTORE_CHECKLIST.md); decisions recorded: nouns + proof types (memory/DECISIONS.md)
- 2026-07-07 Phase 1 congruence COMPLETE: shared TabBar, generic ModalShell (5 modals migrated, −151 lines), accent single-source (src/theme/modeAccents.ts + drift-guard tests), i18n sweep (~26 strings, de confirmDialog block)
- 2026-07-07 Gift emblem pilot generated: assets-src/generated/gift-emblem-pilot-v1.png, solid #FF00FF background
- 2026-07-07 Congruence pass committed (3e3191d); assets 71→2 MB (b0d5a61); white-screen fixes (2c569a3)
