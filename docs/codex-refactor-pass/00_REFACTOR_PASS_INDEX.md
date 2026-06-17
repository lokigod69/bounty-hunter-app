# Codex Refactor Pass Index

Date: 2026-05-04
Project: Bounty Hunter
Purpose: current, code-verified orientation for refactor, hardening, docs cleanup, and launch-readiness work.

Open this folder first when returning to the repo:

1. `02_CURRENT_PROJECT_STATE.md` - what the app actually is today.
2. `03_SOURCE_OF_TRUTH.md` - which docs/code to trust.
3. `04_REFACTOR_EXECUTION_PLAN.md` - prioritized Tier A/B/C plan.
4. `06_SQL_AND_MIGRATION_RUNBOOK.md` - manual Supabase/SQL instructions.
5. `10_FINAL_HANDOFF.md` - latest completion state after this pass.

Root-level human docs updated in this pass:

- `README.md`
- `SAYA_USAGE.md`
- `CODEX_CHANGES.md`
- `CODEX_NEXT_STEPS.md`
- `.env.example`

Verification commands for this pass:

- `npm run build`
- `npm run lint`
- `npm audit --omit=dev`

Important note: old GPT-5.5 docs are useful context, not authority. The current authority is source code, migrations, package scripts, and fresh command output.
