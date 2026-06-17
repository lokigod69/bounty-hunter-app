# Repository Intelligence Map

Generated for a future GPT-5.5 Pro architecture review. This document is based on repository inspection only. It does not modify production code.

## 1. Repository Identity

| Item | Finding | Evidence |
|---|---|---|
| Project name | Package name is `task-bounties-web`; product branding is "Bounty Hunter" / "Bounty Hunter App". | `package.json`; `capacitor.config.ts`; `src/pages/Login.tsx`; `index.html`; `docs/overview.md` |
| Main purpose | A gamified social task/mission app where users create missions/contracts, assign them to friends/partners, submit proof, approve completion, award credits, and redeem credits for rewards. | `docs/overview.md`; routes in `src/App.tsx`; task/reward logic in `src/domain/missions.ts`, `src/domain/rewards.ts`, `src/hooks/useTasks.ts`, `src/hooks/useRewardsStore.ts` |
| Apparent product category | Social productivity / household or friend-group task bounty app with RPG-style reward mechanics. | `docs/PRODUCT_VISION_V1.md`; `docs/overview.md`; UI copy in `src/pages/Dashboard.tsx`, `src/pages/IssuedPage.tsx`, `src/pages/RewardsStorePage.tsx` |
| Primary users | People who assign missions to friends/partners/family, people completing missions, and reward creators/collectors. | Product roles in `docs/overview.md`; partner/friend flows in `src/pages/Friends.tsx`, `src/hooks/usePartnerState.ts`; task/reward pages in `src/pages/Dashboard.tsx`, `src/pages/IssuedPage.tsx`, `src/pages/RewardsStorePage.tsx` |
| Current maturity level | Beta/MVP-ish, not clearly production-ready. There is a deployed Supabase project reference in local config/env, extensive V1 docs, prod scripts, and hardening migrations; but there are also placeholders, archived material, stale docs, no automated tests, and active worktree drift. Mark as NEEDS VERIFICATION before production assumptions. | `.env.local`; `scripts/prod/*.ps1`; `docs/V1_STATUS_ROSE_2025-12-*.md`; `src/pages/MarketplacePage.tsx`; `package.json`; `git status --short` output from inspection |
| Visible branding | Bounty Hunter; app id `com.bountyhunter.app`; logo assets `logo1.png`-`logo4.png`, `public/logo5.png`, `src/assets/logo5.png`; Mandalorian-inspired fonts/classes. | `capacitor.config.ts`; `index.html`; `src/pages/Login.tsx`; `public/logo5.png`; `src/index.css`; `public/fonts/mandalore/*` |
| Domain references | No custom production domain in repo. Vercel SPA rewrite exists. Supabase project URL is present in `.env.local`. Local auth config uses `http://127.0.0.1:3000`. | `vercel.json`; `.env.local`; `supabase/config.toml`; `docs/runbooks/LOCAL_DEV_RUNBOOK.md` |

## 2. Technology Stack

| Area | Identified stack | Evidence and notes |
|---|---|---|
| Frontend framework | React 18 SPA. | `package.json` dependencies `react`, `react-dom`; root render in `src/main.tsx`; app shell in `src/App.tsx` |
| Frontend language | TypeScript with strict compiler settings. | `tsconfig.app.json` has `strict`, `noUnusedLocals`, `jsx: react-jsx`; `.tsx` files under `src/` |
| Routing | React Router DOM v6 with nested protected routes. | `package.json`; `src/App.tsx` imports `BrowserRouter`, `Routes`, `Route`, `Navigate`, `useLocation` |
| Backend framework | Supabase: Postgres, Auth, Realtime, Storage, Edge Functions. | `@supabase/supabase-js` in `package.json`; client in `src/lib/supabase.ts`; SQL in `supabase/migrations/*.sql`; Edge Functions under `supabase/functions/`; local config in `supabase/config.toml` |
| Database | PostgreSQL via Supabase. Local config targets Postgres major version 17. | `supabase/config.toml`; `supabase/schema.sql`; `supabase/schema_all.sql`; migrations in `supabase/migrations/` |
| Auth system | Supabase Auth. Current login UI supports Google OAuth, email/password sign-up/login, and magic link. Local Supabase config has email auth enabled and external Apple disabled; Google provider enablement is not shown in `supabase/config.toml`, so Google production configuration is NEEDS VERIFICATION. | `src/pages/Login.tsx`; `src/context/AuthContext.tsx`; `src/lib/supabase.ts`; `supabase/config.toml` |
| Storage system | Supabase Storage buckets referenced: `bounty-proofs`, `avatars`, `reward-images`. Bucket creation/policies are not defined in `supabase/config.toml`; docs describe manual setup. | `src/hooks/useTasks.ts`; `src/domain/missions.ts`; `src/components/ProfileEditModal.tsx`; `src/pages/ProfileEdit.tsx`; `src/lib/rewardImageUpload.ts`; `docs/runbooks/LOCAL_DEV_RUNBOOK.md` |
| Payment system | None found. Credits are virtual app currency in `user_credits`; no Stripe/payment imports in `package.json` or app source. | `package.json`; `src/domain/credits.ts`; `supabase/schema.sql` |
| AI providers | No runtime AI provider found in app code. Supabase Studio has `openai_api_key = "env(OPENAI_API_KEY)"`, but that is local Supabase Studio config, not application feature code. | `supabase/config.toml`; no AI imports in `src/` |
| External APIs | Supabase Cloud API; Resend email API in `notify-reward-creator`; Gmail SMTP/OAuth via Nodemailer in two legacy/active edge functions; Google OAuth/Gmail refresh-token helper. Google Fonts loaded from `index.html`. | `src/lib/supabase.ts`; `supabase/functions/notify-reward-creator/index.ts`; `supabase/functions/send-new-bounty-alert/index.ts`; `supabase/functions/send-proof-submitted-alert/index.ts`; `get-refresh-token.cjs`; `get-refresh-token.mjs`; `index.html` |
| Hosting/deployment | Vercel for static frontend is assumed; Supabase Cloud for backend. iOS Capacitor project exists but package deps are missing from `package.json`, so mobile build state is NEEDS VERIFICATION. | `vercel.json`; `docs/runbooks/LOCAL_DEV_RUNBOOK.md`; `supabase/config.toml`; `ios/`; `capacitor.config.ts`; `package.json` |
| Package manager | npm. | `package-lock.json`; scripts in `package.json` |
| Test framework | None configured in `package.json`. Existing docs/manual checklists and smoke docs exist, but no automated `test` script or test dependencies were found. | `package.json`; `docs/V1_TESTING_CHECKLIST.md`; `docs/test-runs/*`; no `vitest`, `jest`, `playwright`, or testing-library entries in `package.json` |
| Build tooling | Vite 6, TypeScript compiler, ESLint flat config, PostCSS, Tailwind. | `package.json`; `vite.config.ts`; `tsconfig*.json`; `eslint.config.js`; `postcss.config.js`; `tailwind.config.js` |
| Styling/UI framework | Tailwind CSS plus large custom CSS theme; Lucide icons; glass/dark themed custom components. | `tailwind.config.js`; `src/index.css`; `src/components/*`; `lucide-react` imports across UI files |
| State management | React Context plus custom hooks; no Redux/Zustand. Supabase auth helper context also wraps app. | `src/context/AuthContext.tsx`; `src/context/UIContext.tsx`; `src/context/ThemeContext.tsx`; `src/hooks/*`; `src/App.tsx` |
| ORM/query layer | Supabase JS query builder and RPC calls. No Prisma/Drizzle/TypeORM. | `src/lib/supabase.ts`; `.from(...)`, `.rpc(...)` usage in `src/domain/*`, `src/hooks/*`, `src/components/*`; `package.json` |
| Queue/worker/cron/background jobs | Supabase Edge Function `create-daily-tasks` is designed for scheduled invocation, but no cron declaration was found in repo. Database schema references `net.http_post` and triggers for notifications. Status: NEEDS VERIFICATION. | `supabase/functions/create-daily-tasks/index.ts`; `supabase/schema.sql`; `db/proposals/007_*`; `supabase/config.toml` |
| Mobile wrapper | iOS project and Capacitor config exist. Missing Capacitor npm dependencies make current build reproducibility UNKNOWN. | `ios/`; `capacitor.config.ts`; `package.json`; `package-lock.json` |

## 3. Directory Tree Interpretation

| Path | Purpose | Important files | Controls | Status |
|---|---|---|---|---|
| `src/` | Main React application source. | `src/main.tsx`, `src/App.tsx`, `src/index.css` | SPA entry, routing, global styles. | Active |
| `src/pages/` | Route-level screens. | `Login.tsx`, `Dashboard.tsx`, `IssuedPage.tsx`, `Friends.tsx`, `RewardsStorePage.tsx`, `Onboarding.tsx`, `MarketplacePage.tsx` | User-facing screens for auth, missions, friends, rewards, onboarding. | Active with some unclear/placeholder files (`MarketplacePage.tsx` is not routed in `src/App.tsx`) |
| `src/components/` | Reusable UI components and modals. | `Layout.tsx`, `TaskCard.tsx`, `RewardCard.tsx`, `TaskForm.tsx`, `CreateBountyModal.tsx`, `ProfileEditModal.tsx`, `ProofSubmissionModal.tsx` | Navigation shell, task/reward cards, forms, file upload, modals. | Active |
| `src/components/layout/` | Shared page layout primitives. | `PageContainer.tsx`, `PageHeader.tsx`, `PageBody.tsx`, `StatsRow.tsx` | Consistent page framing and metric rows. | Active |
| `src/components/onboarding/` | Onboarding wizard step components. | `OnboardingStep1Mode.tsx`, `OnboardingStep3Invite.tsx`, `OnboardingStep4Mission.tsx` | First-time experience flow used by `src/pages/Onboarding.tsx`. | Active, naming is historically confusing because imports are renamed |
| `src/components/modals/` | Modal support components. | `MissionModalShell.tsx`, `RewardImageLightbox.tsx`, `StateChip.tsx` | Modal shells/lightboxes/status chips. | Active |
| `src/components/dev/` | Developer/debug components. | `ProfileDebugger.tsx` | Debugging profile/auth state if imported. | Unclear active use; NEEDS VERIFICATION |
| `src/context/` | React Context providers. | `AuthContext.tsx`, `ThemeContext.tsx`, `UIContext.tsx` | Auth/session/profile state, theme state, mobile menu UI state. | Active |
| `src/hooks/` | Data-fetching, mutation, and UI behavior hooks. | `useTasks.ts`, `useFriends.ts`, `useRewardsStore.ts`, `useAssignedContracts.ts`, `useIssuedContracts.ts`, `useCollectedRewards.ts`, `useUserCredits.ts`, `usePartnerState.ts` | Supabase table queries, RPC calls, realtime subscriptions, derived page state. | Active; some older hooks coexist with newer `domain/` wrappers |
| `src/domain/` | Supabase-aware domain service functions. | `missions.ts`, `rewards.ts`, `credits.ts`, `streaks.ts`, `README.md` | Encapsulates mission/reward/credit/streak operations away from UI. | Active but still partially overlapped by direct Supabase use in hooks/pages |
| `src/core/` | Pure domain logic with no React/Supabase. | `core/contracts/contracts.domain.ts`, `core/proofs/proofs.domain.ts`, `core/rewards/rewards.domain.ts`, `core/credits/credits.domain.ts` | Business rules for state transitions, proof validation, purchase decisions. | Active |
| `src/lib/` | Integrations and low-level utilities. | `supabase.ts`, `ftxGate.ts`, `profileBootstrap.ts`, `rewardImageUpload.ts`, `proofConfig.ts`, `overlayRoot.ts`, `scrollLock.ts` | Supabase client, onboarding gate, profile bootstrap, uploads, DOM helpers. | Active |
| `src/types/` | TypeScript app/database types. | `database.ts`, `custom.ts`, `rpc-types.ts`, `app-specific-types.ts` | Supabase generated-ish types and app-specific type aliases. | Active, but `eslint.config.js` ignores `src/types/database.ts`; generated freshness NEEDS VERIFICATION |
| `src/theme/` | Theme definitions and mappings. | `themes.ts`, `theme.types.ts`, `accentVariants.ts`, `modalTheme.ts` | Mode/theme UI look and status mapping. | Active |
| `src/i18n/` | Internationalization setup and translations. | `index.ts`, `locales/en/translation.json`, `locales/de/translation.json`, `locales/en/quotes.json` | i18next setup, English/German translations. | Active |
| `src/assets/` | App-bundled assets. | `logo5.png` | Imported by layout/UI. | Active |
| `public/` | Static assets served by Vite. | `logo5.png`, `fonts/mandalore/*`, `fonts/howdybun/*`, `sounds/*` | Public logo, fonts, sound effects used by CSS and `soundManager`. | Active but heavy; many sound/font variants may be unused |
| `supabase/` | Supabase backend config, migrations, functions, schema snapshots. | `config.toml`, `migrations/*.sql`, `functions/*/index.ts`, `schema.sql`, `schema_all.sql` | Local backend config, database schema/RPC/RLS, edge functions. | Active but has schema snapshots and migrations that may represent different historical states |
| `supabase/migrations.bak/` | Backup/placeholder migrations. | `_placeholders/*.sql`, older migration backups | Historical database migration material. | Legacy/generated backup |
| `supabse/` | Typo folder for Supabase functions. | `supabse/functions/*` in git history/status | Duplicate/typo edge function folder. | Legacy/typo. `eslint.config.js` ignores `supabse/**`; git status showed deletions and replacement under `supabase/functions/` |
| `db/` | Proposal SQL and seed scripts outside Supabase CLI migration flow. | `db/proposals/*.sql`, `db/seeds/seed_minimal.sql` | Security hardening proposals, validation SQL, seed data. | Active documentation/ops adjunct; not automatically run except via `supabase/config.toml` seed path and scripts |
| `scripts/` | PowerShell local/prod database scripts. | `scripts/local/*.ps1`, `scripts/prod/*.ps1` | Start Supabase, load schema snapshots, apply/validate proposal SQL, prod backup/apply/rollback. | Active ops scripts, environment-specific and potentially destructive |
| `docs/` | Product, architecture, history, runbooks, status, test docs. | `docs/INDEX.md`, `docs/overview.md`, `docs/architecture.md`, `docs/runbooks/LOCAL_DEV_RUNBOOK.md`, V1 docs | Human documentation and historical decisions. | Active but mixed freshness; some docs are stale relative to current source |
| `ios/` | Native iOS Capacitor project. | `ios/App/App.xcodeproj`, `ios/App/AppDelegate.swift`, `ios/App/Podfile` | iOS build wrapper/assets. | Unclear; package lacks Capacitor dependencies, so NEEDS VERIFICATION |
| `dist/` | Built frontend output. | generated static files | Vite build output. | Generated; should not be source of truth |
| `node_modules/`, `node_modules_old/` | Installed dependencies and old dependencies. | package folders/binaries | Local environment. | Generated/legacy; `node_modules_old` appears obsolete |
| `.bolt/`, `.claude/`, `.vscode/` | Tool/editor configuration. | `.bolt/config.json`, `.claude/*`, `.vscode/tasks.json`, `.vscode/settings.json` | Agent/editor settings and VS Code tasks. | Tooling; `.claude/` ignored by `.gitignore`, `.vscode/extensions.json` tracked |
| `_archive/` | Archived material. | untracked during inspection | Historical/archive files. | Unclear; ignored by ESLint and untracked in current worktree |

## 4. Entry Points

### Web App Routes

Defined in `src/App.tsx`.

| Route | Component | Auth/gate | Evidence |
|---|---|---|---|
| `/login` | `src/pages/Login.tsx` | Public; redirects authenticated users to `/`. | `src/App.tsx`; `src/pages/Login.tsx` |
| `/onboarding` | `src/pages/Onboarding.tsx` | `ProtectedRoute`, intentionally not blocked by `FTXGate`. | `src/App.tsx`; `src/pages/Onboarding.tsx`; `src/components/FTXGate.tsx` |
| `/` | `src/pages/Dashboard.tsx` | `ProtectedRoute` + `FTXGate` + `Layout`. | `src/App.tsx`; `src/components/Layout.tsx` |
| `/friends` | `src/pages/Friends.tsx` | Protected. | `src/App.tsx`; `src/pages/Friends.tsx` |
| `/archive` | `src/pages/ArchivePage.tsx` | Protected. | `src/App.tsx`; `src/pages/ArchivePage.tsx` |
| `/profile/edit` | `src/pages/ProfileEdit.tsx` | Protected. | `src/App.tsx`; `src/pages/ProfileEdit.tsx` |
| `/rewards-store` | `src/pages/RewardsStorePage.tsx` | Protected. | `src/App.tsx`; `src/pages/RewardsStorePage.tsx` |
| `/my-rewards` | `src/pages/MyCollectedRewardsPage.tsx` | Protected. | `src/App.tsx`; `src/pages/MyCollectedRewardsPage.tsx` |
| `/issued` | `src/pages/IssuedPage.tsx` | Protected. | `src/App.tsx`; `src/pages/IssuedPage.tsx` |
| `*` | `Navigate` to `/` | Fallback redirect. | `src/App.tsx` |

`src/pages/MarketplacePage.tsx` exists as a placeholder but is not mounted in `src/App.tsx`.

### Runtime Entry Points

| Entry point | Purpose | Evidence |
|---|---|---|
| `index.html` | Browser HTML shell with `#root`, `#overlay-root`, logo favicon, Google Font links, and module script `/src/main.tsx?v=rev2`. | `index.html` |
| `src/main.tsx` | React `createRoot` bootstraps `<App />` under `StrictMode`. | `src/main.tsx` |
| `src/App.tsx` | Providers and routes: `SessionContextProvider`, `AuthProvider`, `ThemeProvider`, `UIProvider`, `Toaster`, `BrowserRouter`. | `src/App.tsx` |
| `src/lib/supabase.ts` | Creates typed Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, throws if missing. | `src/lib/supabase.ts` |

### API / Supabase Entry Points

| Entry point | Purpose | Evidence |
|---|---|---|
| Supabase REST/PostgREST | Direct `.from(...)` queries against `tasks`, `profiles`, `friendships`, `rewards_store`, `collected_rewards`, `user_credits`, `daily_mission_streaks`. | `src/domain/*.ts`; `src/hooks/*.ts`; `src/components/UserCredits.tsx`; `src/pages/Friends.tsx`; `src/pages/ProfileEdit.tsx` |
| Supabase RPC `approve_task` | Server-side task approval and credit award path. | `src/domain/missions.ts`; `src/hooks/useTasks.ts`; `supabase/migrations/20260109_approve_task_rpc_v3_no_streaks.sql` |
| Supabase RPC `purchase_reward` | Atomic reward purchase path used by current domain reward purchase. | `src/domain/rewards.ts`; `supabase/migrations/20260110_fix_purchase_reward_columns.sql`; `supabase/migrations/20260412100200_phase1_reward_and_rpc_hardening.sql` |
| Supabase RPC `create_reward_store_item` | Create reward with server-side validation/friendship checks. | `src/domain/rewards.ts`; `src/hooks/useCreateBounty.ts`; `supabase/migrations/20260412100200_phase1_reward_and_rpc_hardening.sql` |
| Supabase RPC `update_reward_store_item` | Update reward. | `src/domain/rewards.ts`; `src/hooks/useUpdateBounty.ts`; `supabase/migrations/20260412100200_phase1_reward_and_rpc_hardening.sql` |
| Supabase RPC `delete_reward_store_item` | Delete reward, including a newer cascade variant. | `src/domain/rewards.ts`; `src/hooks/useDeleteBounty.ts`; `supabase/migrations/20260109_delete_reward_with_cascade.sql`; `supabase/migrations/20260412100200_phase1_reward_and_rpc_hardening.sql` |
| Supabase RPC `complete_task_instance` | Recurring task completion RPC; no frontend caller found. | `supabase/migrations/20231117000000_complete_task_instance.sql`; no matching current app call in `src/` |
| Supabase Storage `bounty-proofs` | Mission proof uploads and deletion. | `src/hooks/useTasks.ts`; `src/domain/missions.ts` |
| Supabase Storage `avatars` | Profile/avatar upload. | `src/components/ProfileEditModal.tsx`; `src/pages/ProfileEdit.tsx` |
| Supabase Storage `reward-images` | Reward image upload helper. | `src/lib/rewardImageUpload.ts`; `src/components/CreateBountyModal.tsx`; `src/components/EditBountyModal.tsx` |
| Supabase Edge Function `notify-reward-creator` | Called after a successful reward purchase to send Resend email. | `src/hooks/useRewardsStore.ts`; `supabase/functions/notify-reward-creator/index.ts` |
| Supabase Edge Function `create-daily-tasks` | Intended scheduled worker for recurring contract instances. | `supabase/functions/create-daily-tasks/index.ts` |
| Supabase Edge Functions `send-new-bounty-alert`, `send-proof-submitted-alert` | Gmail/Nodemailer notification functions; no direct frontend invocation found in current source search. | `supabase/functions/send-new-bounty-alert/index.ts`; `supabase/functions/send-proof-submitted-alert/index.ts` |

### CLI / Build / Ops Entry Points

| Command or script | Purpose | Evidence |
|---|---|---|
| `npm run dev` | Start Vite dev server via `npx vite`. | `package.json` |
| `npm run build` | Type-check with `tsc`, then `vite build`. | `package.json` |
| `npm run lint` | Run ESLint over repo. | `package.json`; `eslint.config.js` |
| `npm run preview` | Serve built Vite output. | `package.json` |
| `powershell -ExecutionPolicy Bypass -File scripts/local/start_supabase.ps1` | Start local Supabase and show status. | `.vscode/tasks.json`; `scripts/local/start_supabase.ps1` |
| `scripts/local/load_schema.ps1` | Load `supabase/schema_all.sql` into local Postgres. | `scripts/local/load_schema.ps1`; `.vscode/tasks.json` |
| `scripts/local/seed_minimal.ps1` | Load `db/seeds/seed_minimal.sql`. | `scripts/local/seed_minimal.ps1`; `supabase/config.toml` |
| `scripts/local/apply_003_up.ps1`, `validate_003.ps1`, `apply_008_up.ps1`, `validate_008.ps1` | Apply/validate proposal SQL locally. | `scripts/local/*.ps1`; `db/proposals/*.sql` |
| `scripts/prod/backup_schema.ps1` | Prod schema backup via `pg_dump`; requires `PROD_CONFIRM=YES`. | `scripts/prod/backup_schema.ps1`; `.vscode/tasks.json` |
| `scripts/prod/apply_003_up.ps1`, `rollback_003.ps1`, `apply_008_up.ps1`, `validate_003.ps1`, `validate_008.ps1` | Production proposal apply/rollback/validate scripts; require `PROD_CONFIRM=YES`. | `scripts/prod/*.ps1` |
| `get-refresh-token.cjs` / `get-refresh-token.mjs` | Generate Gmail OAuth refresh token using `googleapis`. | `get-refresh-token.cjs`; `get-refresh-token.mjs`; `package.json` dependency `googleapis` |

## 5. Environment and Configuration Surface

### Configuration Files

| File | Purpose | Risk/notes |
|---|---|---|
| `.env.local` | Vite Supabase URL and anon key for a real-looking Supabase project. | High sensitivity operationally. The anon key is public by design but should still not be committed as local config; `.gitignore` ignores `*.local`, yet file exists in workspace. |
| `package.json` / `package-lock.json` | npm scripts, dependency manifest, lockfile. | Source of runtime/build dependency truth. |
| `vite.config.ts` | Vite config, React plugin, excludes `lucide-react` from optimizeDeps. | Low risk. |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | TypeScript project references and strict compiler options. | Low risk. |
| `eslint.config.js` | ESLint flat config; ignores `dist`, `src/types/database.ts`, `supabse/**`, `_archive/**`. | Medium: ignoring generated database types is common; ignoring typo folder/archive can hide stale code. |
| `tailwind.config.js`, `postcss.config.js`, `src/index.css` | Tailwind scanning/theme and global CSS/font/theme system. | Low/medium: `tailwind.config.js` defines duplicate `animation` keys, so one key may override the other. |
| `vercel.json` | SPA rewrite `/(.*)` to `/index.html`. | Low risk; deployment assumption. |
| `capacitor.config.ts` | Capacitor app id/name and `webDir: dist`. | Medium: imports `@capacitor/cli` type but package deps are absent from `package.json`; mobile build needs verification. |
| `supabase/config.toml` | Local Supabase ports, DB version, auth settings, seed path, edge runtime config. | Medium/high: local auth site URL is `http://127.0.0.1:3000` while Vite default is 5173; redirect config may be stale. |
| `.vscode/tasks.json`, `.vscode/settings.json`, `.vscode/extensions.json` | Local task shortcuts, Deno settings for functions, PATH assumptions. | Medium: hard-coded Windows/Scoop paths and prod task env confirmation. |
| `db/proposals/*.sql` | Proposed SQL hardening/rollback/validation files. | Medium/high: some are production-affecting; not all are Supabase CLI migrations. |
| `supabase/schema.sql`, `supabase/schema_all.sql`, `schema_backup_*` | Schema snapshots/backups. | Medium: snapshots can diverge from migrations; use with verification. |

### Environment Variables and Secrets

| Name | Referenced in | Apparent purpose | Required? | Sensitivity | Missing docs/risks |
|---|---|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local`; `src/lib/supabase.ts`; `docs/runbooks/LOCAL_DEV_RUNBOOK.md` | Browser Supabase project URL. | Required for app boot. | Medium | `src/lib/supabase.ts` throws if absent. Vite exposes it to client. |
| `VITE_SUPABASE_ANON_KEY` | `.env.local`; `src/lib/supabase.ts`; `docs/runbooks/LOCAL_DEV_RUNBOOK.md` | Browser Supabase anon key. | Required for app boot. | Medium | Public anon key but operationally sensitive; must rely on RLS. |
| `SUPABASE_URL` | `supabase/functions/*/index.ts`; docs/runbooks | Edge Function Supabase URL. | Required for edge functions that use Supabase. | Medium | Must be set as Supabase secret/env in function runtime. |
| `SUPABASE_ANON_KEY` | `supabase/functions/notify-reward-creator/index.ts` | Verifies requester JWT using anon client. | Required for `notify-reward-creator`. | Medium | Missing causes 500 in function. |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase/functions/notify-reward-creator/index.ts`; `supabase/functions/create-daily-tasks/index.ts`; `docs/runbooks/LOCAL_DEV_RUNBOOK.md` | Admin Supabase access and worker bearer secret. | Required for those functions. | High | Must never reach browser; `create-daily-tasks` compares request bearer token directly to this key. |
| `RESEND_API_KEY` | `supabase/functions/notify-reward-creator/index.ts`; runbook docs mention Resend. | Resend email API key. | Required for reward notification emails. | High | Function returns 503 if absent. |
| `RESEND_FROM_EMAIL` | `supabase/functions/notify-reward-creator/index.ts` | Sender address for Resend email. | Required for reward notification emails. | Medium | Not listed in older runbook env reference; add to env docs. |
| `SITE_URL` | `supabase/functions/send-new-bounty-alert/index.ts`; `supabase/functions/send-proof-submitted-alert/index.ts` | App URL used in email links. | Optional fallback defaults to empty string. | Low | Empty links possible if not configured. |
| `GMAIL_USER` | Gmail notification edge functions. | Gmail sender account. | Required for Gmail functions. | High | Gmail functions return 500 if missing. |
| `GMAIL_CLIENT_ID` | Gmail notification edge functions; hard-coded in `get-refresh-token.*`. | OAuth client id. | Required for Gmail functions/token helper. | Medium | Token helper contains hard-coded client id. |
| `GMAIL_CLIENT_SECRET` | Gmail notification edge functions; hard-coded in `get-refresh-token.*`. | OAuth client secret. | Required for Gmail functions/token helper. | High | `get-refresh-token.cjs` and `.mjs` contain a hard-coded secret. Rotate/verify exposure. |
| `GMAIL_REFRESH_TOKEN` | Gmail notification edge functions. | OAuth refresh token for Gmail SMTP. | Required for Gmail functions. | High | Helper prints token to console; ensure not logged/committed. |
| `PGPASSWORD` | `scripts/local/*.ps1`; `scripts/prod/*.ps1` | Postgres password for psql/pg_dump. | Required unless prompted. | High | Some local scripts set `PGPASSWORD = "postgres"` explicitly. Prod scripts prompt and clear. |
| `PROD_CONFIRM` | `scripts/prod/*.ps1`; `.vscode/tasks.json` | Safety gate for production scripts. | Required for prod scripts. | Low | `.vscode/tasks.json` sets it to `YES` for prod tasks, so clicking the task bypasses the manual env step. |
| `OPENAI_API_KEY` | `supabase/config.toml` under `[studio]` | Supabase Studio AI feature. | Optional for app. | High | Not app runtime. |
| `SENDGRID_API_KEY` | `supabase/config.toml` commented SMTP example; docs mention optional. | Possible auth SMTP provider. | Optional/commented. | High | Not used by current code. |
| `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN` | `supabase/config.toml` Twilio SMS config. | SMS auth token if enabled. | Optional; SMS disabled. | High | Not used currently. |
| `S3_HOST`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | `supabase/config.toml` experimental OrioleDB/S3 config. | Experimental local Supabase config. | Optional. | High for keys | Not app runtime. |

## 6. Dependency Map

### Core Runtime Dependencies

| Dependency | Likely use | Evidence |
|---|---|---|
| `react`, `react-dom` | SPA rendering and components. | `package.json`; `src/main.tsx`; components under `src/` |
| `react-router-dom` | Client-side routing/navigation. | `package.json`; `src/App.tsx`; `src/components/Layout.tsx`; `src/pages/Login.tsx` |
| `@supabase/supabase-js` | Database/auth/storage/functions/realtime client. | `package.json`; `src/lib/supabase.ts`; widespread imports |
| `@supabase/auth-helpers-react` | Supabase session context and hooks. | `package.json`; `src/App.tsx`; `src/hooks/useCreateBounty.ts`; `src/components/UserCredits.tsx` |
| `react-hot-toast` | Toast notifications. | `package.json`; `src/App.tsx`; `src/context/AuthContext.tsx`; hooks/pages |

### UI Dependencies

| Dependency | Likely use | Evidence |
|---|---|---|
| `lucide-react` | Icons throughout UI. | `package.json`; imports in `src/components/Layout.tsx`, `src/pages/Login.tsx`, `src/pages/Friends.tsx`, etc. |
| `i18next`, `react-i18next`, `i18next-browser-languagedetector` | Internationalization. | `package.json`; `src/i18n/index.ts`; `src/components/LanguageSwitcher.tsx` |
| `react-dropzone` | Drag/drop file upload UI. | `package.json`; imports in `src/components/ProofModal.tsx` and related upload components |
| `react-simple-pull-to-refresh` | Pull-to-refresh on dashboard. | `package.json`; import in `src/pages/Dashboard.tsx` |
| `clsx`, `tailwind-merge` | Class merging utility. | `package.json`; `src/lib/utils.ts` |

### Backend/API Dependencies

| Dependency | Likely use | Evidence |
|---|---|---|
| `googleapis` | Local Gmail OAuth refresh token helper only. | `package.json`; `get-refresh-token.cjs`; `get-refresh-token.mjs` |
| Supabase Edge runtime remote imports | Serverless functions use Deno `serve`, Supabase JS, Nodemailer from esm.sh. | `supabase/functions/*/index.ts`; `.vscode/settings.json` enables Deno paths |

### Database/Storage/Auth Dependencies

| Dependency | Likely use | Evidence |
|---|---|---|
| Supabase CLI package `supabase` | Local CLI and migration/function workflows. | `package.json` devDependency; `scripts/local/start_supabase.ps1`; `supabase/config.toml` |
| Postgres CLI tools (`psql`, `pg_dump`) | Apply/validate SQL and backup schemas. | `scripts/local/*.ps1`; `scripts/prod/*.ps1`; `.vscode/settings.json` PATH |

### AI/Media/Generation Dependencies

No AI generation runtime dependencies found. Media-related runtime code is storage upload plus local audio/font assets.

### Dev/Test/Build Dependencies

| Dependency | Use | Evidence |
|---|---|---|
| `vite`, `@vitejs/plugin-react` | Dev server and production build. | `package.json`; `vite.config.ts` |
| `typescript` | Type checking. | `package.json`; `tsconfig*.json`; `npm run build` |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals` | Linting. | `package.json`; `eslint.config.js` |
| `tailwindcss`, `postcss`, `autoprefixer` | CSS build pipeline. | `package.json`; `tailwind.config.js`; `postcss.config.js`; `src/index.css` |

### Suspicious, Unused, Duplicate, or Heavy Dependencies

| Dependency/material | Concern | Evidence |
|---|---|---|
| `animejs` | No import found in current `src/` import inventory. | `package.json`; `Select-String "^import"` output |
| `react-confetti` | Type declaration exists, but no import found in current source inventory. | `package.json`; `src/react-confetti.d.ts`; import inventory |
| `react-currency-input-field` | No import found in current source inventory. | `package.json`; import inventory |
| `react-hook-form` | No import found in current source inventory. | `package.json`; import inventory |
| `react-swipeable` | No import found in current source inventory. | `package.json`; import inventory |
| `@types/react-dropzone` | React Dropzone has modern bundled TS types; separate `@types/react-dropzone` may be obsolete. NEEDS VERIFICATION. | `package.json`; `react-dropzone` package |
| `googleapis` | Used only by token helper scripts and brings many transitive deps into frontend repo. | `package.json`; `get-refresh-token.*` |
| Public sound/font assets | Large asset surface; many variants may be unused. | `public/sounds/*`; `public/fonts/*`; `src/utils/soundManager.ts`; `src/index.css` |
| `node_modules_old/` | Old dependency directory checked/tracked or present in workspace. | `git ls-files`; top-level directory listing |
| Capacitor config/iOS project without npm Capacitor deps | `capacitor.config.ts` imports `@capacitor/cli` type, but `package.json` has no `@capacitor/*`. | `capacitor.config.ts`; `package.json`; `package-lock.json` search |

## 7. Known Commands

| Command | Found in | Purpose | Safe to run? | Probably validates |
|---|---|---|---|---|
| `npm install` | `docs/runbooks/LOCAL_DEV_RUNBOOK.md`; implied by `package-lock.json` | Install dependencies. | Usually safe; modifies `node_modules`/lock if versions drift. | Dependency installability. |
| `npm run dev` | `package.json`; runbook | Start Vite dev server. | Safe. | Frontend can boot with env vars. |
| `npm run build` | `package.json`; runbook | Run `tsc && vite build`. | Safe but writes `dist/`. | TypeScript correctness and production build. |
| `npm run lint` | `package.json`; runbook | Run ESLint. | Safe. | Lint rules over non-ignored source. |
| `npm run preview` | `package.json` | Preview `dist/`. | Safe after build. | Built app serving. |
| `npx eslint . --fix` | `docs/runbooks/LOCAL_DEV_RUNBOOK.md` | Auto-fix lint issues. | Not safe for this documentation-only task; modifies code. | Lint auto-fixability. |
| `supabase start` | `docs/runbooks/LOCAL_DEV_RUNBOOK.md`; `scripts/local/start_supabase.ps1` | Start local Supabase Docker stack. | Safe-ish; requires Docker and may use local ports. | Local backend availability. |
| `supabase status` | `scripts/local/start_supabase.ps1` | Show local Supabase status. | Safe. | Local service ports/keys. |
| `supabase link --project-ref <ref>` | runbook | Link CLI to Supabase project. | Medium; writes local Supabase state. | CLI remote project linkage. |
| `supabase db pull` | runbook | Pull remote schema. | Medium; can create migration files. | Remote/local schema drift. |
| `supabase db push` | runbook | Push migrations to remote. | Potentially unsafe; changes DB. | Migration application. |
| `supabase db reset` | runbook | Reset local database. | Destructive locally. | Full migration/seed replay. |
| `supabase db dump --schema public > schema.sql` | runbook | Dump schema. | Safe read-only if credentials correct. | Current DB schema snapshot. |
| `supabase functions deploy notify-reward-creator --no-verify-jwt` | runbook | Deploy edge function. | Production-affecting. | Edge function deployment. |
| `supabase secrets set RESEND_API_KEY=...` | runbook | Configure edge secret. | Production-affecting. | Email provider config. |
| `curl ... /functions/v1/notify-reward-creator` | runbook | Test edge function. | Safe against test data; sends email if configured. | Function auth/payload/email behavior. |
| `powershell -ExecutionPolicy Bypass -File scripts/local/load_schema.ps1` | `.vscode/tasks.json`; script | Load `supabase/schema_all.sql` locally. | Destructive/DB-writing. | Local schema load. |
| `powershell -ExecutionPolicy Bypass -File scripts/local/seed_minimal.ps1` | `.vscode/tasks.json`; script | Seed minimal local data. | DB-writing. | Seed data application. |
| `powershell -ExecutionPolicy Bypass -File scripts/local/apply_003_up.ps1` | `.vscode/tasks.json`; script | Apply `db/proposals/003_rls_collected_rewards.up.sql` locally. | DB-writing. | Collected rewards RLS/unique constraint proposal. |
| `powershell -ExecutionPolicy Bypass -File scripts/local/validate_003.ps1` | `.vscode/tasks.json`; script | Validate proposal 003 locally. | Read-only validation. | RLS enabled, policies present, unique constraint exists. |
| `powershell -ExecutionPolicy Bypass -File scripts/local/apply_008_up.ps1` | script | Apply `db/proposals/008_atomic_purchase.up.sql`. | DB-writing. | Atomic purchase/negative balance hardening. |
| `powershell -ExecutionPolicy Bypass -File scripts/local/validate_008.ps1` | script | Run `db/proposals/008_validation.sql`. | Read-only validation. | Atomic purchase hardening state. |
| `powershell -ExecutionPolicy Bypass -File scripts/prod/backup_schema.ps1` | `.vscode/tasks.json`; script | Run prod `pg_dump` schema backup. | Read-only but production credentials. | Production schema snapshot. |
| `powershell -ExecutionPolicy Bypass -File scripts/prod/apply_003_up.ps1` | `.vscode/tasks.json`; script | Apply proposal 003 to production. | Production DB-writing; high caution. | Production RLS/constraint migration. |
| `powershell -ExecutionPolicy Bypass -File scripts/prod/rollback_003.ps1` | `.vscode/tasks.json`; script | Roll back proposal 003 in production. | Production DB-writing/destructive. | Rollback ability. |
| `node get-refresh-token.cjs` / `node get-refresh-token.mjs` | helper scripts | Generate Gmail OAuth refresh token. | Sensitive; opens OAuth flow and prints token. | Gmail OAuth credentials/scopes. |

No `Makefile`, Dockerfile, GitHub Actions workflow, or automated test command was found in tracked app files during inspection.

## 8. Documentation Quality

### Already Well Documented

| Area | Evidence |
|---|---|
| Product concept and roles | `docs/overview.md`, `docs/PRODUCT_VISION_V1.md` |
| Frontend architecture/design intent | `docs/ARCHITECTURE_FRONTEND.md`, `docs/DESIGN_V1_BRIEF.md`, `docs/REALITY_SYNC_P1_P6.md` |
| Backend/API/data model overview | `docs/architecture.md`, `docs/api-map.md`, `docs/data-model.md`, `docs/state-and-events.md` |
| Manual local/prod operations | `docs/runbooks/LOCAL_DEV_RUNBOOK.md`, `docs/runbooks/PROD_RUNBOOK_003.md` through `PROD_RUNBOOK_008.md` |
| Historical QA/status | `docs/V1_TESTING_CHECKLIST.md`, `docs/V1_TESTING_RESULTS_*.md`, `docs/test-runs/*`, `docs/history/*` |
| SQL proposal trail | `db/proposals/*.md`, `docs/proposals/PROPOSAL_008_SUMMARY.md`, `docs/sql-inventory/*` |

### Missing or Weak Documentation

| Gap | Evidence |
|---|---|
| No `.env.example` for current complete env surface. | `.env.local` exists; no `.env.example` in file inventory; current edge function needs `RESEND_FROM_EMAIL` beyond older docs. |
| No automated test documentation because no automated tests exist. | `package.json` has no `test` script; runbook says no tests configured. |
| Current Supabase function deployment matrix is incomplete. | Runbook focuses on `notify-reward-creator`; functions also exist at `create-daily-tasks`, `send-new-bounty-alert`, `send-proof-submitted-alert`. |
| Storage buckets are manually documented but not codified. | `src/lib/rewardImageUpload.ts` references `reward-images`; runbook discusses `bounty-proofs` and `avatars`; `supabase/config.toml` has no bucket definitions. |
| Mobile/iOS setup may be outdated. | `docs/ios/SETUP.md`, `ios/`, `capacitor.config.ts`, but no Capacitor deps in `package.json`. |
| Current auth mode is underdocumented. | `src/pages/Login.tsx` supports Google, email/password, and magic link; older docs often describe magic link only or original Google-only expectations. |

### Appears Outdated or Contradictory

| Document/claim | Current conflicting evidence |
|---|---|
| `docs/overview.md` and `docs/architecture.md` describe `notify-reward-creator` email as mocked. | Current `supabase/functions/notify-reward-creator/index.ts` calls Resend and fails if `RESEND_API_KEY`/`RESEND_FROM_EMAIL` are absent. |
| Older docs emphasize placeholder `YYYYMMDDHHMMSS_*` migrations. | Current `supabase/migrations/` listing contains dated `2026*` hardening migrations; placeholder files appear deleted in current `git status` and backed up under `supabase/migrations.bak/_placeholders/`. |
| Older docs flag direct client credit grant via `increment_user_credits`. | Current `src/domain/credits.ts` disables `grantCredits`; current `src/domain/missions.ts` and `src/hooks/useTasks.ts` use `approve_task`; `supabase/migrations/20260412100100_lock_down_increment_user_credits.sql` revokes `authenticated` and grants only `service_role`. NEEDS VERIFICATION against production DB. |
| `docs/architecture.md` route table omits `/onboarding` and `FTXGate` details in some snippets. | `src/App.tsx`, `src/lib/ftxGate.ts`, `src/pages/Onboarding.tsx`. |
| `docs/runbooks/LOCAL_DEV_RUNBOOK.md` says Vite local URL is 5173; `supabase/config.toml` auth site URL is `http://127.0.0.1:3000`. | `docs/runbooks/LOCAL_DEV_RUNBOOK.md`; `supabase/config.toml`. |
| `docs/overview.md` says `MyCollectedRewardsPage` is a stub. | Current `src/pages/RewardsStorePage.tsx` has a `collected` tab and `src/hooks/useCollectedRewards.ts`; `src/pages/MyCollectedRewardsPage.tsx` still needs direct inspection for completeness, so mark NEEDS VERIFICATION. |

### Future Documentation Should Cover

- A canonical "current architecture" replacing or versioning older 2025 docs against the 2026 migration/function state.
- Exact Supabase production state: applied migrations, active RLS policies, bucket policies, edge secrets, deployed function list.
- Auth configuration: Google provider, email/password, magic link, redirect URLs, and local/prod mismatch resolution.
- Data model truth: reconcile `schema.sql`, `schema_all.sql`, current migrations, generated `src/types/database.ts`, and live Supabase.
- Operational risk guide for `scripts/prod/*.ps1`, including when not to run proposal scripts.
- Dependency cleanup report for unused/heavy packages and assets.

## 9. Open Questions

| Question | Why it matters | Evidence |
|---|---|---|
| Which database artifact is the source of truth: migrations, `schema.sql`, `schema_all.sql`, or live Supabase? | Architecture review needs accurate schema/RLS/RPC state. | `supabase/migrations/*.sql`; `supabase/schema.sql`; `supabase/schema_all.sql`; schema backups |
| Are the 2026 hardening migrations applied to production? | Current code assumes secure `approve_task`/`purchase_reward` flows; production may lag. | `supabase/migrations/20260412100100_lock_down_increment_user_credits.sql`; `20260412100200_phase1_reward_and_rpc_hardening.sql`; `scripts/prod/*.ps1` |
| Is Google OAuth configured in Supabase production? | Login primary button uses Google OAuth. | `src/pages/Login.tsx`; `supabase/config.toml` external provider examples do not show Google enabled |
| Should email notifications use Resend, Gmail/Nodemailer, or both? | There are three notification edge functions with two email providers. | `supabase/functions/notify-reward-creator/index.ts`; `send-new-bounty-alert/index.ts`; `send-proof-submitted-alert/index.ts`; `get-refresh-token.*` |
| Are `send-new-bounty-alert` and `send-proof-submitted-alert` deployed/called? | No frontend invocation found; schema has `notify_new_bounty` trigger with `net.http_post`. | `supabase/functions/send-*/index.ts`; `supabase/schema.sql`; `Select-String` API inventory |
| Are recurring contracts active or abandoned? | Function uses `recurring_contract_templates` and `recurring_contract_instances`; migrations use `recurring_task_instances`; naming mismatch suggests drift. | `supabase/functions/create-daily-tasks/index.ts`; `supabase/migrations/20250615224500_create_or_update_recurring_task_instances.sql`; `supabase/migrations/20231117000000_complete_task_instance.sql` |
| Are storage buckets `bounty-proofs`, `avatars`, and `reward-images` present with correct policies? | Uploads fail or expose data if buckets/policies are wrong. | `src/hooks/useTasks.ts`; `src/components/ProfileEditModal.tsx`; `src/lib/rewardImageUpload.ts`; `docs/runbooks/LOCAL_DEV_RUNBOOK.md` |
| Should `marketplace_bounties` / `collected_bounties` still exist? | They appear legacy/duplicate relative to `rewards_store` / `collected_rewards`. | `supabase/schema.sql`; `db/proposals/006_rls_unused_tables.*`; `supabase/migrations/20260109_cleanup_legacy_bounty_tables.sql`; no current source usage found |
| Is `src/types/database.ts` generated from current live schema? | Type safety and RPC names depend on it; code uses casts where types are incomplete. | `src/types/database.ts`; `src/domain/rewards.ts`; `src/hooks/useRewardsStore.ts`; `eslint.config.js` ignores database types |
| What is the intended local dev port for auth redirects? | Vite defaults to 5173, Supabase config uses 3000. | `package.json`; `docs/runbooks/LOCAL_DEV_RUNBOOK.md`; `supabase/config.toml` |
| Should iOS/Capacitor remain supported? | Native project exists but package dependencies appear absent. | `ios/`; `docs/ios/SETUP.md`; `capacitor.config.ts`; `package.json` |
| Why is `.env.local` present in the workspace with a real Supabase URL/key despite `.gitignore`? | Secret hygiene and environment reproducibility. | `.env.local`; `.gitignore` |
| Should hard-coded Google OAuth client secret in `get-refresh-token.*` be rotated/removed? | It is high-sensitivity material in source files. | `get-refresh-token.cjs`; `get-refresh-token.mjs` |
| Should `node_modules_old/`, `dist/`, `_archive/`, and typo `supabse/` be cleaned or documented as archive? | Reduces confusion for future agents and audits. | Top-level listing; `git ls-files`; `eslint.config.js`; `git status --short` |

## 10. Suggested Next Documentation Passes

| Priority | Documentation pass | Scope and concrete files to inspect |
|---|---|---|
| 1 | Live Supabase schema/RLS/RPC truth table | Compare `supabase/migrations/*.sql`, `supabase/schema.sql`, `supabase/schema_all.sql`, `src/types/database.ts`, and live `pg_dump` output from `scripts/prod/backup_schema.ps1` if authorized. |
| 2 | Auth and onboarding architecture | Document `src/pages/Login.tsx`, `src/context/AuthContext.tsx`, `src/lib/profileBootstrap.ts`, `src/lib/ftxGate.ts`, `src/pages/Onboarding.tsx`, Supabase auth settings in `supabase/config.toml`. |
| 3 | Mission lifecycle map | Trace `src/pages/Dashboard.tsx`, `src/pages/IssuedPage.tsx`, `src/components/TaskCard.tsx`, `src/hooks/useTasks.ts`, `src/domain/missions.ts`, `src/core/contracts/*`, `approve_task` migrations. |
| 4 | Reward economy and credit integrity | Trace `src/pages/RewardsStorePage.tsx`, `src/components/RewardCard.tsx`, `src/hooks/useRewardsStore.ts`, `src/domain/rewards.ts`, `src/domain/credits.ts`, `purchase_reward` and `increment_user_credits` migrations. |
| 5 | Storage and media security | Document file validation and bucket policies for `src/lib/rewardImageUpload.ts`, `src/components/ProfileEditModal.tsx`, `src/hooks/useTasks.ts`, `src/domain/missions.ts`, and Supabase bucket setup. |
| 6 | Notification subsystem | Resolve Resend vs Gmail functions: `notify-reward-creator`, `send-new-bounty-alert`, `send-proof-submitted-alert`, `get-refresh-token.*`, and any database trigger calling HTTP via `net.http_post` in `supabase/schema.sql`. |
| 7 | Dependency and asset audit | Check usage of all `package.json` deps, `public/sounds/*`, `public/fonts/*`, `logo*.png`, `node_modules_old/`, and Capacitor/iOS state. |
| 8 | Test strategy bootstrap document | Define recommended Vitest/React Testing Library/Playwright coverage for domain functions, hooks, critical flows, and Supabase integration mocks because `package.json` has no test framework. |
| 9 | Ops runbook refresh | Update `docs/runbooks/LOCAL_DEV_RUNBOOK.md` and prod runbooks with 2026 migrations, current edge secrets (`RESEND_FROM_EMAIL`), local port alignment, and script safety. |
| 10 | Code ownership map | Identify module owners/boundaries for `src/core`, `src/domain`, `src/hooks`, `src/components`, and `supabase` to guide future refactors. |
