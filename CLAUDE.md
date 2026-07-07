# Bounty Hunter — Claude Guide

## Protocol

This project runs under protocol-os (global skill). At session start read protocol/PROTOCOL.md,
then the active workstream's NEXT_STEP.md, verify state, then work. Iron Rules apply.

Read `AGENTS.md` and follow its **Project Memory (Second Brain Protocol)** section: load `memory/INDEX.md` + `memory/STATE.md` at session start, and save back to `memory/` (LOG, STATE, DECISIONS) after meaningful work.

Key project rules:
- Never run production SQL without a backup and Saya review — process lives in `db/proposals/` + `docs/runbooks/`.
- Current source of truth for deep context: `docs/codex-refactor-pass/`; backlog: `CODEX_NEXT_STEPS.md`.
- Checks: `npm run build`, `npm run lint`, `npm test`. Dev server: `npm run dev -- --host 127.0.0.1 --port 6075`.
