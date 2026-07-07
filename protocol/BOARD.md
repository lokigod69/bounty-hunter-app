# BOARD — Bounty Hunter — updated 2026-07-08

## ⚠️ WAITING ON YOU
- ✅ DONE: 9-migration batch applied + verified (hardening + Phase-2 schema). Tracker at 10 rows.
- **Commit go/no-go** — the Phase-2 leftovers working tree (22 modified / 6 new / 1 deleted) is green but UNCOMMITTED. Say "commit it" and I'll commit.
- **New project dashboard config** — magic-link login (and the invite round-trip) won't work until Site URL + redirect URLs are set in the Supabase dashboard (Authentication → URL Configuration): add http://localhost:6075 and your Vercel domain.
- Browser eyeball of Phase 1+2 UI (glass-card modals, badges, reject flow, History, Share invite link, Restart Onboarding, mark-redeemed, mode/onboarding persistence) — unblocked once auth config is set.

## Workstreams
| Workstream | Phase/Gate | Last done | Next | State |
|---|---|---|---|---|
| main | Premium V1 polish — **Phase 2 COMPLETE** → Phase 3 assets | Jul 8: applied all 9 migrations + shipped Phase 2 leftovers (invite links, persistence, orphan surface, mark-redeemed); build/lint/test green, uncommitted | Commit go (your call) + dashboard auth config + browser eyeball, then Phase 3 generated assets per docs/premium-v1/ROADMAP.md | 🟢 active |

## Standing decisions parked for you (not blocking yet)
- Prod SQL go/no-go whenever a runbook comes up — backup + your review required, always.
- ~~Noun system~~ DECIDED 2026-07-07: Mission/Chore/Request; store items = Rewards; "Bounty" = mission credit pot.
- ~~Proof types~~ DECIDED 2026-07-07: PDF/text/private all allowed.

## Recently finished (last 5)
- 2026-07-08 (later) Applied all 9 migrations (6-batch hardening + 3 new: profiles theme/onboarding, collected redeemed, invites) to the new DB via psql/pooler, backups first, tracker→10 rows; shipped Phase 2 leftovers via 3 reviewed sub-agents — invite links (/invite/:token + redeem RPC + post-login round-trip), mode/onboarding persistence, orphan /profile/edit deleted + Restart-Onboarding folded into modal, collected-rewards mark-redeemed; build/lint/test green (44), 0 net-new type errors (caught + fixed a build-masked type regression); UNCOMMITTED pending Michael's go
- 2026-07-08 Supabase revived: Jan-2026 cluster backup restored into NEW project mvbmpcmexkgfairnthux (ap-south-1) via IPv4 session pooler; all data wiped for clean testing (buckets kept); .env.local + supabase link switched; found schema is pre-April-2026 hardening → 6-migration batch queued for Michael's go
- 2026-07-07 Phase 2 UX coherence (4 sub-agents, 2 waves): noun system implemented per Michael's call, tasks realtime + action badges (review//issued, rejected//), History nav back, rejection loop (persisted 'rejected' + reason + resubmit; migration 20260707220000 unapplied), PDF proofs aligned (migration 20260707221000 unapplied); 41/41 tests
- 2026-07-07 Supabase found PAUSED → restore runbook written (docs/runbooks/SUPABASE_RESTORE_CHECKLIST.md); decisions recorded: nouns + proof types (memory/DECISIONS.md)
- 2026-07-07 Phase 1 congruence COMPLETE: shared TabBar, generic ModalShell (5 modals migrated, −151 lines), accent single-source (src/theme/modeAccents.ts + drift-guard tests), i18n sweep (~26 strings, de confirmDialog block)
- 2026-07-07 Gift emblem pilot generated: assets-src/generated/gift-emblem-pilot-v1.png, solid #FF00FF background
- 2026-07-07 Congruence pass committed (3e3191d); assets 71→2 MB (b0d5a61); white-screen fixes (2c569a3)
