# Docs Inventory

## Current Source Of Truth

| Document | Status | Notes |
|---|---|---|
| `docs/codex-refactor-pass/*` | useful/current | Created from current code and fresh checks on 2026-05-04. Use first. |
| `SAYA_USAGE.md` | useful/current | Human-facing guide for Saya. |
| `README.md` | useful/current | Practical setup and architecture summary. |
| `CODEX_CHANGES.md` | useful/current | Tracks this refactor pass. |
| `CODEX_NEXT_STEPS.md` | useful/current | Short top-next-actions list. |
| `.env.example` | useful/current | Documents required client env and Edge Function secrets. |
| `package.json` | authoritative | Scripts and dependency reality. |
| `src/**` | authoritative | Actual app behavior. |
| `supabase/migrations/**` | authoritative for intended DB changes | Must still be tested against a clean Supabase reset before production. |

## Useful But Verify Before Trusting

| Document | Status | Notes |
|---|---|---|
| `docs/gpt55-handoff/*.md` | useful/partly stale | Strong audit material, but predates this pass and must be checked against current code. |
| `docs/gpt55-handoff/*.png` and `beautiful-html/*` | useful/visual | Good visual orientation; may be stale where code changed. |
| `docs/INDEX.md` | useful/stale | Good structure, but now missing `docs/codex-refactor-pass`. |
| `docs/PRODUCT_VISION_V1.md` | useful | Product direction; not implementation truth. |
| `docs/DESIGN_V1_BRIEF.md` | useful | Visual/design direction. |
| `docs/ARCHITECTURE_FRONTEND.md` | useful/verify | Frontend architecture notes; verify file paths and current behavior. |
| `docs/runbooks/LOCAL_DEV_RUNBOOK.md` | stale/unclear | Mentions port 5173 and old migration issues; use this pass instead. |
| `docs/sql-inventory/*` | useful/historical | Good DB evidence, but may not match latest migrations. |
| `db/proposals/*.sql` | useful/proposed | Not automatically applied; treat as proposals unless copied into `supabase/migrations`. |

## Historical Or Low-Trust Reports

| Document Group | Status | Notes |
|---|---|---|
| `docs/history/*` | historical | Session reports and old plans; useful for archaeology only. |
| `docs/V1_STATUS_ROSE_*` | duplicate/stale | Many snapshots. Do not use as current state without verification. |
| `docs/V1_TESTING_RESULTS_*` | historical | Manual QA snapshots, not current proof. |
| `docs/runbooks/PROD_RUNBOOK_003.md` through `008.md` | historical/unclear | May describe old migration proposals; production steps need Saya review. |
| `_archive/*` | archived | Do not restore or trust without inspecting. |
| `supabase/schema*.sql` | stale snapshot | Useful for comparison, but migrations have moved beyond these dumps. |

## Docs That Should Not Be Trusted Blindly

- Any doc that says only magic-link auth exists. Current `Login.tsx` supports Google OAuth, email/password, and magic link.
- Any doc that says no current hardening migration exists. April 2026 migrations now exist.
- Any doc that says placeholder `YYYYMMDDHHMMSS_*` migrations are active. They are now deleted from `supabase/migrations` and preserved under `supabase/migrations.bak/_placeholders`.
- Any doc that says frontend port is 5173 as the assigned project port. Saya has assigned frontend port `6075`.

## Cleanup Recommendation

Do not delete old reports yet. Keep this folder as the current index layer and later archive stale root docs only after Saya confirms no historical report is needed.
