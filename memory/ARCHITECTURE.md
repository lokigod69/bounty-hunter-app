# Architecture
Last verified: 2026-07-24

## Overview
Single-page React 18 app (Vite, TypeScript, Tailwind, React Router v6) talking directly to Supabase — no separate backend server. Supabase provides Postgres with RLS, magic-link auth, Storage (proof/avatar/reward images), Realtime subscriptions, PL/pgSQL RPCs for anything credit-touching, and Deno Edge Functions for notifications. Frontend deploys to Vercel; a Capacitor iOS shell exists but the web app is primary. Local dev runs on port 6075 (see PORTS.md).

## Key components
| Area | Where | Notes |
|---|---|---|
| Routing/shell | `src/App.tsx`, `src/components/Layout.tsx` | React Router v6; Layout owns nav + mobile menu |
| Pages | `src/pages/` | Dashboard (assigned), IssuedPage (created), Friends, ArchivePage, RewardsStorePage, Login, profile edit |
| UI primitives | `src/components/ui/`, `src/components/modals/` | AppButton, ConfirmModal, ModalShell, MissionModalShell, EvidencePanel; shared LIFO Escape and focus-trap hooks own dialog mechanics |
| Domain logic | `src/core/` (contracts, credits, proofs, rewards), `src/domain/` | Pure, vitest-tested; keep Supabase I/O out of here |
| Data hooks | `src/hooks/` | useFriends and assigned/issued/archived contract hooks use stale-while-revalidate (`loading` first load, `isRefreshing` later); `useSignedProofUrl` exchanges private proof paths at render |
| Security tests | `src/security/` | Regression tests for email functions, storage policies, launch quick-fixes |
| Theming | `src/theme/` | Multiple named themes, `useThemeStrings` for theme-flavored copy |
| i18n | `src/i18n/locales/{en,de}/translation.json` | Every user-facing string goes through i18next, both locales |
| Supabase client | `src/lib/supabase.ts` | Needs `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env.local` |
| DB schema | `supabase/migrations/` | Through 2026-06-11 (storage buckets/policies); generated types in `src/types/database.ts` |
| Prod SQL process | `db/proposals/`, `docs/runbooks/` | Numbered proposals with up/down SQL + per-proposal prod runbooks |
| Edge Functions | `supabase/functions/` | notify-reward-creator and legacy Gmail notifiers (need hardening/removal) |

## Data flow
Client hooks query Supabase tables directly under RLS. Task lifecycle transitions (submit/reject/start-stop/archive/delete, plus existing approval) go through Postgres RPCs; only creator task-content edits remain direct table updates pending Phase B. Assignee acceptance uses the existing `set_task_status` caller (`pending → in_progress`). Credit changes and reward purchases also go through RPCs. Realtime `postgres_changes` subscriptions revalidate contract/friend lists without replacing populated UI. Proof files upload to the private `bounty-proofs` bucket before `submit_proof`; `EvidencePanel` renders text plus a one-hour signed image/video/PDF URL for either participant. On delete the client removes the Storage object BEFORE `delete_task` (the bucket's delete policy joins the tasks row, so post-delete removal always fails RLS). Proposal 011 is live (2026-07-10) and `database.ts` includes all 5 RPCs natively — no client-side type overlay.

## External services & dependencies that matter
- Supabase Cloud project (Postgres, Auth, Storage, Edge Functions) — the entire backend; env vars in `.env.local` from `.env.example`.
- Vercel hosting (`vercel.json`).
- Email/notification provider secrets only if Edge Functions are deployed; legacy Gmail functions are a known liability.

## Conventions
- Production SQL: proposal in `db/proposals/` + runbook in `docs/runbooks/`, backup first, Saya review required — never apply directly.
- Business rules go in `src/core`/`src/domain` (pure, tested), not in hooks/components.
- All strings i18n'd in both en and de; themes supply flavored strings via `useThemeStrings`.
- Checks: `npm run build`, `npm run lint`, `npm test` (vitest), `npm audit --omit=dev`.
- Dev server: `npm run dev -- --host 127.0.0.1 --port 6075`.
