# BOARD — Bounty Hunter — updated 2026-07-07 (night)

## ⚠️ WAITING ON YOU
- **Noun-system decision** (Phase 2.1, not blocking Phase 1): one canonical noun per mode for the task object. Recommendation: Mission (guild) / Chore (family) / Request (couple); store items become plain "Rewards"; "Bounty" reserved for a mission's credit pot. Say yes/adjust and the terminology sweep gets scheduled.

## Workstreams
| Workstream | Phase/Gate | Last done | Next | State |
|---|---|---|---|---|
| main | Premium V1 polish — Phase 1 DONE → Phase 2/3 | Jul 7 night: Phase 1 congruence complete (TabBar + ModalShell primitives, accent single-source, i18n sweep; 33/33 tests) | Phase 2 UX coherence (badges+realtime, rejection loop, History nav, invite links; noun call gates item 1) or Phase 3 assets per docs/premium-v1/ROADMAP.md | 🟢 active |

## Standing decisions parked for you (not blocking yet)
- Noun system per mode (see WAITING ON YOU).
- Proof types product call: allow PDF/text/private proof? (CODEX_NEXT_STEPS #3)
- Prod SQL go/no-go whenever a runbook comes up — backup + your review required, always.

## Recently finished (last 5)
- 2026-07-07 Phase 1 congruence COMPLETE: shared TabBar, generic ModalShell (5 modals migrated, −151 lines), accent single-source (src/theme/modeAccents.ts + drift-guard tests), i18n sweep (~26 strings, de confirmDialog block)
- 2026-07-07 Gift emblem pilot generated: assets-src/generated/gift-emblem-pilot-v1.png, solid #FF00FF background
- 2026-07-07 Congruence pass committed (3e3191d): AppButton/modal-enter/Escape/PageState/mode-accent app-wide
- 2026-07-07 Shipped assets 71 MB → 2 MB (b0d5a61); sound registry fixed, safe areas, Spinner (e5543dc)
- 2026-07-07 Two white-screen bugs fixed (2c569a3); June UI refactor verified + committed (8a18540)
