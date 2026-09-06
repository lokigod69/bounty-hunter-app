# Architecture
Last verified: 2026-09-07

## Overview
Single-page React 18 app (Vite, TypeScript, Tailwind, React Router v6) talking directly to Supabase — no separate backend server. Supabase provides Postgres with RLS, magic-link auth, Storage (proof/avatar/reward images), Realtime subscriptions, PL/pgSQL RPCs for anything credit-touching, and Deno Edge Functions for notifications. Frontend deploys to Vercel; a Capacitor iOS shell exists but the web app is primary. Local dev runs on port 6075 (see PORTS.md).

## Key components
| Area | Where | Notes |
|---|---|---|
| Routing/shell | `src/App.tsx`, `src/components/Layout.tsx` | React Router v6; Layout owns three persistent destinations plus persistent seal and payout-ceremony layers |
| Pages | `src/pages/` | Dashboard (assigned), IssuedPage (created), Friends, ArchivePage, RewardsStorePage, Login, profile edit |
| UI primitives | `src/components/ui/`, `src/components/modals/` | AppButton, ConfirmModal, ModalShell, MissionModalShell, EvidencePanel; shared LIFO Escape and focus-trap hooks own dialog mechanics |
| Domain logic | `src/core/` (contracts, credits, proofs, rewards), `src/domain/` | Pure, vitest-tested; keep Supabase I/O out of here |
| Data hooks | `src/hooks/` | Contract hooks use stale-while-revalidate; `useSignedProofUrl` exchanges private proof paths; `usePayoutWatcher` baselines then diffs hunter-side review→completed credit transitions |
| Security tests | `src/security/` | Regression tests for email functions, storage policies, launch quick-fixes |
| Theming | `src/theme/`, `src/context/ThemeContext.tsx` | Shared vocabulary; account Mint/Gold/Rose palette plus independent device-local Starlight/Forged/Astral skin; rank flavor only |
| i18n | `src/i18n/locales/*/{translation,quotes}.json` | Twelve locales, English eager and others lazy; older hardcoded surfaces remain |
| Supabase client | `src/lib/supabase.ts` | Needs `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env.local` |
| DB schema | `supabase/migrations/` | Through 2026-06-11 (storage buckets/policies); generated types in `src/types/database.ts` |
| Prod SQL process | `db/proposals/`, `docs/runbooks/` | Numbered proposals with up/down SQL + per-proposal prod runbooks |
| Edge Functions | `supabase/functions/` | notify-reward-creator and legacy Gmail notifiers (need hardening/removal) |

## Data flow
Client hooks query Supabase tables directly under RLS. Task lifecycle transitions (submit/reject/start-stop/archive/delete, plus existing approval) go through Postgres RPCs; creation and creator content edits also use the applied proposal-012 RPCs. Assignee acceptance uses the existing `set_task_status` caller (`pending → in_progress`). Credit changes and reward purchases also go through RPCs. Realtime `postgres_changes` subscriptions revalidate contract/friend lists without replacing populated UI. The persistent payout watcher performs its own narrow assigned-task fetch, treats the first result as baseline, and emits `bh:payout` plus `bh:credits-changed` only for later credit transitions from review to completed; header/mobile balance readers refetch from that event. Proof files upload to the private `bounty-proofs` bucket before `submit_proof`; `EvidencePanel` renders text plus a one-hour signed image/video/PDF URL for either participant. On delete the client removes the Storage object BEFORE `delete_task` (the bucket's delete policy joins the tasks row, so post-delete removal always fails RLS). Proposal 011 is live (2026-07-10) and `database.ts` includes all 5 RPCs natively — no client-side type overlay.

## External services & dependencies that matter
- Supabase Cloud project (Postgres, Auth, Storage, Edge Functions) — the entire backend; env vars in `.env.local` from `.env.example`.
- Vercel hosting (`vercel.json`).
- Email/notification provider secrets only if Edge Functions are deployed; legacy Gmail functions are a known liability.

## Conventions
- Production SQL: proposal in `db/proposals/` + runbook in `docs/runbooks/`, backup first, Saya review required — never apply directly.
- Business rules go in `src/core`/`src/domain` (pure, tested), not in hooks/components.
- New strings have parity in all twelve locales. `useThemeStrings` combines shared product copy with optional rank flavor.
- Checks: `npm run build`, `npm run lint`, `npm test` (vitest), `npm audit --omit=dev`.
- Dev server: `npm run dev -- --host 127.0.0.1 --port 6075`.

## 2026-09-07 workflow boundaries

ProtectedRoute sends a retained invite token to InvitePage before FTXGate. InvitePage owns redemption/retry; tokens are cleared on success or explicit dismissal. Native auth listens for appUrlOpen and reads getLaunchUrl, deduplicating callbacks. The public web origin builder rejects non-shareable native origins. There is no native push/deletion endpoint yet.

The separate tests/ux-preview Vite config injects a fictional in-memory Supabase adapter for UI verification only. Production vite.config.ts does not reference that adapter. No fake credentials/data are shipped in the regular build.

## 2026-09-07 visual materials

ThemeContext exposes skinId/setSkinId separately from the persisted account theme. The validated bounty_skin localStorage preference sets html[data-skin] before paint. src/theme/skin-styles.css defines three materials and references one generated WebP per finish; index.css applies the shared frame variables. Profile swatches preview all three. Coin contains a decorative image plus a localized numeric span; AppButton keys a decorative span per press to restart one short CSS rim glint without timers. No new backend fields or runtime dependencies.
