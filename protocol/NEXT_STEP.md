# NEXT STEP — Bounty Hunter/main — updated 2026-07-07 (night)

## FOR YOU
1. Noun-system decision still parked on BOARD.md (answer whenever, not blocking).
2. Quick browser eyeball (port 6075): Phase 1 normalized modal surfaces to glass-card (CreateBounty/EditBounty/ProfileEdit were solid gray) and unified tab bars — confirm they look right on mobile + desktop.
Otherwise nothing: paste the block below into a fresh chat to continue.

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md (this file), memory/INDEX.md, memory/STATE.md, and docs/premium-v1/ROADMAP.md.
Verify state: `git log --oneline -6` — expect the "Finish Phase 1 congruence" commit on top of be8979c; `npm run build` and `npm test` must be green (33 tests).
Phase 1 (congruence) is COMPLETE: TabBar + ModalShell primitives, accent single-source (src/theme/modeAccents.ts), i18n sweep all landed. `assets-src/generated/` has coin pilots plus `gift-emblem-pilot-v1.png`.
Then: Phase 2 UX coherence (action badges + realtime via orphaned useTasks.ts channel, rejection loop, re-enable History nav, invite links — noun system needs Michael's call first) or remaining Phase 3 assets (credit emblem, mode art, empty states, reward-store placeholders, app icon/splash), per BOARD.md.
Mode 2 rules apply. Update NEXT_STEP.md after every completed step. End every turn with the Status Block.
