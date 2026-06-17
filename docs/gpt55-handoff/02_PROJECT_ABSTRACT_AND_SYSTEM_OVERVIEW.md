# 1. Executive Abstract

Bounty Hunter is a React/Vite/Supabase application for small private groups to turn asks, chores, favors, and promises into a gamified loop of missions, proof, approval, credits, and rewards. The repository name and older docs use "bounty" language, while current UI code increasingly frames the product as a themeable "missions and rewards" engine for guild/friend groups, families, and couples.

The core problem it solves appears to be informal accountability inside close relationships: someone asks another person to do something, the assignee completes it, proof can be submitted, the issuer approves or rejects it, and credits earned through approved work can be spent on personalized rewards. This is supported by the `tasks`, `friendships`, `user_credits`, `rewards_store`, and `collected_rewards` tables typed in `src/types/database.ts`, the route structure in `src/App.tsx`, and the product framing in `docs/PRODUCT_VISION_V1.md`.

The intended users appear to be small trusted groups rather than public marketplaces: friends/crews, families, and couples. This is visible in `src/theme/themes.ts`, `src/context/ThemeContext.tsx`, and UI copy under `src/i18n/locales/en/translation.json`. Each mode changes language, not the underlying engine: guild mode talks about missions, bounties, crew, and loot; family mode talks about chores, rewards, and family; couple mode talks about requests, gifts, tokens, and partner.

The main journey is: authenticate, complete or create onboarding, invite/connect with another user, create a mission for that user, assignee sees it in the inbox, assignee submits proof or directly submits for review, creator approves or rejects, credits are awarded, and the assignee claims a reward from the store. The implemented route map is in `src/App.tsx`: `/login`, `/onboarding`, `/`, `/issued`, `/friends`, `/rewards-store`, `/my-rewards`, `/archive`, and `/profile/edit`.

The system currently implements authentication, profile bootstrapping/editing, mode/theme selection, onboarding, friends/invites, mission inbox, issued mission management, proof upload, approval/rejection, credit balances, reward creation/edit/delete/claim, collected rewards inside the store tab, archived tasks, Supabase storage usage, Supabase realtime for friendships, and several Edge Function email-notification paths.

INFERENCE: The product probably wants to become a polished mobile-friendly social productivity app where a tiny group can maintain a shared symbolic economy of effort and gratitude. Evidence: Capacitor/iOS scaffolding (`capacitor.config.ts`, `ios/`), first-time experience (`src/components/FTXGate.tsx`, `src/pages/Onboarding.tsx`), theme modes, reward-image upload (`src/lib/rewardImageUpload.ts`), product vision docs, and repeated mobile/modal hardening comments across components.

# 2. Product Narrative

Bounty Hunter lets people in a trusted group create small "missions" for each other and attach a reward. The assignee opens their inbox, sees what needs doing, completes the work, and either submits proof or marks it ready for review. The issuer then approves or rejects it. Approval completes the mission and awards credits when the mission reward is credit-based. Credits can be spent in a store of personalized rewards created by other users.

Main user types:

- Mission issuer: creates tasks for others, reviews proof, approves/rejects, deletes or edits created missions. Implemented mainly in `src/pages/IssuedPage.tsx`, `src/components/TaskForm.tsx`, `src/domain/missions.ts`, and `src/hooks/useIssuedContracts.ts`.
- Mission assignee: receives assigned missions, submits proof or no-proof review, archives completed items. Implemented mainly in `src/pages/Dashboard.tsx`, `src/components/TaskCard.tsx`, `src/components/ProofModal.tsx`, and `src/hooks/useAssignedContracts.ts`.
- Reward creator: creates, edits, deletes store rewards assigned to friends/partner. Implemented in `src/pages/RewardsStorePage.tsx`, `src/components/CreateBountyModal.tsx`, `src/components/EditBountyModal.tsx`, `src/hooks/useCreateBounty.ts`, `src/hooks/useUpdateBounty.ts`, and `src/hooks/useDeleteBounty.ts`.
- Reward collector: claims assigned rewards using credits and views collected rewards in the store's collected tab. Implemented in `src/hooks/usePurchaseBounty.ts`, `src/domain/rewards.ts`, `src/hooks/useCollectedRewards.ts`, and `src/components/RewardCard.tsx`.
- Group/relationship manager: invites friends, accepts/rejects requests, removes friends, and in couple mode selects a partner. Implemented in `src/pages/Friends.tsx`, `src/hooks/useFriends.ts`, `src/hooks/usePartnerState.ts`, and `src/components/FriendSelector.tsx`.

Main jobs-to-be-done:

- "Create an ask for someone and attach a meaningful reward or credit amount."
- "Know what I need to do now."
- "Submit proof that I did the thing."
- "Approve completion and award credits."
- "Spend credits on rewards someone created for me."
- "Invite and manage the trusted people who can participate."
- "Switch the app language/metaphor to fit friends, family, or partner use."

Core flows:

- Authentication and profile setup: Supabase auth in `src/pages/Login.tsx`, profile bootstrapping in `src/context/AuthContext.tsx` and `src/lib/profileBootstrap.ts`, profile editing in `src/pages/ProfileEdit.tsx` and `src/components/ProfileEditModal.tsx`.
- First-time experience: `src/components/FTXGate.tsx` gates protected routes using `src/lib/ftxGate.ts`; `src/pages/Onboarding.tsx` currently runs a 3-step wizard: choose mode, invite someone, learn how missions work.
- Mission inbox: `src/pages/Dashboard.tsx` groups assigned tasks into "Do this now", "Waiting for approval", and "Recently completed".
- Issued missions: `src/pages/IssuedPage.tsx` groups created tasks into pending/open, ready for review, and completed.
- Rewards store: `src/pages/RewardsStorePage.tsx` has tabs for available, created, and collected rewards.
- Friends/partner management: `src/pages/Friends.tsx` has normal friends UI for guild/family modes and special partner-selection UI for couple mode.

Value proposition:

- It makes informal effort visible and trackable.
- It gives lightweight proof/approval to trusted asks.
- It gives credits a concrete purpose through custom rewards.
- It lets the same engine feel appropriate for friend groups, families, or couples through theme strings.

Important product metaphors and naming conventions:

- Mission/contract/task are mostly the same backend entity: rows in `tasks`.
- Bounty/reward/gift/loot are mostly the same reward-store concept: rows in `rewards_store`.
- Guild/family/partner are mode-specific labels for trusted people.
- Credits/tokens are the internal currency in `user_credits`.
- Proof is a file or text note attached to a task through `proof_url`, `proof_type`, and `proof_description`.
- "FTX" means first-time experience, not finance: `src/lib/ftxGate.ts`.

Visible business logic:

- Users must authenticate before protected routes render (`ProtectedRoute` in `src/App.tsx`).
- Onboarding is shown if localStorage lacks `bounty_onboarding_completed` and the user has no tasks or rewards (`src/lib/ftxGate.ts`).
- Mission creation requires an assignee selected from accepted friends through `TaskForm` and `useFriends`.
- Couple mode auto-selects and locks the partner in `src/components/FriendSelector.tsx` when `profile.partner_user_id` is present.
- Assignees submit tasks to `review`; creators approve/reject review tasks through `approveMission`/`rejectMission` in `src/domain/missions.ts`.
- `approveMission` calls the `approve_task` RPC; migration `supabase/migrations/20260109_approve_task_rpc_v3_no_streaks.sql` makes approval atomic and awards credit through server-side `increment_user_credits`.
- Reward creation uses `create_reward_store_item`, which in `supabase/migrations/20260412100200_phase1_reward_and_rpc_hardening.sql` requires an accepted friendship for assigned rewards.
- Reward purchase uses `purchase_reward`, which validates authenticated collector, active reward, non-self-purchase, sufficient credits, duplicate collection, credit deduction, collection insert, and reward deactivation.

# 3. Current Feature Map

| Feature | User-facing purpose | Main route/component/API/model | Status | Notes |
|---|---|---|---|---|
| Authentication | Sign up/sign in before using app | `/login`, `src/pages/Login.tsx`, Supabase Auth | Implemented | Supports Google OAuth, email/password, and magic link in code. Supabase local config has email confirmations disabled in `supabase/config.toml`. |
| Protected routing | Keep main app behind auth | `src/App.tsx`, `ProtectedRoute`, `AuthProvider` | Implemented | `FTXGate` wraps main layout after auth. |
| Profile bootstrap | Ensure profile row exists for auth user | `src/context/AuthContext.tsx`, `src/lib/profileBootstrap.ts`, `profiles` | Implemented | Client-side bootstrap handles missing profile. DB trigger also exists in schema exports, but current code does not rely solely on it. |
| Profile edit | Edit display name/avatar, system status, theme | `/profile/edit`, `src/pages/ProfileEdit.tsx`, `src/components/ProfileEditModal.tsx`, `avatars` bucket | Implemented | There are two profile edit surfaces with overlapping responsibilities: page and modal. |
| Theme/mode system | Switch app language among guild/family/couple | `src/theme/themes.ts`, `src/context/ThemeContext.tsx`, `src/hooks/useThemeStrings.ts` | Implemented | Stored in localStorage key `bounty_theme`; not persisted to DB. |
| First-time experience gate | Redirect new users to onboarding | `src/components/FTXGate.tsx`, `src/lib/ftxGate.ts` | Implemented | Uses localStorage plus existence of tasks/rewards. |
| Onboarding wizard | Guide new user through setup | `/onboarding`, `src/pages/Onboarding.tsx`, `src/components/onboarding/*` | Partial | Current code has 3 steps. Older docs describe 4 steps including reward/mission creation; comments say reward/mission steps were removed to reduce friction. |
| Mission inbox | Show assigned work and next actions | `/`, `src/pages/Dashboard.tsx`, `useAssignedContracts`, `TaskCard`, `tasks` | Implemented | Groups by active/review/completed and includes issued summary plus store prompt. |
| Issued mission management | Create, edit, delete, approve, reject missions | `/issued`, `src/pages/IssuedPage.tsx`, `TaskForm`, `ConfirmDeleteModal`, `approve_task` RPC | Implemented | Uses direct Supabase insert/update/delete for task CRUD and domain RPC for approval. |
| Mission card/modal | Inspect mission details and act | `src/components/TaskCard.tsx`, `src/components/modals/MissionModalShell.tsx` | Implemented | Collapsed card opens portal modal; role/state controls actions. |
| Proof submission | Submit file or text proof | `src/components/ProofModal.tsx`, `src/domain/missions.ts`, `bounty-proofs` bucket | Implemented | UI says PNG/JPG/PDF, domain upload accepts image/video; mismatch should be reviewed. |
| No-proof completion | Submit task for review without proof | `src/domain/missions.ts::submitForReviewNoProof`, `Dashboard.tsx` | Implemented | Applies when `proof_required !== true`; status moves to `review`. |
| Mission approval | Complete reviewed task and award credits | `src/domain/missions.ts::approveMission`, `approve_task` RPC | Implemented | Current migration path hardens idempotency and avoids client credit minting. |
| Mission rejection | Reset reviewed task to pending and clear proof | `src/domain/missions.ts::rejectMission`, `IssuedPage.tsx` | Implemented | Sets status to `pending`; no visible feedback field is stored. |
| Archive/history | Move completed tasks to archive and view history | `/archive`, `src/pages/ArchivePage.tsx`, `archiveMission`, `useArchivedContracts` | Partial | Nav hides history in `Layout.tsx`; route still exists. Archive query only fetches tasks assigned to current user. |
| Friends/invites | Search users, send/accept/reject/cancel invites, remove friends | `/friends`, `src/pages/Friends.tsx`, `useFriends`, `friendships` | Implemented | Search placeholder says username/name; actual query searches `display_name`, not email in the active page search. |
| Couple partner selection | Pick one accepted friend as partner | `/friends`, `usePartnerState`, `AuthContext.setPartner`, `profile.partner_user_id` | Partial/unclear | Code uses `partner_user_id`, but no migration/schema entry was found. `src/types/custom.ts` extends profile manually. |
| Rewards store | Browse rewards assigned to me, created by me, collected by me | `/rewards-store`, `RewardsStorePage`, `RewardCard`, `rewards_store` | Implemented | Store page has available/created/collected tabs. |
| Reward creation | Create personalized reward for friend/partner | `CreateBountyModal`, `FriendSelector`, `useCreateBounty`, `create_reward_store_item` | Implemented | Normal RPC requires accepted friendship. |
| Reward editing | Edit reward details/image/cost | `EditBountyModal`, `useUpdateBounty`, `update_reward_store_item` | Implemented | Uses legacy `p_bounty_id` arg for reward id. |
| Reward deletion | Delete reward and dependent collections | `useDeleteBounty`, `delete_reward_store_item` | Implemented | Current hardening migration deletes dependent `collected_rewards` first. |
| Reward purchase/claim | Spend credits to claim assigned reward | `usePurchaseBounty`, `domain/rewards.purchaseReward`, `purchase_reward` RPC | Implemented | Uses atomic RPC in newer migrations; `purchase_bounty` remains in generated types as legacy. |
| Collected rewards page | Standalone page for collected rewards | `/my-rewards`, `src/pages/MyCollectedRewardsPage.tsx` | Mocked/partial | Page only says under construction. Collected rewards are actually visible inside store tab. |
| User credits display | Show current balance in nav/store | `UserCredits`, `useUserCredits`, `user_credits` | Implemented | Header component likely has realtime; hook uses manual fetch/upsert. |
| Reward image upload | Upload images for reward cards | `src/lib/rewardImageUpload.ts`, `reward-images` bucket | Partial/unclear | Code uses `reward-images` bucket. Schema exports found `bounty-proofs` and `avatars` policies, not reward-images bucket setup. |
| Avatar upload | Upload profile picture | `ProfileEdit.tsx`, `ProfileEditModal.tsx`, `avatars` bucket | Implemented | Uses public URL and cache busting based on profile updated time. |
| Email notification on reward claim | Notify reward creator when claimed | `supabase/functions/notify-reward-creator/index.ts`, Resend | Partial | Code now calls Resend if env vars exist; returns 503 if provider not configured. |
| Other email alerts | New bounty/proof submitted notification | `supabase/functions/send-new-bounty-alert`, `send-proof-submitted-alert` | Legacy/unclear | These use Gmail OAuth/nodemailer and routes like `/dashboard/bounties/...` that do not match current SPA routes. |
| Daily missions/streaks | Daily recurring/streak behavior | `tasks.is_daily`, `daily_mission_streaks`, `useDailyMissionStreak`, core domain | Partial/legacy | Migrations and hooks exist, but current `approve_task` v3 explicitly removed streak writes. `TaskForm.tsx` current visible form does not show daily checkbox despite older docs saying it did. |
| Internationalization | English/German translations | `src/i18n/index.ts`, `src/i18n/locales/*` | Implemented | Some hard-coded English remains in pages/components. |
| Mobile shell | Mobile menu, pull-to-refresh, Capacitor/iOS | `Layout.tsx`, `UIContext`, `react-simple-pull-to-refresh`, `capacitor.config.ts`, `ios/` | Implemented/partial | Many comments show mobile modal fixes; no automated mobile QA found. |
| Sound and visual effects | Make app feel game-like | `src/utils/soundManager.ts`, `public/sounds`, `CursorTrail`, `Coin` components | Implemented | Decorative but product-relevant to gamified feel. |

# 4. User Journey Map

## Signup/login flow

- Starting route: `/login`.
- Important UI components: `src/pages/Login.tsx`, `AuthProvider` in `src/context/AuthContext.tsx`.
- API calls: `supabase.auth.signUp`, `supabase.auth.signInWithPassword`, `supabase.auth.signInWithOAuth({ provider: 'google' })`, `supabase.auth.signInWithOtp`, `supabase.auth.getSession`, `supabase.auth.onAuthStateChange`.
- Data read/written: Supabase auth session; `profiles` row read/created through `ensureProfileForUser`.
- Success state: authenticated user is redirected to `/`; protected routes render.
- Error states: missing email/password, short password, Supabase auth error toast, missing profile returns null without throwing.
- Fragile/confusing areas: older docs mention magic-link-only auth in places, but code now has password and Google too. Profile creation is split between DB trigger/schema history and client bootstrap.

## First-time onboarding flow

- Starting route: any protected route for a fresh user; `FTXGate` redirects to `/onboarding`.
- Important UI components: `src/components/FTXGate.tsx`, `src/lib/ftxGate.ts`, `src/pages/Onboarding.tsx`, `src/components/onboarding/OnboardingStep1Mode.tsx`, `OnboardingStep3Invite.tsx`, `OnboardingStep4Mission.tsx`.
- API calls: `checkFTXGate` reads `tasks` and `rewards_store`; invite step likely uses friend/profile APIs through its component.
- Data written/read: localStorage `bounty_onboarding_completed`, localStorage `bounty_theme`, `tasks`, `rewards_store`, `friendships`, `profiles`.
- Success state: localStorage onboarding flag set and user navigates to `/`.
- Error states: auth not ready shows loading; no session redirects to `/login`; DB errors in gate cause `hasMissions/hasRewards` false and may show onboarding.
- Fragile/confusing areas: docs and comments disagree on 3-step vs 4-step onboarding. Current completion is localStorage-only, so browser/device changes reset onboarding unless user has tasks/rewards.

## Dashboard / mission inbox flow

- Starting route: `/`.
- Important UI components: `Dashboard`, `TaskCard`, `MissionModalShell`, `ProofModal`, `StatsRow`, `PageQuote`.
- API calls: `useAssignedContracts` reads `tasks` where `assigned_to = user.id` and `is_archived = false`; `useIssuedContracts` reads tasks created by user for summary; `useUserCredits` reads `user_credits`.
- Data read: assigned `tasks`, issued `tasks`, joined creator/assignee profile display names and avatars, user credit balance.
- Data written: status/proof/archive updates through `updateMissionStatus`, `uploadProof`, `submitForReviewNoProof`, and `archiveMission`.
- Success state: user can see active work, submit for review, see waiting/completed status, and optionally visit rewards store.
- Error states: full-page error card with retry for assigned contracts; proof upload errors via toast; Android-specific network message adjustment.
- Fragile/confusing areas: direct status update path still exists alongside submit-for-review path. `updateMissionStatus` pure-domain logic can auto-complete no-proof review, while current dashboard no-proof action uses `submitForReviewNoProof` to put tasks into review for issuer approval.

## Issued mission create/edit/delete flow

- Starting route: `/issued`.
- Important UI components: `IssuedPage`, `TaskForm`, `TaskCard`, `ConfirmDeleteModal`.
- API calls: direct `supabase.from('tasks').insert`, `.update`, `.delete`; `useIssuedContracts` fetch; `useFriends` for assignee selector.
- Data written/read: `tasks` rows with `title`, `description`, `assigned_to`, `deadline`, `reward_type`, `reward_text`, `proof_required`, `is_daily`, `created_by`, `status`.
- Success state: mission appears in the created list; edits update row; delete removes row; list refetches.
- Error states: toast for create/update/delete failures; full-page loading/error for issued contracts.
- Fragile/confusing areas: `TaskForm.NewTaskData` requires `created_by` and `status`, but `IssuedPage` also adds/overrides those fields. The page title says "My Missions" while nav tab label is "Missions"; older language says contracts.

## Proof submission and review/approval flow

- Starting route: assignee starts from `/`; issuer reviews from `/issued`.
- Important UI components: `TaskCard`, `ProofModal`, `MissionModalShell`, `Dashboard`, `IssuedPage`.
- API calls: `uploadProof` uploads to Supabase Storage bucket `bounty-proofs`, then updates `tasks`; `submitForReviewNoProof` updates `tasks`; `approveMission` calls RPC `approve_task`; `rejectMission` updates `tasks`.
- Data written/read: `tasks.status`, `tasks.proof_url`, `tasks.proof_type`, `tasks.proof_description`, `tasks.completed_at`, `tasks.approved_at`; `user_credits` via RPC on approval.
- Success state: assignee task moves to review; issuer approves, task becomes completed and credits are awarded for credit rewards; reject resets task to pending and clears proof file fields.
- Error states: missing file/text, file too large, invalid file type, storage upload failure, unauthorized issuer/assignee, wrong status for approval.
- Fragile/confusing areas: `ProofModal` accepts PNG/JPG/PDF in UI config (`src/lib/proofConfig.ts`) while `domain/missions.uploadProof` allows image/video and rejects other types. Text-only proof returns string `text-proof`, which callers treat as a truthy uploaded URL.

## Reward store creation/edit/delete/claim flow

- Starting route: `/rewards-store`.
- Important UI components: `RewardsStorePage`, `RewardCard`, `CreateBountyModal`, `EditBountyModal`, `ConfirmDialog`, `FriendSelector`.
- API calls: `fetchRewards` reads `rewards_store`; creator profiles are fetched separately from `profiles`; `create_reward_store_item`, `update_reward_store_item`, `delete_reward_store_item`, and `purchase_reward` RPCs.
- Data read: `rewards_store`, `profiles`, `user_credits`, `collected_rewards`.
- Data written: `rewards_store`, `collected_rewards`, `credit_transactions`, `user_credits`.
- Success state: created reward appears in "My Bounties"; available assigned rewards can be claimed if affordable; collected reward appears in collected tab; credits refresh.
- Error states: no assignee, invalid cost, RPC error messages, insufficient credits, self-purchase, already collected, reward inactive/not found.
- Fragile/confusing areas: product names remain mixed: code calls hooks `useCreateBounty`, RPC arg `p_bounty_id`, table `rewards_store`, UI can say bounties/rewards/gifts by theme. Reward image upload depends on `reward-images` storage bucket whose setup is not clearly present in migrations/schema exports.

## Friends/invite/partner flow

- Starting route: `/friends`.
- Important UI components: `Friends`, `FriendCard`, `ConfirmDeleteModal`, `FriendSelector`.
- API calls: direct profile search via `supabase.from('profiles').select('*').ilike('display_name', ...)`; direct `friendships` insert; `useFriends` read/update/delete; realtime subscription on `friendships`.
- Data read/written: `profiles`, `friendships`, `profiles.partner_user_id` in couple mode.
- Success state: accepted friends appear in roster; pending requests can be accepted/rejected/canceled; in couple mode an accepted friend can become selected partner.
- Error states: duplicate request, request failed, loading/error card for friend list, partner invite state states.
- Fragile/confusing areas: active search says "Search by name or email..." in couple mode and "Search users by username..." elsewhere, but implementation searches only `display_name`. `partner_user_id` is used in code but not found in `src/types/database.ts` or migrations.

## Profile/settings flow

- Starting route: `/profile/edit`; modal also opens from header profile in `Layout`.
- Important UI components: `ProfileEdit`, `ProfileEditModal`, `FileUpload`, `LanguageSwitcher`.
- API calls: profile read/update/upsert; avatar upload to `avatars`; health check selecting from `profiles`.
- Data read/written: `profiles.display_name`, `profiles.avatar_url`, localStorage `bounty_theme`, localStorage onboarding flag.
- Success state: display name/avatar update, theme switches immediately, onboarding can be restarted.
- Error states: upload/storage failure, profile still loading, Supabase health check error.
- Fragile/confusing areas: there are two profile-edit surfaces with different feature sets. The page has system status and onboarding restart; the modal has mode options, language/sound, and account controls.

## Archive/history flow

- Starting route: `/archive`.
- Important UI components: `ArchivePage`, `TaskCard`.
- API calls: `useArchivedContracts` reads `tasks` where `assigned_to = user.id` and `is_archived = true`.
- Data read/written: archived assigned `tasks`.
- Success state: archived cards display in read-only style.
- Error states: simple text loading/error.
- Fragile/confusing areas: nav hides History, but route exists. Archive is global `is_archived` on task, so one actor archiving may hide it for both creator and assignee. Query only retrieves assigned tasks, not created tasks.

# 5. System Boundary

Inside this app:

- React SPA routing, layout, UI state, theme state, modal management, form validation, proof/reward upload initiation, and Supabase client calls live under `src/`.
- Product/domain business functions live in `src/domain/*` and pure core logic under `src/core/*`.
- App-specific types live in `src/types/*`; generated DB typing appears in `src/types/database.ts` but is partially stale relative to newer code/migrations.
- Documentation, product vision, architecture notes, SQL inventories, and runbooks live under `docs/`.
- Supabase migrations, schema exports, local Supabase config, and Edge Functions live under `supabase/`.
- Capacitor/iOS shell files live under `ios/` and `capacitor.config.ts`.

External services:

- Database: Supabase Postgres. Tables include `profiles`, `tasks`, `friendships`, `user_credits`, `credit_transactions`, `rewards_store`, `collected_rewards`, legacy `marketplace_bounties`, legacy `collected_bounties`, and daily/recurring tables in migrations.
- Auth: Supabase Auth. `src/pages/Login.tsx` uses Google OAuth, email/password, and magic link. Local auth settings are in `supabase/config.toml`.
- Storage/CDN/media: Supabase Storage. Code uses `bounty-proofs`, `avatars`, and `reward-images`; schema exports show policies for `bounty-proofs` and `avatars`; reward-images setup is UNKNOWN.
- AI providers: No runtime AI provider is integrated in app code. `package.json` includes `googleapis`, but no OpenAI or image-generation API appears in current feature code. Docs mention future AI-generated reward images as aspirational.
- Email: Supabase Edge Functions. `notify-reward-creator` uses Resend if `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured. Legacy `send-new-bounty-alert` and `send-proof-submitted-alert` use Gmail OAuth/nodemailer env vars.
- Payment: No payment processor or real-money flow found. Credits/tokens are internal virtual balances in `user_credits`.
- Hosting: Frontend is configured for Vercel SPA rewrites in `vercel.json`; backend is Supabase. Local Supabase ports are in `supabase/config.toml`.
- Analytics: Supabase local config enables analytics service locally, but no frontend analytics SDK/event tracking was found.
- Third-party APIs: avatar placeholder URLs use `https://avatar.iran.liara.run/...`; Google OAuth is configured through Supabase; Resend/Gmail are email provider options in Edge Functions.
- Realtime: Supabase Realtime is used at least for friendships (`useFriends`, `usePartnerState`) and likely credits via `UserCredits`; not every data surface is realtime.

# 6. Glossary

| Term | Meaning | Where it appears | Clarity |
|---|---|---|---|
| Bounty Hunter | Product/app name | `Layout.tsx`, `Login.tsx`, theme strings, docs | Clear |
| Mission | Current product word for a task/ask | `Dashboard.tsx`, `IssuedPage.tsx`, `themes.ts`, onboarding | Clear in UI, maps to `tasks` table |
| Contract | Older/alternate word for mission/task | `TaskForm.tsx`, `TaskCard.tsx`, translations, docs | Inconsistent with mission |
| Task | Database/backend entity for missions/contracts | `tasks` table, hooks, domain code | Clear technically |
| Bounty | Legacy/guild word for a reward or reward-store item | `CreateBountyModal`, `useCreateBounty`, translations, legacy tables | Inconsistent: sometimes direct task reward, sometimes store reward |
| Reward | Generic store item claimable with credits | `rewards_store`, `RewardCard`, `domain/rewards.ts` | Clear but overlaps bounty/gift |
| Gift | Couple-mode label for reward | `themes.ts`, theme translations | Clear as themed label |
| Loot Vault | Guild-mode label for rewards store | `themes.ts`, `RewardsStorePage` | Clear as themed label |
| Credit | Internal currency earned/spent | `user_credits`, `credit_transactions`, `useUserCredits` | Clear |
| Token | Couple-mode label for credit | `themes.ts` | Clear as themed label |
| Proof | Evidence for completing a mission | `ProofModal`, `tasks.proof_*`, `domain/missions.ts` | Clear, but accepted file types mismatch |
| Review | Task status after completion/proof submission awaiting issuer approval | `TaskStatus`, `Dashboard`, `IssuedPage` | Clear |
| Completed/Done | Approved task state | `tasks.status`, `TaskCard`, translations | Clear |
| Rejected | Creator sends reviewed task back to pending | `TaskStatus`, `rejectMission` | Clear, but no feedback field |
| Archive/History | Hiding completed tasks from active views | `ArchivePage`, `archiveMission`, `is_archived` | Partially clear; global archive behavior is ambiguous |
| Guild | Friend/crew mode | `themes.ts`, `Friends.tsx` | Clear |
| Family | Family/chores mode | `themes.ts`, `Friends.tsx` | Clear |
| Couple | Partner/request/gift mode | `themes.ts`, `Friends.tsx`, `FriendSelector` | Clear at UI layer; schema support unclear |
| Partner | Selected accepted friend in couple mode | `profile.partner_user_id`, `usePartnerState` | Incomplete/unclear because migration not found |
| Friend/Guild member/Crew | Accepted `friendships` relationship | `friendships`, `useFriends`, `Friends.tsx` | Clear |
| FTX | First-time experience gate/onboarding | `FTXGate.tsx`, `ftxGate.ts` | Clear in code comments, potentially confusing acronym |
| Store item | Row in `rewards_store` | `domain/rewards.ts`, hooks | Clear |
| Collected reward | Claimed reward record | `collected_rewards`, `useCollectedRewards` | Clear |
| Marketplace bounty | Legacy/duplicate reward model | `marketplace_bounties`, `collected_bounties`, older docs/schema | Inconsistent/legacy |
| Daily mission/streak | Intended recurring/streak layer | `daily_mission_streaks`, `useDailyMissionStreak`, core contracts | Inconsistent: migrations/hooks exist, current approval RPC removed streak writes |
| RPC | Supabase/Postgres function called by client | `approve_task`, `purchase_reward`, reward RPCs | Clear |
| Edge Function | Supabase Deno serverless function | `supabase/functions/*` | Clear |
| UI layer/activeLayer | Global UI overlay state for menu/modal stacking | `UIContext`, modal components | Clear technically |

# 7. Product Risks and Ambiguities

- Naming drift can confuse users and architects. The same object may be called task, contract, mission, bounty, reward, gift, or loot depending on layer. Current theme system helps UI copy, but code/API names still mix old and new metaphors.
- Onboarding intent is ambiguous. Product vision says mode -> reward -> invite -> mission, but current `Onboarding.tsx` is mode -> invite -> explainer. GPT-5.5 Pro should not assume reward/mission creation is still desired in FTX without confirming product direction.
- Couple mode depends on `partner_user_id`, but no migration/schema definition was found in tracked migrations or `src/types/database.ts`. This is a launch risk if the live DB does not have that column.
- Reward image upload depends on a `reward-images` bucket in `src/lib/rewardImageUpload.ts`; schema exports surfaced `bounty-proofs` and `avatars` policies, not clear reward-images setup.
- Daily/streak feature is half-present. There are migrations and hooks, but `approve_task` v3 explicitly removed streak writes, and current visible `TaskForm` does not expose a daily checkbox. Treat it as legacy/partial until verified.
- Standalone `/my-rewards` looks real in routing but is a placeholder. The store's collected tab is implemented, so two product surfaces compete.
- History/archive is hidden in nav but route exists. Archiving uses a single `is_archived` flag, so it may not support per-user history semantics.
- Search UX is misleading. Friend search copy mentions username/email/name, but active implementation searches `display_name` only.
- Email notification readiness is uncertain. `notify-reward-creator` can send via Resend if configured, while other functions use a different Gmail OAuth strategy and legacy routes.
- Storage access/trust is risky. Proofs and avatars appear public. Proof URLs may expose private relationship content to anyone with a link.
- Reward creation and mission creation require existing accepted friends/partner. This is coherent for group use, but makes solo onboarding or first-run value weaker.
- Local state is used for theme and onboarding completion. These settings do not travel with account across devices/browsers.
- Generated DB types appear stale relative to newer RPC names and profile fields. Code casts RPCs to `never`/manual types in places, masking drift.
- There is an already-dirty worktree and deleted/added migration/function files in `git status`; architecture advice should be based on current repo state but should not assume migration history is clean.
- UNKNOWN: Whether production Supabase schema matches `supabase/schema.sql`, `supabase/schema_all.sql`, latest migrations, or live remote. Several docs are older and conflict with current code.
- UNKNOWN: Whether app is intended to ship as web-only first or iOS/Capacitor soon. iOS scaffolding exists, but no current native-specific product plan was found beyond docs.

# 8. What GPT-5.5 Pro Should Know Before Giving Advice

This is not a generic task app. It is a small-group social economy product with a trusted relationship graph, proof/review mechanics, and an internal credit/reward loop. Advice should preserve the core loop: create mission -> complete/prove -> approve/reject -> award credits -> claim reward.

The architecture is a React SPA with Supabase as backend, not a custom server app. Most business behavior is either client-side domain code in `src/domain/*` or Postgres RPCs in `supabase/migrations/*`. Recommending a full backend rewrite would be disproportionate unless tied to concrete trust/security problems.

The canonical current tables for the main product appear to be `tasks`, `friendships`, `profiles`, `user_credits`, `rewards_store`, and `collected_rewards`. `marketplace_bounties`, `collected_bounties`, placeholder `YYYYMMDDHHMMSS_*` migrations, and `supabse/` should be treated as legacy or drift until proven otherwise.

The canonical reward-purchase path appears to be `domain/rewards.purchaseReward` -> RPC `purchase_reward`, not old `purchase_bounty`. The canonical approval path appears to be `domain/missions.approveMission` -> RPC `approve_task`, not direct client calls to `increment_user_credits`. Newer migrations in April 2026 harden these flows.

Do not over-index on older docs without checking code. `docs/overview.md`, `docs/api-map.md`, and `docs/data-model.md` contain useful context but also stale claims, such as mocked email, direct client credit awarding, or missing RLS that newer migrations may have addressed.

Theme modes are product-level, not separate products. Guild/family/couple should share the same data model and behavior unless a specific exception is present. The current theme system primarily changes strings and some visual accents through localStorage.

The app is mobile-sensitive. Many files mention Android/iOS/modal/pull-to-refresh fixes, and Capacitor/iOS assets exist. Architecture advice should consider touch targets, modal stacking, portals, scroll locking, and offline/network behavior.

The highest-value review areas are likely:

- Schema/migration truth: reconcile generated types, migrations, schema exports, and live Supabase.
- Naming/model consolidation: choose canonical terms at code/API boundaries while preserving themed UI language.
- Security and privacy: proof storage, RLS, RPC grants, profile visibility, credit integrity, reward purchase idempotency.
- First-time value: resolve onboarding scope and friend prerequisite friction.
- Data lifecycle: archive semantics, collected rewards, credit transactions/audit, reward image storage.
- Error/retry/offline behavior for mobile use.

Avoid inventing new product intent. The repository supports a private small-group app, not public bounties, crypto, payroll, or enterprise workflows. Those are future or out-of-scope unless product leadership explicitly changes direction.
