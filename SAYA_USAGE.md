# Saya Usage Guide

## What This App Is

Bounty Hunter is a private missions-and-rewards app. A trusted person creates a mission, another person completes it, proof can be submitted, the creator approves it, credits are earned, and credits can be spent on custom rewards.

Use it for family chores, couple requests, friend-group accountability, or small private reward loops. It is not ready to be a public marketplace.

## What To Click First

1. Start the app locally at `http://127.0.0.1:6075`.
2. Log in or sign up.
3. Go through onboarding if shown.
4. Add a friend in `Friends`.
5. Create a mission in `Missions`.
6. Use `Rewards Store` to create and claim rewards.

## Main Workflows

- Create mission: `Missions` -> plus/create -> choose accepted friend -> set proof/reward.
- Complete mission: Dashboard -> open assigned mission -> submit proof or send for review.
- Approve mission: `Missions` -> review section -> approve/reject.
- Claim reward: `Rewards Store` -> available reward -> claim if enough credits.
- Edit profile/theme: profile menu or `/profile/edit`.

## Local Dev

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 6075
```

Required `.env.local`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## What Is Real

- Auth, profiles, friends, missions, proof upload, approval, credits, reward store, and reward claiming are implemented.
- Supabase migrations and Edge Functions exist.
- Capacitor/iOS scaffold exists.

## What Is Mocked Or Fragile

- `/my-rewards` is mostly placeholder.
- Daily/recurring missions are partial/legacy.
- Storage bucket policies need manual verification.
- Legacy email functions need auth hardening or should stay undeployed.
- No automated tests exist yet.
- Dependency audit still reports vulnerabilities until updated.

## SQL / Supabase

Yes, Supabase/Postgres is required. Before public use, Saya should apply and verify migrations in staging, especially:

- `20260412100100_lock_down_increment_user_credits.sql`
- `20260412100200_phase1_reward_and_rpc_hardening.sql`
- `20260412100300_lock_down_credit_table_writes.sql`

Do not run production SQL without backup and staging validation. See `docs/codex-refactor-pass/06_SQL_AND_MIGRATION_RUNBOOK.md`.

## Monetization / Public Potential

Best first public product: a private family/couple/friend-group reward app, not a public bounty marketplace. Paid value could come from groups, themes, media storage, templates, and premium mobile polish.

## iOS / App Readiness

Capacitor exists, but iOS/PWA readiness needs mobile QA, auth redirect cleanup, proof-storage privacy decisions, and bundle-size work.

## Top Next Steps

1. Verify clean Supabase reset and staging migrations.
2. Fix dependency audit vulnerabilities.
3. Codify storage buckets and policies.
4. Move task lifecycle writes into RPCs.
5. Add tests for credits, rewards, and proof flows.
