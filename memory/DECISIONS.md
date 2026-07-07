# Decisions
Newest first. Never delete a decision — mark it `⚠️ superseded → [[#the newer one]]` instead.
Wrong turns are part of the memory.

Entries below dated before 2026-07-07 are ⚠️ reconstructed from git history, migrations, and docs — decision visible, rationale partly inferred.

## 2026-07-08 — database.ts is regenerated + UTF-8; custom.ts overlays only for NOT-yet-migrated columns
**Status:** active — supersedes [[#2026-07-08 — DB type additions go through custom.ts overlay, not the UTF-16 database.ts]]
**Decision:** `src/types/database.ts` is now regenerated from the live project (`npx supabase gen types typescript --project-id mvbmpcmexkgfairnthux` — use `--project-id`, NOT `--linked` which demands a DB password) and stored as **UTF-8 no-BOM** (was UTF-16LE; git treated it as binary). After any applied migration, regen the file instead of extending `custom.ts`; overlays in custom.ts are only for columns that exist in code but not yet in the DB. The regen dropped the legacy marketplace_bounties/collected_bounties types — the schema and types now agree.
**Why:** The overlay rule existed to avoid hand-editing a UTF-16 file; with the file UTF-8 and the regen path proven, overlays would just drift. The regen also caught a real runtime bug (PDF/video proof validation) that the overlay approach had hidden — types that match the DB are a bug-finding tool.

## 2026-07-08 — Feedback layer: one semantic API, haptics behind the sound toggle, Capacitor plugins lazy-imported
**Status:** active
**Decision:** All user feedback goes through `src/utils/feedback.ts` (`tap`/`success`/`payday`/`warning`/`error`) — call sites state the event, the module owns the sound+haptic pairing. Haptics obey the existing single sound toggle (no separate haptics setting for V1). AppButton/Fab fire the tap impact centrally, so individual buttons never wire haptics. **Capacitor plugins must be dynamically `import()`ed from web code, never statically imported**: a static `import '@capacitor/haptics'` broke the vite DEV server (optimizer mixed chunk generations → two React copies → app-wide "Invalid hook call" white screen; production build unaffected; survived cache purges). New sounds: `payday` key for credit-award moments (aliases coin.mp3 until a distinct sound is auditioned); approve plays approveProof+payday instead of the old success×2+coin stack; per-sound volumes replace the Android blanket override.
**Why:** One API keeps sound/haptic pairings consistent and future settings (separate haptics toggle, intensity) one-file changes. Toggle unification matches user expectation ("mute the app" = no buzzing). The lazy-import rule is load-bearing: it is the difference between a working and a white-screened dev server, and it keeps @capacitor/* off the web critical path.
**Rejected:** Separate haptics toggle (settings sprawl for V1); haptic on every sound automatically (nav clicks with notification-style haptics feel wrong); pinning/deopting the vite optimizer instead of lazy import (fights the tool; lazy import is strictly better).

## 2026-07-08 — Phase-3 asset design system: gold-medallion emblems, per-mode materials, type-based accents
**Status:** active
**Decision:** The app's generated-art language is **sculpted gold game-medallion**: circular gold ring + four compass gems for emblems (gift emblems in mode materials — guild teal, family honey #F5D76E-ish, couple rose #FF6FAE-ish; coin/credits always gold), painterly dark key-art heroes with mode-accent rim light, thin gold-linework empty-states on #090A0F with radially faded edges, dark still-life reward placeholders. Mission-card accents are now **reward-TYPE-based** (`getTypeAccentVariant`: credit→gold to match the coin, gift→mode primary) instead of the random per-id hash; the hash variant stays on store RewardCards for shelf variety. Reward placeholders replace only the DEFAULT 🎁/broken images — a user-picked emoji always wins. The credit-pouch emblem was generated but deliberately NOT wired (coin already carries credit identity everywhere a value shows).
**Why:** Roadmap Phase 3 item 2 prescribed emblem + per-type accent; one material language keeps 16 disparate images reading as one product. Type-based accent turns card color into information (what kind of reward) instead of noise.

## 2026-07-08 — Codex image generation: verify every output, serialize regenerations
**Status:** active
**Decision:** Parallel `codex:codex-rescue` image tasks are allowed for FIRST-pass batches, but every returned image must be visually verified before use, and any regeneration runs ONE AT A TIME. Rose/pink art keys on GREEN #00FF00; everything else on #FF00FF magenta (defringe: clamp B≤G for magenta, G≤max(R,B) for green).
**Why:** 3 of 15 parallel runs copied another task's newest PNG from the shared Codex output pool (wrong image, right filename) — silent and only catchable by eyeballing. Serial regens can't race; green key needed because magenta collides with rose subjects.

## 2026-07-08 — 9-migration batch applied to the new test DB (Michael's explicit go)
**Status:** active
**Decision:** On "apply the migration and all else," applied the queued 6 hardening migrations PLUS 3 new Phase-2 migrations to `mvbmpcmexkgfairnthux` via the session pooler + psql (NOT `supabase db push` — the remote tracker held only `20231117000000`, so a push would have replayed every intermediate migration against the already-restored schema). Backups taken before each batch; all 9 recorded in `supabase_migrations.schema_migrations`. New schema: `profiles.theme`/`onboarding_completed`, `collected_rewards.redeemed_at` + `mark_reward_redeemed` RPC, `invites` table + `get_or_create_invite`/`redeem_invite` RPCs.
**Why:** Zero-data test DB + fresh backups made the risk nil; direct psql of the specific files kept the tracker honest where a push could not.

## 2026-07-08 — Invite links: reusable per-user token, redeem = accepted friendship
**Status:** active
**Decision:** Shareable friend invites use an `invites` table (owner-only RLS) with a reusable random token per user; the recipient opens `/invite/<token>` (a PUBLIC route), and `redeem_invite()` (SECURITY DEFINER) creates/promotes an **ACCEPTED** friendship between the token owner and the caller — no extra approval step. Logged-out recipients get the token stashed in `localStorage` and redeemed post-login by `useRedeemPendingInvite()` (mounted in the authenticated Layout). No edge-function/email path (relies on the existing magic-link login).
**Why:** A two-player app must recruit player 2 who has no account yet; the existing add-friend surfaces only found existing accounts. Auto-accept is correct because the inviter consented by sharing. Token table (vs. embedding a raw user id) keeps it revocable and non-enumerable. **Consequence:** a brand-new signup's redemption fires only after onboarding (Layout is behind FTXGate) — token persists until then; acceptable for V1.

## 2026-07-08 — DB type additions go through custom.ts overlay, not the UTF-16 database.ts
**Status:** ⚠️ superseded → [[#2026-07-08 — database.ts is regenerated + UTF-8; custom.ts overlays only for NOT-yet-migrated columns]]
**Decision:** New columns/tables (`theme`, `onboarding_completed`, `redeemed_at`, `invites`) were typed by extending `src/types/custom.ts`, leaving the auto-generated UTF-16 `src/types/database.ts` untouched; RPCs not in the generated types are called with the `('name' as never, args as never)` loose-cast already used in the codebase. Persistence writes are fire-and-forget with localStorage as the immediate source of truth.
**Why:** Hand-editing the UTF-16 file risks encoding corruption, and this is the codebase's established precedent (`partner_user_id`). NB: `npm run build` does NOT typecheck pages (root tsconfig `files: []`) — always run `tsc -p tsconfig.app.json --noEmit` to catch type regressions in pages/hooks (it surfaced 7 masked errors this session).

## 2026-07-08 — Fresh Supabase project restored from Jan-2026 backup; data wiped for testing
**Status:** active
**Decision:** Michael abandoned unpausing the old project (`bounty`, ref tsnjpylkgsovjujoczll, us-east-2) and created a new one (`bounty-hunter-app`, ref mvbmpcmexkgfairnthux, **ap-south-1 Mumbai**). The 28-01-2026 cluster backup was restored into it via psql, then ALL data rows were wiped on his explicit instruction (public tables truncated, 9 auth.users deleted, storage.objects empty; the 3 buckets kept) — the new project is a clean test environment. `.env.local` and `supabase link` now point at it.
**Why:** Faster path back to a working login than the paused-project restore flow; old data not needed for the current testing phase. **Consequences:** (1) the restored schema is the pre-April-2026 state — the credit-write lockdown (20260412*) and storage-policy codification (20260611*) are NOT in it and must be re-applied along with 20260707* (Michael's go still required); (2) real user data, if ever wanted, exists only in the old paused project; (3) direct DB host is IPv6-only — use the session pooler `aws-1-ap-south-1.pooler.supabase.com:5432`, user `postgres.mvbmpcmexkgfairnthux`; (4) Mumbai region means noticeable latency from Europe — acceptable for testing, revisit before real launch.

## 2026-07-07 — Canonical noun system: Mission / Chore / Request per mode
**Status:** active
**Decision:** Michael approved the recommended noun set. The task object is named by mode via the existing `theme.<mode>.*` i18n mechanism: **Mission** (guild), **Chore** (family), **Request** (couple). Store items are plain **Rewards** everywhere ("Bounty" no longer names store items, including guild's `rewardSingular`). **"Bounty" is reserved for the credit pot attached to a mission.** The hardcoded Contract/Mission/Task mixing in `contracts.*`, `taskForm.*`, `navigation.*` and component-level English (e.g. TaskCard status chips) gets purged and routed through theme strings.
**Why:** Five names for one entity ("Contract, Mission, Task, Chore, Bounty Contract") plus "bounty" double-booked (store item AND task type) made the app feel random — Phase 2.1 of docs/premium-v1/ROADMAP.md.

## 2026-07-07 — Proof types: PDF, text-only, and private proof are allowed
**Status:** active
**Decision:** Michael approved allowing PDF proofs, text-only proofs, and private proofs. Implementation reality (recon 2026-07-07): text-only already works end-to-end; PDF is allowed by the ProofModal dropzone but blocked by the storage bucket mime allowlist and by `uploadProof` in src/domain/missions.ts (which conversely allows video the dropzone doesn't offer); private proof has no schema/UI support yet. Alignment work: fix the domain validator, add PDF to the bucket allowlist via migration (applied when Supabase is restored — prod-SQL rule still applies), and schedule private-proof (visibility column + UI) as its own item.
**Why:** Pre-existing product decision parked since the codex pass (CODEX_NEXT_STEPS #3); private-group trust model makes permissive proof types low-risk.

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
