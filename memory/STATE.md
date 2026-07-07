# Current State
Last updated: 2026-07-07 (late night)

## What this is
Private gamified chores/missions app for small trusted groups: missions → proof → approval → credits → custom rewards. React 18/Vite/TS + Supabase, deployed on Vercel, Capacitor iOS scaffold exists. Not intended as a public marketplace.

## Working now
- Core loop end-to-end: create mission for a friend, submit proof, approve, earn credits, claim rewards (per SAYA_USAGE.md and domain tests).
- Supabase magic-link/OTP auth, onboarding + tutorial flow, i18n (en/de), multi-theme system.
- Vitest suite (9 test files, 33 tests: domain logic in `src/core/` + `src/domain/`, security policy tests in `src/security/`, themes + accent drift guards, auth redirect). `npm test` = `vitest run src`.
- Migrations codified through `20260611120000_storage_buckets_and_policies.sql`; credit-table writes locked down (April 2026 migrations).
- As of the June 2026 codex pass: `npm run build` passed, `npm run lint` 3 warnings / 0 errors, `npm audit --omit=dev` clean. ⚠️ unverified against the current uncommitted tree.

## In progress
- **Premium V1 polish phase** (roadmap: `docs/premium-v1/ROADMAP.md`, 5 phases). Phases 0–1 DONE (see LOG). Phase 2 UX coherence MOSTLY DONE as of 2026-07-07 late night: noun system implemented (Mission/Chore/Request via theme strings; store = Rewards; dead namespaces purged), tasks realtime + nav action badges (useTasksRealtime/useActionCounts), History nav re-enabled, rejection loop (persisted 'rejected' + reason + resubmit), proof types aligned (PDF allowed end-to-end once bucket migration applies). Vitest 41/41. Remaining Phase 2: invite links (needs live Supabase), mode/onboarding persistence (prod SQL), orphan surfaces (/profile/edit debug leak), collected-rewards "mark redeemed". Visual eyeball by Michael still pending (blocked by Supabase pause).
- **⚠️ Supabase project PAUSED** — login dead ("Failed to fetch"). Restore checklist: `docs/runbooks/SUPABASE_RESTORE_CHECKLIST.md`. Critical: repo has NO base-schema migration; schema exists only inside the paused project → backup download first. Two new unapplied migrations wait on restore: `20260707220000_add_rejection_reason.sql`, `20260707221000_allow_pdf_proofs.sql` (proposals 009/010). Code degrades gracefully without them (42703 fallback).
- Image-asset pipeline: Codex image generation + gpt-image-2-skill (`~/.codex/skills/gpt-image-2-skill/`) is proven. Current pilots in `assets-src/generated/`: coin (`coin-pilot-v1*.png`) and gift emblem (`gift-emblem-pilot-v1.png`, solid `#FF00FF` background).

## Known problems
(mostly from `docs/codex-refactor-pass/10_FINAL_HANDOFF.md` + `CODEX_NEXT_STEPS.md`)
- Production migration state unknown — which migrations/proposals are actually applied in prod is not recorded. Prod SQL requires backup + Saya review first.
- Task lifecycle still uses direct table updates from the client; should move to server RPCs (high effort/high risk item).
- Legacy Gmail notification Edge Functions need auth hardening or undeployment.
- Build warnings: unresolved `/img/C1.jpg`, large JS chunk, mixed dynamic/static import of `src/domain/rewards.ts`.
- README.md is stale in spots (claims no test script; vitest suite exists). docs/overview.md + docs/open-questions.md are 2025-10 vintage — several issues there were since fixed by proposals 001–008; treat as historical.

## Open questions
- Was the 2026-06-18 "Harden V1 launch readiness" commit fully verified? Is the uncommitted UI refactor finished and meant to be committed?
- Which of db/proposals 001–008 and the 2026 migrations are applied in production? (Runbooks exist for 003–008; validation docs for 003–005.) The Supabase-pause backup download (restore checklist Step 0) doubles as the schema source of truth to answer this.
- ~~Proof types~~ DECIDED 2026-07-07: PDF/text/private all allowed (see DECISIONS). "Private" needs no work — storage RLS already limits proofs to creator+assignee.
- DB types (`src/types/database.ts`) regeneration pending until production schema source is confirmed (`rejection_reason` was hand-added meanwhile).

## Next actions
1. Michael: restore Supabase per `docs/runbooks/SUPABASE_RESTORE_CHECKLIST.md` (backup download FIRST), apply migrations 20260707220000 + 20260707221000 at restore, then eyeball Phase 1+2 UI in the browser (glass-card modals, badges, reject flow, History tab).
2. Remaining Phase 2 per ROADMAP: invite links (needs live Supabase), mode/onboarding persistence to profiles (prod SQL → runbook + Michael's go), orphan surfaces (/profile/edit debug leak), collected-rewards "mark redeemed".
3. Phase 3 generated assets via Codex/gpt-image-2: credit emblem, mode art, empty states, reward-store placeholders, app icon/splash. Gift emblem pilot exists.
4. Reconcile production migration state (the restore backup answers this) and record it here; then `CODEX_NEXT_STEPS.md` top items: task lifecycle RPCs, regenerate DB types.
