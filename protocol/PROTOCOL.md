# Protocol — Bounty Hunter
Mode: 2 Milestone  (set 2026-07-07)
Brain: memory/ (Second Brain Protocol) — coordination here, memory there. Resume order: this file → NEXT_STEP.md → memory/INDEX.md + memory/STATE.md → verify → work. Closing ritual: brain save first, then NEXT_STEP → BOARD → LOG → Status Block.
Definition of v1-done: The app is safely usable by a private group in production — uncommitted work verified and committed; production migration state reconciled and recorded; storage buckets/policies confirmed live; task lifecycle writes moved to server RPCs (or explicitly risk-accepted); legacy notification functions hardened or undeployed; `npm run build`, `npm run lint`, `npm test` all green.
Decision rights: mode-standard, plus one hard deviation — **production SQL is never applied without a backup and Michael's explicit go**, regardless of mode (see db/proposals/ + docs/runbooks/ process).
Human's standing duties: paste NEXT_STEP on context resets; test milestones in the browser (port 6075) as a user; review/approve any prod SQL runbook before it runs.
Workstreams: main
Custom rules for this project: Pending product decision reserved for Michael: allowed proof types (PDF/text/private proof). Deep context lives in docs/codex-refactor-pass/ and CODEX_NEXT_STEPS.md — point there, don't restate.
