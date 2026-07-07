# NEXT STEP — Bounty Hunter/main — updated 2026-07-07

## FOR YOU
Nothing needed. Paste the block below into a fresh chat whenever you want work to continue.

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, then protocol/NEXT_STEP.md (this file), then memory/INDEX.md and memory/STATE.md.
Verify state: run `git status --short` — expect the uncommitted UI-primitives refactor (~27 files: new src/components/ui/*, src/lib/avatar.ts, deleted old modals) still pending. If it was already committed, check protocol/LOG.md and continue from BOARD.md instead.
Then: verify the refactor — `npm run build`, `npm run lint`, `npm test` — fix what breaks, smoke-test the app on port 6075, then commit the refactor with a descriptive message.
Mode 2 rules apply. Update NEXT_STEP.md after every completed step. End every turn with the Status Block.
