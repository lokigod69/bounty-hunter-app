# Current State
Last updated: 2026-07-07

## What this is
Private gamified chores/missions app for small trusted groups: missions → proof → approval → credits → custom rewards. React 18/Vite/TS + Supabase, deployed on Vercel, Capacitor iOS scaffold exists. Not intended as a public marketplace.

## Working now
- Core loop end-to-end: create mission for a friend, submit proof, approve, earn credits, claim rewards (per SAYA_USAGE.md and domain tests).
- Supabase magic-link/OTP auth, onboarding + tutorial flow, i18n (en/de), multi-theme system.
- Vitest suite (8 test files: domain logic in `src/core/` + `src/domain/`, security policy tests in `src/security/`, themes, auth redirect). `npm test` = `vitest run src`.
- Migrations codified through `20260611120000_storage_buckets_and_policies.sql`; credit-table writes locked down (April 2026 migrations).
- As of the June 2026 codex pass: `npm run build` passed, `npm run lint` 3 warnings / 0 errors, `npm audit --omit=dev` clean. ⚠️ unverified against the current uncommitted tree.

## In progress
- **Uncommitted UI consolidation refactor** in the working tree (27 files, +625/−906): new `src/components/ui/` primitives (AppButton, ConfirmModal, EmptyState, Fab, PageState, SectionHeader), new `src/lib/avatar.ts`; deletes ConfirmDeleteModal, ConfirmDialog, ProofSubmissionModal, TaskCard.css, DoubleCoinValue; touches most pages, themes, and both locale files. Build/test status of this diff unknown; not committed since 2026-06-18.

## Known problems
(mostly from `docs/codex-refactor-pass/10_FINAL_HANDOFF.md` + `CODEX_NEXT_STEPS.md`)
- Production migration state unknown — which migrations/proposals are actually applied in prod is not recorded. Prod SQL requires backup + Saya review first.
- Task lifecycle still uses direct table updates from the client; should move to server RPCs (high effort/high risk item).
- Legacy Gmail notification Edge Functions need auth hardening or undeployment.
- Build warnings: unresolved `/img/C1.jpg`, large JS chunk, mixed dynamic/static import of `src/domain/rewards.ts`.
- README.md is stale in spots (claims no test script; vitest suite exists). docs/overview.md + docs/open-questions.md are 2025-10 vintage — several issues there were since fixed by proposals 001–008; treat as historical.

## Open questions
- Was the 2026-06-18 "Harden V1 launch readiness" commit fully verified? Is the uncommitted UI refactor finished and meant to be committed?
- Which of db/proposals 001–008 and the 2026 migrations are applied in production? (Runbooks exist for 003–008; validation docs for 003–005.)
- Product decision pending (Saya): proof types — PDF/text/private proof allowed or not?
- DB types (`src/types/database.ts`) regeneration pending until production schema source is confirmed.

## Next actions
1. Verify the uncommitted UI refactor: `npm run build`, `npm test`, `npm run lint`; then commit it.
2. Reconcile production migration state (which migrations/proposals applied) and record it here.
3. Work `CODEX_NEXT_STEPS.md` top items: storage bucket/policy verification, task lifecycle RPCs, regenerate DB types.
4. Fix low-risk build warnings (`/img/C1.jpg`, chunking, mixed import).
