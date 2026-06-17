# 1. Executive Code Review

Overall health: this is a functional React/Supabase app with visible stabilization work in progress, but it is not launch-ready. The frontend builds, but lint fails, there are no automated tests, production dependency audit reports high-severity advisories, and backend truth is split across live schema snapshots, old migrations, new hardening migrations, docs, and direct client calls.

Main strengths:

- The app has a clear user-facing feature model: missions/tasks, friends, rewards, credits, onboarding, profile, and archive.
- Some critical backend fixes have already been designed in `supabase/migrations/20260412100100_lock_down_increment_user_credits.sql` and `supabase/migrations/20260412100200_phase1_reward_and_rpc_hardening.sql`.
- The newer domain layer in `src/domain/missions.ts`, `src/domain/rewards.ts`, and `src/domain/credits.ts` is the right direction: browser code is moving away from direct credit mutation and toward server-side RPCs.
- `tsconfig.app.json` has `"strict": true`, so the compiler can catch real mistakes once casts and generated types are cleaned up.

Main weaknesses:

- There is no reliable single backend contract. `supabase/schema.sql` still shows `user_credits` INSERT/UPDATE policies for authenticated users and no `collected_rewards` policies, while newer migrations attempt to harden that model.
- UI, hooks, domain calls, storage, RPC, optimistic state, and user-facing toast logic are frequently mixed in the same files. The most obvious examples are `src/hooks/useTasks.ts`, `src/pages/IssuedPage.tsx`, `src/pages/RewardsStorePage.tsx`, `src/hooks/useRewardsStore.ts`, and `src/hooks/useFriends.ts`.
- There are multiple partially overlapping data access paths for the same concepts: missions are handled by `useTasks`, `useAssignedContracts`, `useIssuedContracts`, and `src/domain/missions.ts`; rewards are handled by `useRewardsStore`, `useCreateBounty`, `usePurchaseBounty`, `useUpdateBounty`, `useDeleteBounty`, and `src/domain/rewards.ts`.
- Runtime validation is mostly hand-rolled. There is no Zod or equivalent schema layer for API payloads, RPC responses, Edge Function request bodies, localStorage values, or file metadata.
- Edge Functions are inconsistent. `notify-reward-creator` validates the caller and verifies a purchase record, but `send-new-bounty-alert` and `send-proof-submitted-alert` accept arbitrary request JSON and send email without visible auth checks.

Launch readiness: blocked. The app can build, but `npm run lint` fails with 9 errors. `npm audit --omit=dev` reports 4 high-severity and 1 moderate production dependency vulnerabilities, including React Router and `jws`. There are no test files. Database hardening appears partly uncommitted/unapplied relative to the schema snapshots. Shipping now would make incident response difficult because the architecture is understandable at the product level but tangled at the implementation boundaries.

Biggest risks:

- Credit and reward integrity depends on exact migration state. If production resembles `supabase/schema.sql`, users can mutate their own credit rows and `collected_rewards` is unusable or opaque due to RLS with no policies.
- Email Edge Functions can be abused if deployed as written in `send-new-bounty-alert` and `send-proof-submitted-alert`.
- No automated tests cover money-like credits, task approval, reward purchase atomicity, RLS, storage policies, auth redirects, or onboarding.
- Frontend state can desynchronize because multiple hooks fetch/mutate the same tables independently and then refetch manually.

Architecture clarity: the intended architecture is understandable, but the actual architecture is tangled. The clearest boundary is the emerging `src/domain/*` and `src/core/*` split. The weakest boundary is still the hooks/pages layer, where UI events directly execute Supabase mutations, invoke storage, map errors, manage optimistic updates, and encode business rules.

# 2. Refactor Priority Matrix

| Priority | Area | File(s) | Problem | Impact | Risk if ignored | Suggested refactor | Difficulty | Before launch |
|---|---|---|---|---|---|---|---|---|
| Launch blocker | Lint/build gate | `src/components/TaskCard.tsx:104`, `src/components/onboarding/OnboardingStep2Reward.tsx:23`, `src/pages/Dashboard.tsx:12`, `src/pages/IssuedPage.tsx:53`, `src/utils/getErrorMessage.ts:93,176` | `npm run lint` fails with unused variables. | CI cannot enforce quality; release branch is dirty by default. | Broken CI or normalized lint bypasses. | Remove unused imports/vars or use intentional underscore config consistently. | Low | Yes |
| Launch blocker | Dependency security | `package.json`, `package-lock.json` | `npm audit --omit=dev` reports high vulnerabilities in `@remix-run/router`/`react-router-dom`, `jws`, and moderate `qs`. Full audit reports 17 issues. | Known vulnerable packages in production/runtime tree. | Public advisories remain exploitable or block store/security review. | Upgrade React Router, Google/API transitive deps, Vite/Rollup/dev tools; rerun lockfile audit. | Medium | Yes |
| Launch blocker | Database truth drift | `supabase/schema.sql`, `supabase/schema_all.sql`, `supabase/migrations/20260412100100_lock_down_increment_user_credits.sql`, `supabase/migrations/20260412100200_phase1_reward_and_rpc_hardening.sql` | Schema snapshots conflict with hardening migrations. Snapshots still show credit self-write policies and no collected reward policies. | Cannot reason about production security from repo. | Launching wrong migration state reopens credit minting or breaks collected rewards. | Generate fresh schema from intended DB, add validation SQL, document required migration order. | Medium | Yes |
| Launch blocker | Collected rewards RLS | `supabase/schema.sql:889`, `docs/sql-inventory/tables.csv` | `collected_rewards` has RLS enabled but no visible policy in schema snapshots. App reads it in `src/hooks/useCollectedRewards.ts:52`. | Collected tab can fail; notification verification depends on service role only. | Users cannot see purchases, or policies get hotfixed manually outside repo. | Add explicit `SELECT` policy for `collector_id = auth.uid()` and controlled server-side insert path only. | Low | Yes |
| Launch blocker | Credit row client writes | `supabase/schema.sql:817`, `supabase/schema.sql:838`, `supabase/migrations/20260412100100_lock_down_increment_user_credits.sql:34-38` | Snapshot allows users to insert/update own `user_credits`; new migration revokes function access but does not remove table update policies in snapshot. | Users may forge balances if table policy is active. | Credit economy is not trustworthy. | Revoke client INSERT/UPDATE on `user_credits`; all balance changes through trusted RPCs/triggers only. | Medium | Yes |
| Launch blocker | Email function abuse | `supabase/functions/send-new-bounty-alert/index.ts:63-117`, `supabase/functions/send-proof-submitted-alert/index.ts:63-116` | Functions send email based only on request body; no auth, no task ownership check, no rate limit. | Spam, spoofed notifications, email provider reputation damage. | Public endpoint abuse and billing/reputation impact. | Require Authorization, verify caller against task creator/assignee with service role lookup, rate-limit/idempotency key. | Medium | Yes if deployed |
| Serious debt | Task state boundary | `src/hooks/useTasks.ts`, `src/domain/missions.ts`, `src/hooks/useAssignedContracts.ts`, `src/hooks/useIssuedContracts.ts` | Same task lifecycle is split across multiple hooks and domain functions. | Divergent rules and stale UI. | One flow gets fixed while another stays unsafe or buggy. | Create a single `missionRepository` plus `missionService`; pages use only service hooks. | High | Partial |
| Serious debt | Reward state boundary | `src/hooks/useRewardsStore.ts`, `src/hooks/useCreateBounty.ts`, `src/hooks/usePurchaseBounty.ts`, `src/hooks/useUpdateBounty.ts`, `src/hooks/useDeleteBounty.ts`, `src/domain/rewards.ts` | Several hooks wrap the same RPC domain functions with inconsistent return shapes and duplicate toasts. | More bugs in claim/create/delete flows. | Inconsistent UX and hard-to-test reward logic. | Collapse to one reward service API and one hook facade. | Medium | Yes for claim path |
| Serious debt | Type/RPC casts | `src/domain/rewards.ts:78,187,222,237`, `src/hooks/useCreateBounty.ts:40`, `src/context/AuthContext.tsx:189` | RPCs and nullable fields are forced with `as never` / `as unknown`. | TypeScript cannot validate backend contracts. | Silent runtime break after RPC signature change. | Regenerate `src/types/database.ts`; define typed wrappers for custom JSON RPC responses. | Medium | Yes for purchase/create |
| Serious debt | Edge Function consistency | `supabase/functions/notify-reward-creator/index.ts`, `send-new-bounty-alert`, `send-proof-submitted-alert`, `_shared/cors.ts` | Different auth, email provider, CORS, validation, and response patterns. | Operational inconsistency and abuse exposure. | Notification behavior fails or gets exploited. | Shared `requireUser`, `jsonResponse`, `sendEmail`, `validatePayload`, and CORS origin allowlist. | Medium | If deployed |
| Serious debt | Storage policy and validation | `src/hooks/useTasks.ts:556-564`, `src/domain/missions.ts:236-253`, `src/components/ProfileEditModal.tsx:122-126`, `src/lib/rewardImageUpload.ts:53-70` | Client validates file type/size, but server-side storage policy and scanning are not visible. Proof bucket is public in docs/inventory. | Upload abuse, stored active content, unexpected public PII. | Storage cost abuse and privacy leaks. | Enforce bucket policies by user/task path, MIME allowlist, size limits, private proof URLs if needed. | Medium | Yes for public launch |
| Medium | Friends N+1 queries | `src/hooks/useFriends.ts:50-60` | Fetches each profile inside a loop. | Slow with larger friend lists; repeated network calls. | Bad performance and rate pressure. | Use relational select or batch `.in('id', ids)` profile query. | Low | No |
| Medium | Rewards profile N+1-ish two-step | `src/hooks/useRewardsStore.ts:89-104`, `src/hooks/useCollectedRewards.ts:84-99` | Manual profile enrichment due to FK/RLS gaps. | Extra queries and client merge complexity. | More inconsistent data display. | Fix FK/RLS, use explicit relational views or RPC read models. | Medium | No |
| Medium | Bundle size | build output `assets/index-*.js` | Production chunk is 697.72 kB minified / 202.26 kB gzip; Vite warns above 500 kB. | Slower first load on mobile. | Poor mobile UX. | Route-level lazy loading; isolate Google APIs/admin-only code; manual chunks. | Medium | No |
| Medium | Missing asset | `src/index.css:123` | Build warns `/img/C1.jpg` does not resolve. | Broken runtime background or 404. | Visual defect and wasted request. | Add asset under `public/img` or remove reference. | Low | Yes if visible |
| Nice-to-have | Comment history noise | Many files, e.g. `src/hooks/useTasks.ts:1-20`, `src/pages/IssuedPage.tsx:1-19` | Long changelog comments at file tops. | Makes real intent harder to read. | Future maintainers miss actual logic. | Move history to docs/changelog; keep file comments only for current design. | Low | No |
| Nice-to-have | Generated/local clutter | `node_modules_old`, root `NUL`, `dist`, logs | Workspace contains generated/legacy artifacts. | Onboarding and review noise. | Accidental commits or confusion. | Confirm tracked status, archive/remove from repo or ignore. | Low | No |

# 3. Architecture Boundary Problems

UI doing business logic:

- `src/pages/IssuedPage.tsx:95-125` deletes tasks directly through Supabase from the page instead of a mission service.
- `src/pages/IssuedPage.tsx:268-331` creates and updates tasks directly from the page, duplicating logic that also exists in `src/hooks/useTasks.ts:254-331` and `src/domain/missions.ts`.
- `src/pages/RewardsStorePage.tsx:94-125` coordinates purchase/delete side effects, refetches rewards, refetches credits, and refetches collected rewards manually.

API/hooks doing too many responsibilities:

- `src/hooks/useTasks.ts` fetches tasks, manages real-time subscriptions, validates status transitions partially, performs optimistic updates, uploads storage objects, deletes storage objects, maps user-facing errors, and returns derived task lists.
- `src/hooks/useRewardsStore.ts` fetches rewards, manually enriches creator profiles, dynamically imports domain functions, shows toasts, handles notification side effects, and stores mutation errors.
- `src/hooks/useFriends.ts` owns data fetching, categorization, profile hydration, real-time subscriptions, request sending, acceptance, rejection, cancellation, and removal.

Database logic duplicated:

- Task create/update exists in `src/hooks/useTasks.ts:254-331`, `src/pages/IssuedPage.tsx:268-331`, and `src/domain/missions.ts`.
- Reward purchase is exposed through `src/hooks/useRewardsStore.ts:165-203`, `src/hooks/usePurchaseBounty.ts:19-51`, and `src/domain/rewards.ts:59-141`.
- Reward creation is exposed through `src/hooks/useRewardsStore.ts:124-163`, `src/hooks/useCreateBounty.ts:29-60`, and `src/domain/rewards.ts:149-207`.

Auth checks split inconsistently:

- `ProtectedRoute` only gates route rendering in `src/App.tsx:30-57`.
- Domain functions sometimes verify user through Supabase session (`src/domain/rewards.ts:62-70`) and sometimes trust a passed `userId` (`src/domain/missions.ts:149-216`).
- Edge Function auth is strong in `notify-reward-creator` (`supabase/functions/notify-reward-creator/index.ts:80-124`) but absent in `send-new-bounty-alert` and `send-proof-submitted-alert`.

Provider-specific logic leaking everywhere:

- Supabase client calls appear directly in pages, hooks, domain modules, profile components, and Edge Functions.
- Storage bucket names are hard-coded in `src/hooks/useTasks.ts:557`, `src/domain/missions.ts:252`, `src/components/ProfileEditModal.tsx:125`, and `src/lib/rewardImageUpload.ts:35`.
- RPC names are hard-coded in several places and sometimes cast around generated types, e.g. `src/domain/rewards.ts:78`.

State duplicated across systems:

- Tasks are fetched independently by `useTasks`, `useAssignedContracts`, `useIssuedContracts`, and `useArchivedContracts`.
- Rewards are fetched in `useRewardsStore`; collected rewards are fetched separately in `useCollectedRewards`; credits are fetched separately in `useUserCredits` and `UserCredits`.
- Onboarding completion is stored in localStorage in both `src/lib/ftxGate.ts:29,81` and `src/pages/Onboarding.tsx:77,84`, not as a server-side profile flag.

Mock/demo/unused code mixed with production code:

- `supabase/functions/create-daily-tasks/index.ts` targets `recurring_contract_templates` and `recurring_contract_instances`, while migrations/docs mostly reference recurring task tables/instances under different names.
- `src/components/dev/ProfileDebugger.tsx` exists under source and should be gated from production routes/build or moved behind an explicit dev-only import.
- File headers contain long "Phase/Rxx" change history across production components.

# 4. Complexity Hotspots

Path: `src/hooks/useTasks.ts`

- What it does: task fetching, real-time subscription, creation, update, status transition, proof upload, storage cleanup, delete, derived lists.
- Why complex: 717 lines with API calls, UI toasts, optimistic state, storage, platform-specific Android behavior, and business rules in one hook.
- Specific signs: duplicate error helper at `35-53`; three separate task fetches at `96-110`; realtime refetch on every event at `144-157`; proof upload plus DB mutation at `505-643`; manual storage cleanup at `669-680`.
- Bugs it may cause: repeated full refetch storms, optimistic rollback errors, proof file orphaning, inconsistent task shape due to different profile aliases in selects, UI allowing status changes that backend later rejects.
- Refactor recommendation: split into `missionQueries`, `missionMutations`, `proofStorage`, and a thin `useTasks` facade. Move status rules to one service using `src/core/contracts/contracts.domain.ts`.

Path: `src/pages/Friends.tsx`

- What it does: full friends UI, search, tabs, profile display, requests, actions.
- Why complex: 757 lines in a page component, likely combining presentation and workflow state.
- Specific signs: large page size; paired with `useFriends.ts` which itself handles many responsibilities.
- Bugs it may cause: UI state regressions when friend request state changes; hard-to-test search/request flows.
- Refactor recommendation: split into `FriendSearchPanel`, `FriendRequestsTab`, `FriendsList`, and service-backed action handlers.

Path: `src/pages/IssuedPage.tsx`

- What it does: displays created missions, handles create/edit/delete/approve/reject/archive.
- Why complex: page executes direct Supabase mutations and calls domain functions; also controls modal/menu coordination and sorting.
- Specific signs: direct delete at `104-107`; approve/reject logic at `138-225`; direct create/update at `288-315`; UI grouping at `390-392`; repeated TaskCard wiring across three sections.
- Bugs it may cause: one task flow bypasses shared validation; duplicate card render paths drift; ref guard prevents double click only in one component.
- Refactor recommendation: make page a view over `useIssuedMissions`; move create/update/delete/archive into `src/domain/missions.ts` or a repository.

Path: `src/components/modals/MissionModalShell.tsx`

- What it does: expanded mission modal UI and action shell.
- Why complex: 510 lines in one modal component, likely heavy visual and interaction logic.
- Specific signs: used as the central expanded state renderer from `TaskCard.tsx:173-188`.
- Bugs it may cause: modal layering, scroll lock, and action rendering regressions are hard to isolate.
- Refactor recommendation: split shell, header, proof panel, reward panel, party/actor panel, and action footer.

Path: `src/pages/RewardsStorePage.tsx`

- What it does: reward marketplace tabs, claim, delete, edit, create, collected rewards, credit balance.
- Why complex: one page coordinates four hooks and multiple refetches.
- Specific signs: refresh fan-out at `88-92`; claim fan-out at `94-104`; tab-specific filtering at `207-217`.
- Bugs it may cause: stale balance or stale collected tab after purchase; inconsistent available/created/collected visibility.
- Refactor recommendation: one `useRewardStoreViewModel` should return prefiltered tab data and one `refreshAll` action.

Path: `supabase/migrations/20260412100200_phase1_reward_and_rpc_hardening.sql`

- What it does: canonical reward create/update/delete/purchase RPCs.
- Why complex: security-definer SQL owns money-like purchase logic and data visibility assumptions.
- Specific signs: `purchase_reward` locks user credits at `229-233`, locks reward at `239-244`, catches unique violation at `272-283`, writes transactions at `285-295`, deducts credits at `297-301`, deactivates reward at `303-307`.
- Bugs it may cause: if `user_credits` row does not exist, `UPDATE user_credits` affects zero rows after treating balance as zero; missing `auth.uid()` check would be critical, but current migration has it at `221-227`.
- Refactor recommendation: add SQL validation tests for no-credit-row, insufficient funds, duplicate purchase, self-purchase, inactive reward, and transaction consistency.

# 5. Duplication and Inconsistency

Duplicate API logic:

- Appears in `useRewardsStore`, `usePurchaseBounty`, `useCreateBounty`, `useUpdateBounty`, `useDeleteBounty`, and `src/domain/rewards.ts`.
- Why it matters: reward flows produce different return shapes and toasts, making it hard to reason about one purchase/create path.
- Suggested consolidation: keep `src/domain/rewards.ts` as the only reward API module; delete older wrapper hooks or make them thin aliases.

Duplicate task fetching:

- Appears in `useTasks.ts:96-110`, `useAssignedContracts.ts:40-48`, `useIssuedContracts.ts:40-48`, `useArchivedContracts.ts:23-28`.
- Why it matters: profile aliases differ (`profiles`, `creator_profile`, `creator`, `assignee`), so components must tolerate inconsistent shapes.
- Suggested consolidation: introduce canonical read models: `getAssignedMissions`, `getIssuedMissions`, `getArchivedMissions`.

Duplicate validation:

- File validation appears in `src/domain/missions.ts:236-244`, `src/lib/rewardImageUpload.ts:53-70`, `src/components/FileUpload.tsx`, and `src/components/ProfileEditModal.tsx`.
- Why it matters: proof, avatar, and reward-image upload rules diverge and remain client-side only.
- Suggested consolidation: shared client validation config plus storage policies/Edge validation for server enforcement.

Duplicate error handling:

- `src/hooks/useTasks.ts:35-53` defines a local error helper despite `src/utils/getErrorMessage.ts`.
- Many hooks cast errors with `err instanceof Error ? err.message : ...`.
- Why it matters: user-facing errors are inconsistent and some catch blocks swallow details.
- Suggested consolidation: one error mapper by operation type; all hooks return structured errors and pages decide presentation.

Duplicate UI states:

- Modal/layer coordination appears in `ProfileEditModal`, `TaskCard`, `IssuedPage`, and `UIContext`.
- Why it matters: mobile menu and modal interactions have been fixed repeatedly with local workarounds.
- Suggested consolidation: central overlay manager with named layers and route-level modal outlet.

Duplicate route guards/auth assumptions:

- `ProtectedRoute` checks route access, but individual functions still do local `if (!user)` checks.
- Why it matters: frontend checks are UX only; backend/RLS must own authorization.
- Suggested consolidation: keep route guard for UX, but all mutations should be server-side authorized and tested.

# 6. Type Safety and Validation Review

TypeScript strictness:

- `tsconfig.app.json` has `"strict": true`, `noUnusedLocals`, and `noUnusedParameters`.
- This is undermined by casts and lint disables: `src/domain/rewards.ts:78,187,222,237` uses `as never` for RPC calls; `src/hooks/useTasks.ts:40-41` disables `no-explicit-any`; `src/context/AuthContext.tsx:189` casts partner payload through `unknown`.

Zod/schema usage:

- No Zod or equivalent runtime schema library is present in `package.json`.
- Edge Function request bodies are cast directly, e.g. `notify-reward-creator` casts `await req.json()` to `NotificationPayload` at `supabase/functions/notify-reward-creator/index.ts:110`.
- Client RPC responses are cast manually, e.g. `src/domain/rewards.ts:106-114`.

API request validation:

- SQL RPCs validate some fields, e.g. reward name/assignee/cost in `20260412100200_phase1_reward_and_rpc_hardening.sql:45-55`.
- `send-new-bounty-alert` only checks `assigneeEmail` at `69-74`; it does not validate email ownership, task ID, app URL, or caller.
- `send-proof-submitted-alert` only checks `creatorEmail` at `69-74`.

Runtime validation:

- `safeUrlRender` is used by `TaskCard.tsx:131-144` before rendering proof links, which is good.
- localStorage values in `useDailyQuote.ts`, `ThemeContext.tsx`, `ftxGate.ts`, and `soundManager.ts` are trusted or loosely parsed without schema validation.

Database type generation:

- `src/types/database.ts` exists, but source comments admit drift: `src/hooks/useRewardsStore.ts:15` says reward types will throw until `database.ts` is regenerated.
- New RPCs are not accurately reflected, causing `as never` casts in `src/domain/rewards.ts`.

Unsafe casts:

- `src/domain/rewards.ts:165` stores `assigned_to: null as unknown as string`, which hides a schema mismatch around onboarding rewards.
- `src/context/AuthContext.tsx:189` casts `partner_user_id` through `unknown`, likely because generated `profiles` type is stale.
- `src/hooks/useCreateBounty.ts:40` casts raw RPC data to `CreateBountyResult`.

Missing null handling:

- Multiple functions guard null manually, but schema/type drift creates false confidence. Example: `purchase_reward` SQL treats missing credit rows as zero (`20260412100200...:235-237`) but later updates `user_credits` without inserting a missing row (`297-301`).

# 7. Error Handling Review

Errors swallowed:

- `src/hooks/useRewardsStore.ts:61-69` catches notification failure and does `void 0`; creators may never be notified and the UI records no operational failure.
- `src/hooks/useFriends.ts:56-63` ignores profile fetch errors inside the friendship loop and silently drops that friend from UI.
- `src/lib/rewardImageUpload.ts:121-125` returns a generic upload error and discards the actual exception.

Vague user-facing errors:

- Many catch blocks return "An unexpected error occurred", e.g. `src/hooks/usePurchaseBounty.ts:43`, `src/hooks/useUpdateBounty.ts:40`, `src/hooks/useDeleteBounty.ts:32`.
- Edge Functions return raw internal messages in JSON, e.g. `notify-reward-creator` returns `errorMessage` at `198-200`.

Server logs insufficient:

- SQL RPCs do not consistently write structured audit logs. `credit_transactions` is written for purchases in `20260412100200...:285-295`, but task approval credit awards only call `increment_user_credits` in `20260109_approve_task_rpc_v3_no_streaks.sql:70-75` and do not visibly insert a credit transaction row.
- Edge logs are plain `console.error` strings without request IDs or actor IDs.

Retries missing:

- Email send failures in `notify-reward-creator` are synchronous and unretried.
- Proof uploads and reward image uploads have no retry/backoff and no cleanup if storage succeeds but DB update fails.

External API failures dangerous:

- `notify-reward-creator` makes purchase notification a client-triggered post-purchase side effect. If the browser closes or the function fails, the purchase is committed but notification is lost.
- `send-new-bounty-alert` and `send-proof-submitted-alert` can be called with spoofed addresses if deployed publicly.

Partial failure could corrupt state:

- `src/hooks/useTasks.ts:556-586` uploads proof to storage, then updates the task. If DB update fails, the public storage file remains orphaned.
- `src/hooks/useTasks.ts:669-680` attempts storage deletion before task deletion but proceeds if storage delete fails, creating orphaned proof files.
- Reward purchase SQL is mostly atomic inside one function, but notification is outside the transaction and client-triggered.

# 8. Testing Review

Existing tests:

- No test files were found under the repo excluding `node_modules`, `dist`, `.git`, and `_archive`.
- `package.json` has no `test`, `vitest`, `jest`, `playwright`, or `cypress` script.
- Existing test evidence is manual documentation under `docs/test-runs`, `docs/V1_TESTING_CHECKLIST.md`, and `docs/V1_TESTING_RESULTS_*`.

What current verification covers:

- `npm run build` passes.
- Build warnings: bundle chunk `assets/index-*.js` is 697.72 kB minified / 202.26 kB gzip; `/img/C1.jpg` referenced by `src/index.css:123` is unresolved; dynamic import of `src/domain/rewards.ts` will not split because the module is also statically imported.
- `npm run lint` fails with 9 errors and 3 warnings.
- `npm audit --omit=dev` reports 5 production vulnerabilities: 4 high, 1 moderate.

What is not covered:

- Task approval idempotency and exact-once credit awarding.
- Reward purchase atomicity under concurrent requests.
- RLS access boundaries for tasks, rewards, credits, collected rewards, profiles, and friendships.
- Edge Function authorization and spoofing resistance.
- Storage upload authorization and file constraints.
- Auth callback, onboarding gate, and localStorage reset behavior.
- Mobile modal/layer behavior, despite repeated fixes in comments.

Critical flows without tests:

- Assignee submits proof, creator approves, credits are awarded once.
- Reward claim deducts credits, writes collection row, writes transaction row, deactivates reward, and prevents duplicate claim.
- User cannot update `user_credits` directly.
- User cannot read or collect another user's assigned reward.
- Public/unauthenticated callers cannot trigger email sends.

Best next 10 tests before launch:

1. SQL/RPC test: `approve_task` approves only creator-owned review tasks and awards credits exactly once under two concurrent calls.
2. SQL/RPC test: `purchase_reward` rejects mismatched `p_collector_id` vs `auth.uid()`.
3. SQL/RPC test: `purchase_reward` rejects self-purchase, insufficient funds, inactive reward, and duplicate purchase.
4. RLS test: authenticated users cannot INSERT or UPDATE their own `user_credits` row directly.
5. RLS test: collectors can read their own `collected_rewards`; other users cannot.
6. Edge Function test: `notify-reward-creator` rejects missing token, mismatched collector, and nonexistent purchase record.
7. Edge Function test: `send-new-bounty-alert` and `send-proof-submitted-alert` reject unauthenticated/spoofed callers after hardening.
8. Hook/domain unit test: `src/core/contracts/contracts.domain.ts` status transitions for assignee, creator, proof-required, and completed states.
9. Component integration test: issued mission approval disables duplicate clicks and refetches visible state.
10. E2E smoke test: sign in, create friend request, create mission, submit proof, approve, spend credits on reward.

# 9. Performance and Scaling Review

Expensive frontend renders:

- Large pages/components: `Friends.tsx` 757 lines, `Dashboard.tsx` 509 lines, `IssuedPage.tsx` 550 lines, `MissionModalShell.tsx` 510 lines, `TaskCard.tsx` 410 lines.
- `useTasks.ts` refetches all tasks on every realtime event at `144-157`.

Inefficient database calls:

- `useFriends.ts:50-60` performs an N+1 profile fetch for each friendship.
- `useRewardsStore.ts:89-104` and `useCollectedRewards.ts:84-99` do manual profile lookup and merging. This is tolerable at small scale but should become a view/RPC/read model.

N+1 patterns:

- Friends profile hydration is the clearest N+1. Replace with relational select or batch profile query.

Large client bundles:

- Build warns one JS chunk is larger than 500 kB: 697.72 kB minified.
- `googleapis` is in dependencies. If bundled into the browser path, it is suspicious for a React SPA and should be verified.

Blocking long-running API calls:

- Edge email functions synchronously call Gmail/Resend before returning.
- Reward notification is triggered after purchase from client code, so slow/failing email providers affect user-visible flows unless swallowed.

Missing pagination:

- `useRewardsStore.ts:79-85`, `useIssuedContracts.ts:40-48`, `useAssignedContracts.ts:40-48`, and `useArchivedContracts.ts:23-28` have no limits/pagination.
- Friend search has some limiting in docs, but current `useFriends.ts:173-177` searches exact email only.

Missing caching:

- No React Query/SWR. State is refetched manually after mutations.
- Profile data is fetched repeatedly in reward and friend flows.

File/media handling risks:

- Proofs and avatars are public per docs/inventory. Public proof URLs may expose private task evidence.
- Build carries large image assets such as `src/assets/logo5.png` around 1 MB.

External API cost risks:

- Email functions can be abused if public, causing provider costs and reputation issues.
- Realtime full refetch on every table event can increase Supabase usage as data grows.

# 10. Security and Abuse Review

Trusting client input:

- `send-new-bounty-alert` trusts `assigneeEmail`, `assigneeName`, `taskTitle`, `taskId`, and `appUrl` from request body at `67`.
- `send-proof-submitted-alert` trusts `creatorEmail`, `creatorName`, `taskTitle`, `taskId`, `proofId`, and `appUrl` from request body at `67`.
- `src/domain/rewards.ts:72-78` still sends `p_collector_id` from the browser, but the new SQL checks it against `auth.uid()` at `20260412100200...:221-227`.

Weak auth checks:

- `notify-reward-creator` has meaningful auth checks.
- The other two email functions have no visible auth checks.
- Frontend checks such as `src/hooks/useTasks.ts:186-188` and `src/domain/missions.ts:328-330` must remain UX only; backend/RLS must enforce.

Missing rate limits:

- No app-level rate limits are visible for login attempts, friend requests, reward creation, proof uploads, reward purchases, or Edge Function email sends.

Public write access:

- Schema snapshots show `user_credits` self-insert/update policies at `supabase/schema.sql:817` and `838`.
- Storage policies in `docs/sql-inventory/policies.csv` show authenticated uploads to `bounty-proofs` with only bucket check. That is too broad for a public proof bucket.

Storage abuse risks:

- Proof upload path is generated from `taskId` and timestamp at `src/hooks/useTasks.ts:56-58`, but storage policy enforcement by task assignment is not visible.
- Reward images upload to `reward-images` in `src/lib/rewardImageUpload.ts:101-103`; bucket creation/policy is documented only in comments.

Prompt injection risks if AI is used:

- No AI feature path is visible in source. No immediate prompt-injection risk found.

Webhook spoofing risks:

- No external webhooks found, but Edge Functions are webhook-like public endpoints. Email functions need auth and idempotency.

Missing audit logs:

- Credit purchase writes `credit_transactions`, but approval credit awards in `approve_task` do not visibly write `credit_transactions`.
- Friend request creation, reward creation/update/delete, proof submission, and notification sends do not have durable audit logs.

Security headers:

- `vercel.json` only defines SPA rewrites. No CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, or frame protections are visible in repo.
- `index.html` loads Google Fonts without SRI. For fonts this is common, but CSP should explicitly account for it.

# 11. Proposed Refactor Phases

Phase 0 - No-code documentation and tests.

- Goal: freeze the intended launch contract before changing behavior.
- Changes: document canonical DB state, migration order, active Edge Functions, storage buckets, and release criteria. Add test harnesses without refactoring production code.
- Files likely affected: `docs/gpt55-handoff/*`, `docs/runbooks/*`, `package.json` for test scripts, `supabase/tests/*` or equivalent.
- Tests needed: SQL/RLS tests and a minimal React test setup.
- Risk: low.
- Expected benefit: reviewers stop arguing from stale docs and can verify hardening.

Phase 1 - Launch blockers only.

- Goal: make current code releasable without changing architecture.
- Changes: fix lint errors; upgrade vulnerable dependencies; regenerate Supabase types/schema; apply credit/reward hardening migrations; add collected reward RLS; lock down credit table writes; harden or disable unauthenticated email functions.
- Files likely affected: `package.json`, `package-lock.json`, `src/types/database.ts`, `supabase/migrations/*`, `supabase/schema.sql`, `supabase/functions/*`.
- Tests needed: build, lint, npm audit, SQL/RLS tests for credits/rewards, Edge auth tests.
- Risk: medium because DB policy changes can break existing flows.
- Expected benefit: closes known release blockers.

Phase 2 - Architecture boundary cleanup.

- Goal: make task and reward business rules testable outside React.
- Changes: consolidate mission APIs into `src/domain/missions.ts` plus repository helpers; consolidate reward APIs into `src/domain/rewards.ts`; make hooks thin state adapters.
- Files likely affected: `src/hooks/useTasks.ts`, `src/hooks/useAssignedContracts.ts`, `src/hooks/useIssuedContracts.ts`, `src/hooks/useArchivedContracts.ts`, `src/hooks/useRewardsStore.ts`, `src/hooks/use*Bounty.ts`, `src/domain/*`.
- Tests needed: domain unit tests, hook integration tests with mocked Supabase.
- Risk: high if done broadly; do path-by-path.
- Expected benefit: fewer duplicate mutation paths and safer future changes.

Phase 3 - Data/auth hardening.

- Goal: enforce every sensitive action server-side.
- Changes: move proof submit, task create/update/delete, reward create/update/delete/purchase, and credit changes behind validated RPCs or Edge Functions; formalize RLS policies; make storage policies path-aware.
- Files likely affected: `supabase/migrations/*`, `supabase/functions/*`, `src/domain/*`, `src/lib/*Upload.ts`.
- Tests needed: RLS matrix tests, storage policy tests, concurrent RPC tests.
- Risk: high due to backend behavior changes.
- Expected benefit: client tampering stops mattering.

Phase 4 - UX/state cleanup.

- Goal: reduce UI state bugs and repeated refetches.
- Changes: introduce a query/cache layer or a small custom store for server state; centralize overlay/modal state; split huge pages/components.
- Files likely affected: `src/pages/Friends.tsx`, `src/pages/Dashboard.tsx`, `src/pages/IssuedPage.tsx`, `src/pages/RewardsStorePage.tsx`, `src/components/TaskCard.tsx`, `src/components/modals/MissionModalShell.tsx`, `src/context/UIContext.tsx`.
- Tests needed: component tests for tabs/modals, E2E smoke for mobile overlays and pull-to-refresh.
- Risk: medium.
- Expected benefit: fewer regressions in mobile/modal flows.

Phase 5 - Scaling and provider abstraction.

- Goal: prepare for more users without data/query sprawl.
- Changes: add pagination, read-model RPCs/views, batch profile fetches, route-level code splitting, async notification queue, provider-neutral email adapter.
- Files likely affected: `src/hooks/useFriends.ts`, `src/hooks/useRewardsStore.ts`, `src/hooks/useCollectedRewards.ts`, `supabase/functions/*`, `vite.config.ts`.
- Tests needed: performance smoke, query count tests, email provider contract tests.
- Risk: medium.
- Expected benefit: predictable cost and faster UI.

Phase 6 - Post-launch improvements.

- Goal: improve maintainability after the critical paths are safe.
- Changes: remove changelog comments, archive unused recurring task code or fully implement it, clean generated artifacts, add observability, add error boundaries.
- Files likely affected: broad source cleanup, `docs/history`, `supabase/functions/create-daily-tasks`, root artifacts.
- Tests needed: regression suite from earlier phases.
- Risk: low to medium.
- Expected benefit: easier onboarding and lower maintenance drag.

# 12. What GPT-5.5 Pro Should Decide

- Should launch target the current Supabase-direct architecture, or should all sensitive mutations move behind RPC/Edge Functions before public release?
- Which database artifact is canonical: `supabase/schema.sql`, `supabase/schema_all.sql`, migration files, or production Supabase? This must be resolved before any launch call.
- Should rewards be strictly one-time assigned rewards, or marketplace-like items visible to more than one user? Current policy comments and UI labels disagree.
- Should `user_credits` be a strictly server-owned ledger projection with no client table writes? The answer should be yes for launch, but GPT-5.5 Pro should define the migration path.
- Should `collected_rewards` be readable only by collector and creator, or also by assignee/assigned reward participant? This affects RLS and UI tabs.
- Should notification sending be async and server-triggered from purchase/proof/task events instead of client-triggered?
- Should the backend be split into explicit service RPCs for missions, rewards, credits, friends, and profile, or should Supabase table access remain in frontend hooks with stronger RLS?
- Should provider logic be abstracted now for email/storage, or should current Supabase/Resend/Gmail-specific code be hardened first?
- Should state management move to React Query/SWR before launch, or after the critical DB/security work?
- Should onboarding completion remain localStorage-only, or become a profile/server flag?
- Should recurring/daily task code be removed before launch if not productized? `create-daily-tasks` currently references table names that do not match the documented recurring schema.
- Should public proof storage be allowed at all, or should proof media use signed URLs and private buckets?
- Should the app be hardened incrementally or rewritten in parts? Recommendation: harden incrementally. The product model is coherent; the risk is not React itself, it is boundary sprawl and inconsistent backend truth.
