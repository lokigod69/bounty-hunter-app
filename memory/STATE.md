# Current State
Last updated: 2026-07-08 (late night, session 2)

## What this is
Private gamified chores/missions app for small trusted groups: missions → proof → approval → credits → custom rewards. React 18/Vite/TS + Supabase, deployed on Vercel, Capacitor iOS scaffold exists. Not intended as a public marketplace.

## Working now
- Core loop end-to-end: create mission for a friend, submit proof, approve, earn credits, claim rewards (per SAYA_USAGE.md and domain tests).
- Supabase magic-link/OTP auth, onboarding + tutorial flow, i18n (en/de), multi-theme system.
- Vitest suite (13 test files, 59 tests: domain logic in `src/core/` + `src/domain/` incl. proof validation, security policy tests in `src/security/`, themes + accent drift guards, auth redirect, feedback sound+haptics contract). `npm test` = `vitest run src`.
- **`tsc -p tsconfig.app.json --noEmit` = 0 errors** (2026-07-08 session 2, commit fcb830d): `database.ts` regenerated from the live project (now UTF-8, includes daily_mission_streaks/invites/approved_at/all RPCs; legacy marketplace tables gone), custom.ts overlays slimmed, 15-error baseline burned down. Regen also fixed a real bug: PDF/video proofs were failing domain validation ("Unknown proof type") — now allowed + tested.
- Unified feedback layer (`src/utils/feedback.ts`, Phase 4): sound + haptics behind one semantic API; @capacitor/haptics lazy-imported (static import breaks vite dev — see LOG 2026-07-08 late night); volume pass in soundManager.
- Migrations: all 9 repo migrations are APPLIED to the new test DB as of 2026-07-08 (see LOG); credit-table writes + increment RPC locked down, storage policies live, PDF proofs + rejection_reason + profile persistence + collected redeemed + invites all in the schema. Tracker (`supabase_migrations.schema_migrations`) has 10 rows.
- As of the June 2026 codex pass: `npm run build` passed, `npm run lint` 3 warnings / 0 errors, `npm audit --omit=dev` clean. ⚠️ unverified against the current uncommitted tree.

## In progress
- **Premium V1 polish phase** (roadmap: `docs/premium-v1/ROADMAP.md`, 5 phases). Phases 0–2 DONE + committed (47e7eb7); Phase 3 DONE + committed (37b3a4b). **Phase 4 sound & haptics DONE + committed (70bdff3, 2026-07-08 late night):** feedback.ts semantic API, AppButton/Fab tap haptics, approve/reject/delete/claim wired, volume pass, payday key. Code-complete; pending Michael: sound audition (upload/toggle/payday alias placeholder files) + on-device haptics (Phase 5 cap sync). Next: **Phase 5 ship vehicle**, or task-lifecycle RPCs / DB-types regen (CODEX_NEXT_STEPS). Visual eyeball of Phases 1–4 by Michael still pending (needs dashboard auth config on the new project). Phase-3 leftovers parked: emblem-credit.webp unwired, streak-flame count, is_daily form toggle, heroes in modal headers.
- **Supabase LIVE again on a NEW project** (2026-07-08): `bounty-hunter-app`, ref `mvbmpcmexkgfairnthux`, region ap-south-1 Mumbai. Jan-2026 cluster backup restored, all data rows wiped for a clean test env (see DECISIONS 2026-07-08). `.env.local` + `supabase link` point at it. DB access from this machine: session pooler `aws-1-ap-south-1.pooler.supabase.com:5432`, user `postgres.mvbmpcmexkgfairnthux` (direct host is IPv6-only; no local IPv6). ✅ 2026-07-08: all 9 repo migrations APPLIED + verified (schema now hardened + Phase-2 columns/RPCs live). Dashboard-side config (auth Site URL/redirects, edge functions, vault secrets) did NOT transfer — auth config still pending, so login/invite round-trip aren't browser-testable yet. Old paused project (`bounty`, tsnjpylkgsovjujoczll) still holds the only copy of real user data. The old restore checklist runbook is now historical.
- Image-asset pipeline: Codex image generation + gpt-image-2-skill (`~/.codex/skills/gpt-image-2-skill/`) is proven. Current pilots in `assets-src/generated/`: coin (`coin-pilot-v1*.png`) and gift emblem (`gift-emblem-pilot-v1.png`, solid `#FF00FF` background).

## Known problems
(mostly from `docs/codex-refactor-pass/10_FINAL_HANDOFF.md` + `CODEX_NEXT_STEPS.md`)
- ~~Production migration state unknown~~ ~~ANSWERED 2026-07-08: restored schema pre-hardening~~ RESOLVED 2026-07-08 (later): all 9 repo migrations applied to the new test DB — `increment_user_credits` + `user_credits` writes revoked from anon/authenticated, storage policies + PDF + rejection_reason + persistence + redeemed + invites all live; tracker now has 10 rows. Prod SQL still requires backup + Michael's go first (the process held this session).
- Task lifecycle still uses direct table updates from the client; should move to server RPCs (high effort/high risk item).
- Legacy Gmail notification Edge Functions need auth hardening or undeployment.
- Build warnings: unresolved `/img/C1.jpg`, large JS chunk, mixed dynamic/static import of `src/domain/rewards.ts`.
- README.md is stale in spots (claims no test script; vitest suite exists). docs/overview.md + docs/open-questions.md are 2025-10 vintage — several issues there were since fixed by proposals 001–008; treat as historical.

## Open questions
- Was the 2026-06-18 "Harden V1 launch readiness" commit fully verified? Is the uncommitted UI refactor finished and meant to be committed?
- ~~Which migrations are applied in production?~~ ANSWERED 2026-07-08 for the new test project (see Known problems). Residual: whether the OLD paused project (with real user data) had the April/June migrations applied — only matters if its data is ever migrated over.
- ~~Proof types~~ DECIDED 2026-07-07: PDF/text/private all allowed (see DECISIONS). "Private" needs no work — storage RLS already limits proofs to creator+assignee.
- ~~DB types regeneration pending~~ DONE 2026-07-08 session 2 (fcb830d): regenerated from mvbmpcmexkgfairnthux via `supabase gen types --project-id` (NOT `--linked`, which wants a DB password); file is UTF-8 now.

## Next actions
1. Michael: (a) set the new project's dashboard auth config (Site URL + redirect URLs for magic links — localhost:6075 and Vercel domain) so login + the invite round-trip are testable; (b) then eyeball Phases 1–4 in the browser (glass modals, badges, reject flow, mark-redeemed, invite link, Phase-3 art, Phase-4 sounds/volumes); (c) sound audition: upload/toggle alias click files, payday aliases coin.mp3 — replace with distinct audio if wanted.
2. ✅ Phases 0–4 of docs/premium-v1/ROADMAP.md DONE + committed (…47e7eb7, 37b3a4b, 70bdff3).
3. Phase 5 ship vehicle: `npx cap sync ios` (picks up @capacitor/haptics native module + Phase-3 icon/splash), device safe-areas, TestFlight prep.
4. `CODEX_NEXT_STEPS.md` top items: task lifecycle RPCs (#4, high effort/risk, needs Michael review); ~~DB-types regen (#5)~~ DONE (fcb830d). Note `npm run build` skips page typechecking — `tsc -p tsconfig.app.json --noEmit` is now CLEAN (0 errors); keep it that way (consider wiring it into CI/pre-commit).
