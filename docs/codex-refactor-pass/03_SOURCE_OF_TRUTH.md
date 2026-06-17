# Source Of Truth

## What To Trust First

1. Current source files in `src/**`.
2. Current Supabase migrations in `supabase/migrations/**`.
3. `package.json` scripts and dependencies.
4. Fresh command output from this pass.
5. `docs/codex-refactor-pass/**`.
6. Root docs updated in this pass.

## Where Old Docs Disagree With Code

- Auth: older docs often describe magic-link-only behavior. Current code supports Google OAuth, password login, signup, and magic links.
- Ports: older docs mention Vite 5173. Project assignment is frontend port `6075`; Supabase local API remains configured separately in `supabase/config.toml`.
- Migrations: old placeholder migrations are no longer active in `supabase/migrations`; they are in `supabase/migrations.bak/_placeholders`.
- Rewards: older docs use bounty/marketplace names. Current canonical table is `rewards_store`, with legacy naming still in hooks/RPC args.
- Credits: older code/docs allowed client initialization of `user_credits`. This pass removes that browser write path and adds a migration to lock down direct table writes.
- Onboarding: old docs describe more steps than current `Onboarding.tsx`.
- Storage: docs mention buckets, but current migration coverage is incomplete.

## Implementation Trust Rules

- Trust code and migrations over old reports.
- Trust SQL proposals only if moved into `supabase/migrations` or manually applied by Saya.
- Trust generated DB types only after regenerating them from the intended database.
- Treat schema dumps as historical snapshots until regenerated.
- Do not assume production DB access or production migration state.

## Current Implementation Direction

- Keep the React/Vite/Supabase architecture.
- Harden sensitive operations by moving credit/reward/task lifecycle writes into RPCs.
- Avoid full rewrite and avoid new auth/payment/database systems.
- Keep documentation as an index/runbook layer rather than deleting history prematurely.
