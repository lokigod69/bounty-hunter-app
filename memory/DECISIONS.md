# Decisions
Newest first. Never delete a decision — mark it `⚠️ superseded → [[#the newer one]]` instead.
Wrong turns are part of the memory.

Entries below dated before 2026-07-07 are ⚠️ reconstructed from git history, migrations, and docs — decision visible, rationale partly inferred.

## 2026-06 — Codex refactor pass docs are the current source of truth
**Status:** active
**Decision:** `docs/codex-refactor-pass/` (index at `00_REFACTOR_PASS_INDEX.md`) supersedes the older 2025-10 docs (`docs/overview.md`, `docs/open-questions.md`, etc.) as the authoritative project state; `CODEX_NEXT_STEPS.md` is the backlog, `SAYA_USAGE.md` the user guide.
**Why:** The October 2025 deep-dive went stale after the security proposals and 2026 work; the June 2026 pass re-audited everything and wrote a fresh handoff.

## 2026-06 — No production SQL without backup + Saya review
**Status:** active
**Decision:** All production database changes go through written proposals (`db/proposals/`) with up/down SQL and runbooks (`docs/runbooks/PROD_RUNBOOK_*.md`); nothing is applied to prod without a backup and explicit human (Saya) review.
**Why:** Real user data in prod; earlier schema drift incidents (migrations vs live schema) made unattended SQL too risky.

## 2026-04..06 — Lock down client credit writes; codify storage buckets in migrations
**Status:** active
**Decision:** Credits can no longer be initialized or written directly from the browser (`20260412100300_lock_down_credit_table_writes.sql` and related); storage buckets/policies were codified in `20260611120000_storage_buckets_and_policies.sql`.
**Why:** `increment_user_credits` being callable by any authenticated user let clients self-award credits — the top security risk in the 2025 audit.

## 2026-06 — Extract pure domain logic into src/core + src/domain with vitest tests
**Status:** active
**Decision:** Business rules (contracts, credits, proofs, rewards, streaks) live as pure modules under `src/core/` and `src/domain/`, covered by vitest; `src/security/` holds policy regression tests.
**Why:** Hooks mixed Supabase I/O with rules, making the credit/reward logic untestable; the refactor pass needed a safety net before touching lifecycle code.

## 2025-11..2026-01 — Keep rewards_store/collected_rewards; drop marketplace_bounties
**Status:** active
**Decision:** The app's reward system is `rewards_store` + `collected_rewards` (personal, assigned rewards). The duplicate `marketplace_bounties`/`collected_bounties` tables are legacy — proposal `db/proposals/001_drop_marketplace_bounties.md` removes them.
**Why:** App code only ever queried `rewards_store`/`collected_rewards`; the duplicate tables were dead weight from an abandoned public-marketplace idea.

## ~2025 — Magic link (email OTP) auth instead of Google OAuth
**Status:** active ⚠️ rationale unverified
**Decision:** Auth is Supabase magic-link/OTP only, despite original requirements mentioning Google OAuth. Later hardened via proposal 005 (auth OTP hardening).
**Why:** Not documented; presumably simpler setup for a private-group app. Revisit only if login friction becomes a complaint.

## ~2025 — Recurring tasks feature parked
**Status:** active ⚠️ unverified
**Decision:** Backend tables/RPCs for recurring task templates/instances exist but the frontend feature was never built; it is parked, not planned.
**Why:** Not documented — inferred from absence of UI and the 2025 audit flagging it as orphaned.
