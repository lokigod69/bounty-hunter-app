# NEXT STEP — Bounty Hunter/main — updated 2026-07-07 (late evening)

## FOR YOU
One decision parked on BOARD.md (noun system per mode) — answer whenever, not blocking.
Otherwise nothing: paste the block below into a fresh chat to continue.

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md (this file), memory/INDEX.md, memory/STATE.md, and docs/premium-v1/ROADMAP.md.
Verify state: `git log --oneline -6` — expect 3e3191d (congruence pass) on top; `npm run build` and `npm test` must be green (31 tests).
Check whether the dead-CSS purge landed (index.css should be ~1,200 lines if yes; if it's still ~2,050, that step died mid-flight — redo it from ROADMAP Phase 1). `assets-src/generated/` currently has coin pilots plus `gift-emblem-pilot-v1.png`.
Then: continue ROADMAP Phase 1 leftovers (TabBar extract, ModalShell, accent-hex single source, i18n sweep), Phase 2 UX coherence, or remaining Phase 3 assets (credit emblem, mode art, empty states, reward-store placeholders, app icon/splash), per BOARD.md.
Mode 2 rules apply. Update NEXT_STEP.md after every completed step. End every turn with the Status Block.
