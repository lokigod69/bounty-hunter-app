# BOARD — Bounty Hunter — updated 2026-07-07 (late night)

## ⚠️ WAITING ON YOU
- **Supabase project is paused** — login is dead (auth calls "Failed to fetch") until you restore it. Follow the restore checklist in NEXT_STEP.md FOR YOU. Code work continues meanwhile; realtime/invite/auth features can't be live-tested until it's back.
- Browser eyeball of Phase 1 glass-card modal surfaces still pending (blocked by the same Supabase outage — can't log in).

## Workstreams
| Workstream | Phase/Gate | Last done | Next | State |
|---|---|---|---|---|
| main | Premium V1 polish — Phase 2 mostly DONE → Phase 2 leftovers / Phase 3 | Jul 7 late night: noun system (Mission/Chore/Request), tasks realtime + nav badges, History nav, rejection loop w/ reason, PDF proofs; 41/41 tests | Phase 2 leftovers (invite links — needs live Supabase; persistence — prod SQL; orphan surfaces; collected-rewards loop) or Phase 3 assets per docs/premium-v1/ROADMAP.md | 🟢 active |

## Standing decisions parked for you (not blocking yet)
- Prod SQL go/no-go whenever a runbook comes up — backup + your review required, always.
- ~~Noun system~~ DECIDED 2026-07-07: Mission/Chore/Request; store items = Rewards; "Bounty" = mission credit pot.
- ~~Proof types~~ DECIDED 2026-07-07: PDF/text/private all allowed.

## Recently finished (last 5)
- 2026-07-07 Phase 2 UX coherence (4 sub-agents, 2 waves): noun system implemented per Michael's call, tasks realtime + action badges (review//issued, rejected//), History nav back, rejection loop (persisted 'rejected' + reason + resubmit; migration 20260707220000 unapplied), PDF proofs aligned (migration 20260707221000 unapplied); 41/41 tests
- 2026-07-07 Supabase found PAUSED → restore runbook written (docs/runbooks/SUPABASE_RESTORE_CHECKLIST.md); decisions recorded: nouns + proof types (memory/DECISIONS.md)
- 2026-07-07 Phase 1 congruence COMPLETE: shared TabBar, generic ModalShell (5 modals migrated, −151 lines), accent single-source (src/theme/modeAccents.ts + drift-guard tests), i18n sweep (~26 strings, de confirmDialog block)
- 2026-07-07 Gift emblem pilot generated: assets-src/generated/gift-emblem-pilot-v1.png, solid #FF00FF background
- 2026-07-07 Congruence pass committed (3e3191d); assets 71→2 MB (b0d5a61); white-screen fixes (2c569a3)
