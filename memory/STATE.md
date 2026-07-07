# Current State
Last updated: 2026-07-08

## What this is
Private gamified chores/missions app for small trusted groups: missions → proof → approval → credits → custom rewards. React 18/Vite/TS + Supabase, deployed on Vercel, Capacitor iOS scaffold exists. Not intended as a public marketplace.

## Working now
- Core loop end-to-end: create mission for a friend, submit proof, approve, earn credits, claim rewards (per SAYA_USAGE.md and domain tests).
- Supabase magic-link/OTP auth, onboarding + tutorial flow, i18n (en/de), multi-theme system.
- Vitest suite (9 test files, 33 tests: domain logic in `src/core/` + `src/domain/`, security policy tests in `src/security/`, themes + accent drift guards, auth redirect). `npm test` = `vitest run src`.
- Migrations: all 9 repo migrations are APPLIED to the new test DB as of 2026-07-08 (see LOG); credit-table writes + increment RPC locked down, storage policies live, PDF proofs + rejection_reason + profile persistence + collected redeemed + invites all in the schema. Tracker (`supabase_migrations.schema_migrations`) has 10 rows.
- As of the June 2026 codex pass: `npm run build` passed, `npm run lint` 3 warnings / 0 errors, `npm audit --omit=dev` clean. ⚠️ unverified against the current uncommitted tree.

## In progress
- **Premium V1 polish phase** (roadmap: `docs/premium-v1/ROADMAP.md`, 5 phases). Phases 0–2 DONE + committed (47e7eb7). **Phase 3 visual identity DONE + committed (37b3a4b, 2026-07-08 night):** 16 generated masters (assets-src/generated/) → 17 WebP (src/assets/generated/, 566 KB); raster coin face, per-mode gift emblems (TypeEmblem), type-based card accents (credit=gold, gift=mode accent), onboarding hero banners, 5 empty-state illustrations, 4 reward-placeholder still-lifes, iOS icon+splash. Vitest 44/44, tsc baseline 15 held. Next: **Phase 4 sound & haptics** or task-lifecycle RPCs (CODEX_NEXT_STEPS). Visual eyeball by Michael still pending (needs dashboard auth config on the new project). Phase-3 leftovers parked: emblem-credit.webp unwired, streak-flame count, is_daily form toggle, heroes in modal headers.
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
- DB types (`src/types/database.ts`) regeneration pending until production schema source is confirmed (`rejection_reason` was hand-added meanwhile).

## Next actions
1. Michael: (a) ✅ done — 9-migration batch applied; (b) set the new project's dashboard auth config (Site URL + redirect URLs for magic links — localhost:6075 and Vercel domain) so login + the invite round-trip are testable; (c) then eyeball Phase 1+2 UI in the browser (glass-card modals, badges, reject flow, History tab, mark-redeemed, Share invite link); (d) go/no-go to commit the current uncommitted Phase-2 working tree.
2. ✅ Remaining Phase 2 DONE (invite links, persistence, orphan surface, collected-rewards mark-redeemed) — 2026-07-08.
3. Phase 3 generated assets via Codex/gpt-image-2: credit emblem, mode art, empty states, reward-store placeholders, app icon/splash. Gift emblem pilot exists.
4. `CODEX_NEXT_STEPS.md` top items: task lifecycle RPCs; regenerate DB types from the new project (types currently overlaid in `src/types/custom.ts` for theme/onboarding_completed/redeemed_at/invites — a full regen would fold these into `database.ts`). Also note `npm run build` skips page typechecking — use `tsc -p tsconfig.app.json --noEmit`.
