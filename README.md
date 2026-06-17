# Bounty Hunter

Bounty Hunter is a Vite/React/Supabase app for private groups to turn chores, favors, and promises into missions with proof, approval, credits, and custom rewards.

## Current Stack

- Frontend: React 18, TypeScript, Vite, Tailwind, React Router.
- Backend: Supabase Auth, Postgres, Storage, Realtime, RPCs, Edge Functions.
- Native shell: Capacitor/iOS scaffold exists.
- Separate backend server: none.

## Local Setup

1. Install dependencies:

```powershell
npm install
```

2. Create `.env.local` from `.env.example`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

3. Run the frontend on the assigned project port:

```powershell
npm run dev -- --host 127.0.0.1 --port 6075
```

## Checks

```powershell
npm run build
npm run lint
npm audit --omit=dev
```

There is no `npm test` script yet.

## Supabase

Migrations live in `supabase/migrations`. Do not run production SQL without backing up the database and checking `docs/codex-refactor-pass/06_SQL_AND_MIGRATION_RUNBOOK.md`.

Required storage buckets are expected by code:

- `avatars`
- `bounty-proofs`
- `reward-images`

## Current Docs

Start here:

- `SAYA_USAGE.md`
- `docs/codex-refactor-pass/00_REFACTOR_PASS_INDEX.md`
- `CODEX_NEXT_STEPS.md`
