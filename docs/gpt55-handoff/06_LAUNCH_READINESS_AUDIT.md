# 1. Launch Readiness Verdict

**Not launchable.**

The app can build, and the core React/Supabase flow is recognizable, but it is not ready for real users because several trust boundaries are still enforced mainly by client code or comments rather than database/API rules. The biggest blockers are mutable credit balances through table RLS, broad task update policies, missing storage bucket/policy migrations, broken or unproven fresh database migration safety, unauthenticated/under-authorized email Edge Functions, and no app test suite. A private beta is reachable, but only after the minimum fix set in section 11.

Build status checked from this working tree:
- `npm run build`: passes.
- `npm run lint`: fails with unused-symbol errors in `src/components/TaskCard.tsx`, `src/components/onboarding/OnboardingStep2Reward.tsx`, `src/pages/Dashboard.tsx`, `src/pages/IssuedPage.tsx`, and `src/utils/getErrorMessage.ts`.
- No app tests are configured in `package.json`; only `dev`, `build`, `lint`, and `preview` exist.
- The worktree is currently dirty with existing unrelated edits/deletions, including Supabase migration/function movement. Treat this audit as a current-working-tree review, not a clean-release review.

# 2. Critical Launch Blockers

## Blocker 1: Users can directly change their own credit balance

**Issue.** `user_credits` is directly writable by authenticated clients through table policies.

**Evidence.** `supabase/schema.sql` defines `Users can insert own credits` and `Users can update own credits` policies on `public.user_credits`. The latest hardening migration `supabase/migrations/20260412100100_lock_down_increment_user_credits.sql` revokes direct RPC execution, but it does not drop the table policies.

**File(s)/route(s).** `supabase/schema.sql` lines 817-838; `supabase/migrations/20260412100100_lock_down_increment_user_credits.sql` lines 34-38; `src/hooks/useUserCredits.ts` lines 35-37 and 57-59 initialize rows from the browser.

**Risk.** Any authenticated user can call the Supabase REST API and update their own `balance`/`total_earned`, then purchase rewards. This breaks the product economy.

**Recommended fix.** Remove browser `INSERT`/`UPDATE` policies on `user_credits`. Create server-owned RPCs for initialization, credit awards, and purchases only. Keep client access to `SELECT` own credits.

**Test needed.** Authenticated user should fail direct `insert`/`update` against `user_credits`; approving a valid task should still award credits; purchasing a reward should still deduct credits atomically.

## Blocker 2: Task lifecycle can be tampered with through broad task RLS

**Issue.** Task status transitions are largely protected in TypeScript, but database RLS lets creators and assignees update task rows broadly.

**Evidence.** `supabase/schema.sql` has `Update tasks` allowing `auth.uid() = created_by OR assigned_to`, plus separate `Users can update assigned tasks` and `Users can update own created tasks`. The policy does not restrict columns or validate transitions. `src/domain/missions.ts` validates transitions in browser-facing code, but direct REST calls can bypass it.

**File(s)/route(s).** `supabase/schema.sql` lines 796, 824, 831; `src/domain/missions.ts` lines 149-216; `src/pages/Dashboard.tsx` lines 155-159.

**Risk.** A user can bypass UI controls to alter `status`, `completed_at`, `proof_url`, `reward_text`, `assigned_to`, `is_archived`, or proof fields. Depending on triggers/RPCs present in production, this can cause false completions, bad audit history, or incorrect credit awards.

**Recommended fix.** Replace direct task status updates with server RPCs for `start_task`, `submit_task_for_review`, `reject_task`, `archive_task`, and `approve_task`. Narrow table `UPDATE` policies so clients cannot write lifecycle or reward fields directly.

**Test needed.** Direct REST update by assignee to `status='completed'` must fail. Valid assignee submit-for-review must pass via RPC. Creator approval must pass only from `review` and award credits once.

## Blocker 3: Storage buckets and policies are not represented in migrations

**Issue.** The app uploads avatars, proof files, and reward images, but the repo has no SQL migration creating Supabase Storage buckets or `storage.objects` policies.

**Evidence.** Frontend code references `avatars`, `bounty-proofs`, and `reward-images`. A repository-wide SQL search found no `storage.buckets`, `storage.objects`, bucket policy, or bucket creation migration.

**File(s)/route(s).** `src/components/ProfileEditModal.tsx` lines 122-132; `src/pages/ProfileEdit.tsx` lines 119-130; `src/domain/missions.ts` lines 249-268; `src/hooks/useTasks.ts` lines 556-571; `src/lib/rewardImageUpload.ts` lines 30-35 and 102-115.

**Risk.** Uploads may fail in a fresh/staging/prod project, or bucket permissions may be configured manually and drift silently. Public proof URLs can expose sensitive user proof media if buckets are public.

**Recommended fix.** Add migrations or deployment scripts that create required buckets and least-privilege storage policies. Prefer private proof files with signed URLs. Reward images and avatars can be public if that is an explicit product decision.

**Test needed.** Fresh Supabase project should create all buckets/policies from repo scripts. Authenticated users can upload only to their own avatar path, assigned-task proof path, and own reward image path. Other users cannot overwrite or delete.

## Blocker 4: Proof type/file handling is inconsistent with database constraints

**Issue.** The proof UI allows text/PDF submissions, but the database check constraint only allows `proof_type` of `image` or `video` in the schema dump.

**Evidence.** `ProofModal` accepts images and PDF and text descriptions. `src/domain/missions.ts` writes `proof_type='text'` for text proof and `proof_type='image'|'video'` for files. `supabase/schema.sql` allows only `image` and `video`.

**File(s)/route(s).** `src/components/ProofModal.tsx` lines 65-78 and 151-152; `src/lib/proofConfig.ts` lines 18-22; `src/domain/missions.ts` lines 242-253 and 289-293; `supabase/schema.sql` line 461.

**Risk.** Text-only proof and PDF proof can fail at database write time or produce misleading success/error states. Users may lose proof context after upload/update failures.

**Recommended fix.** Decide the supported proof types and align UI, upload validation, database check constraints, and rendering. If text/PDF are supported, extend the constraint and rendering. If not, remove them from the UI.

**Test needed.** Submit text-only, JPG, PNG, PDF, and unsupported file proof against a fresh database and verify the expected success/failure path.

## Blocker 5: Fresh database migration path is not safe

**Issue.** Current migrations reference recurring-task tables/templates that are not created in the migration chain, and the canonical schema dump does not reflect later migration intent.

**Evidence.** `supabase/migrations/20250615224500_create_or_update_recurring_task_instances.sql` creates `recurring_task_instances` with a foreign key to `public.recurring_task_templates`, but no migration creates `recurring_task_templates`. `supabase/functions/create-daily-tasks/index.ts` uses different names: `recurring_contract_templates` and `recurring_contract_instances`. `supabase/schema.sql` still includes legacy triggers/functions that the April 2026 hardening migration drops.

**File(s)/route(s).** `supabase/migrations/20250615224500_create_or_update_recurring_task_instances.sql` lines 7-33; `supabase/functions/create-daily-tasks/index.ts` lines 38-41, 61-67, 80-96; `supabase/schema.sql` lines 577-594; `supabase/migrations/20260412100200_phase1_reward_and_rpc_hardening.sql` lines 6-23.

**Risk.** A clean staging/prod restore from migrations may fail or produce a schema different from the developer’s current database. That makes rollback, disaster recovery, and onboarding new environments unsafe.

**Recommended fix.** Run `supabase db reset` from scratch and fix the migration chain until it is deterministic. Either remove unfinished recurring-task migrations/functions or add the missing template migrations and naming consistency.

**Test needed.** Clean database reset, seed, and validation script run must pass without manual SQL. Then run core user flows against that clean schema.

## Blocker 6: Email Edge Functions are under-authorized and can send arbitrary content

**Issue.** Two notification functions accept recipient email and message content directly from request body without verifying the caller owns the task/reward event.

**Evidence.** `send-new-bounty-alert` reads `assigneeEmail`, `assigneeName`, `taskTitle`, `taskId`, and `appUrl` from `req.json()` and sends email. `send-proof-submitted-alert` does the same for `creatorEmail`, `creatorName`, `taskTitle`, `taskId`, `proofId`, and `appUrl`. Neither function validates a Supabase user, task relationship, or event record. `notify-reward-creator` does authenticate the collector and checks `collected_rewards`, so it is closer to acceptable.

**File(s)/route(s).** `supabase/functions/send-new-bounty-alert/index.ts` lines 63-116; `supabase/functions/send-proof-submitted-alert/index.ts` lines 63-116; `supabase/functions/notify-reward-creator/index.ts` lines 80-131.

**Risk.** If JWT verification is disabled or relaxed in deployment, these functions become an email relay. Even with JWT verification, any authenticated user can attempt arbitrary notification emails unless function invocation is disabled or code-level authorization is added. The HTML email also interpolates unsanitized user/task text.

**Recommended fix.** Remove unused notification functions or require authenticated user context, look up the task/reward server-side, verify actor authorization, derive recipient email from trusted database rows, escape all interpolated HTML, and rate limit.

**Test needed.** Anonymous requests fail. Authenticated unrelated user requests fail. Authorized creator/assignee event sends to the database-derived recipient only. HTML injection payload is escaped.

## Blocker 7: No automated regression coverage for launch-critical flows

**Issue.** There is no app test runner or app test suite in `package.json`, and no `src` test files were found.

**Evidence.** `package.json` scripts only include `dev`, `build`, `lint`, and `preview`. `Get-ChildItem src -Recurse -Include *.test.*,*.spec.*` returned no app tests.

**File(s)/route(s).** `package.json`; `src/domain/missions.ts`; `src/domain/rewards.ts`; `supabase/migrations/*`.

**Risk.** Credit awarding, purchase locking, RLS behavior, proof submission, and onboarding can regress without signal. For this app, those are not cosmetic; they are the product.

**Recommended fix.** Add focused unit tests for domain rules, database/RLS integration tests against local Supabase, and minimal Playwright smoke tests for auth/onboarding/tasks/rewards.

**Test needed.** See section 9.

# 3. Private Beta Risks

- `npm run lint` currently fails. This is acceptable only if tracked as a release gate before public beta; it blocks clean CI.
- `src/lib/ftxGate.ts` stores onboarding completion only in `localStorage`, so a user can be sent back through onboarding on a new device/browser or after clearing storage.
- `src/domain/rewards.ts` has an onboarding path that directly inserts `rewards_store` with `assigned_to: null`, while the schema dump shows `assigned_to NOT NULL`. Migration `20250128000000_allow_unassigned_rewards_for_onboarding.sql` intends to loosen this, but the source of truth is unclear.
- `src/hooks/useRewardsStore.ts` creates rewards assigned to `user.id` in lines 136-143, but the canonical reward RPC requires accepted friendship and rejects self-assignment. This path looks stale or not exercised.
- `src/hooks/useCollectedRewards.ts` expects direct `SELECT` access to `collected_rewards`, but `supabase/schema.sql` enables RLS with no policies. `db/proposals/003_rls_collected_rewards.up.sql` documents the missing policies, but it is not in `supabase/migrations`.
- Reward image upload can leave orphaned files if reward creation/update fails after upload. See `src/components/CreateBountyModal.tsx` and `src/lib/rewardImageUpload.ts`.
- Task proof upload can leave orphaned files if storage upload succeeds but the task update fails. See `src/domain/missions.ts` lines 249-300 and `src/hooks/useTasks.ts` lines 556-593.
- Public profile reads expose all profile emails because `profiles` has a public select policy and multiple profile queries fetch email. See `supabase/schema.sql` line 768 and `src/hooks/useTasks.ts` lines 81-92.

# 4. Public Launch Risks

- No rate limiting for task creation, reward creation, proof upload, profile updates, friend requests, or reward purchase attempts beyond default Supabase/Auth limits.
- Realtime subscriptions watch whole tables (`tasks`, `friendships`) and refetch on every change. This can become noisy as user count grows. See `src/hooks/useTasks.ts` lines 144-167 and `src/hooks/useFriends.ts` lines 124-143.
- Large client bundle warning: production JS is about 697 KB minified. This is not a blocker, but it affects mobile launch quality.
- Uploaded proof/reward/avatar media has no malware scanning, image transformation, EXIF stripping, or moderation.
- No error tracking, no product analytics, and no admin dashboard make support and incident triage manual.
- Email delivery uses mixed providers: `notify-reward-creator` uses Resend, while other functions use Gmail OAuth. This complicates deliverability and secret management.
- Generated email links point to `/dashboard/bounties/...`, but app routes are `/`, `/issued`, `/rewards-store`, `/my-rewards`, etc. See `App.tsx` routes and Edge Function link construction.

# 5. Security Checklist

- **Auth:** Protected client routes exist in `src/App.tsx`, but Supabase Auth config has `enable_confirmations = false`, `minimum_password_length = 6`, `secure_password_change = false`, and no MFA/captcha in `supabase/config.toml`.
- **Authorization:** Rewards purchase RPC is reasonably hardened in `20260412100200_phase1_reward_and_rpc_hardening.sql`, but task updates and credit table writes remain too broad.
- **Database permissions:** `user_credits` direct insert/update policies are launch blockers. `tasks` update policies are too permissive. `collected_rewards` policy state is inconsistent between schema and proposals.
- **Storage permissions:** Missing bucket/policy migrations for `avatars`, `bounty-proofs`, and `reward-images`.
- **Secrets:** `.env.local` is ignored, but Edge Functions depend on `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, Gmail OAuth secrets, and `SUPABASE_SERVICE_ROLE_KEY`. No documented production secret checklist was found in this handoff target.
- **Webhooks/functions:** `send-new-bounty-alert` and `send-proof-submitted-alert` need code-level auth and event verification. `create-daily-tasks` uses service-role bearer comparison, but table names do not match migrations.
- **Rate limits:** Supabase Auth has local defaults, but app-level mutation/upload/Edge Function rate limits are absent.
- **Admin routes:** No visible admin route in `src/App.tsx`. `profiles.role='admin'` exists and gives full task access in schema, but there is no documented admin role assignment/audit process.
- **File uploads:** Client-side size/type checks exist, but storage policies, server-side MIME enforcement, scanning, and private proof access are missing.
- **User-generated content:** Task titles/descriptions, reward names/descriptions, display names, proof descriptions, and email HTML are not centrally sanitized/escaped for all contexts.
- **AI/provider abuse:** No AI provider use found in the app path. Email provider abuse is applicable and currently a risk.

# 6. Data Integrity Checklist

- **Status transitions:** Client/domain rules exist, but DB does not enforce transitions except `approve_task`. Move all lifecycle changes to RPCs or triggers.
- **Duplicate submissions:** `approve_task` is atomic for `review -> completed`, but proof submissions can be repeated and overwrite proof fields. Decide whether resubmission is allowed.
- **Race conditions:** Reward purchase uses `FOR UPDATE` on credits and reward rows and catches unique violations. Confirm the unique constraint exists in production (`collected_rewards_reward_id_unique` or equivalent).
- **Failed payments:** No real payments found. Credit purchases are internal only.
- **Failed AI jobs:** Not applicable.
- **Failed email jobs:** Notification failure is swallowed in `src/hooks/useRewardsStore.ts` lines 61-69. There is no retry queue or visible delivery status.
- **Orphaned records:** Deleting rewards manually deletes `collected_rewards` first in RPC. Uploaded files are not cleaned up on failed DB writes or reward deletion.
- **Deletion behavior:** Task deletion does not cascade/delete proof files reliably in all paths. Reward deletion removes collected records, which may erase redemption history.
- **Migration safety:** Not safe until a clean Supabase reset passes. Current recurring migrations and schema dump conflict.
- **Backup assumptions:** Production backup/restore is not encoded in the repo. Runbooks exist under `docs/runbooks`, but this audit did not find a verified restore drill artifact.

# 7. UX Trust Checklist

- **Mock features that look real:** `src/pages/MarketplacePage.tsx` is a placeholder, though `App.tsx` does not route to it. Keep it unreachable or label it clearly.
- **Confusing empty states:** Onboarding depends on local storage and whether missions/rewards exist; new-device behavior can be confusing.
- **Bad loading states:** Many flows use toasts and spinners, but notification failure is silent after purchases.
- **Misleading success states:** Upload flows can upload a file then fail DB update; ensure the UI does not imply final success until both complete.
- **Inconsistent wording:** The code mixes “bounty,” “reward,” “mission,” “contract,” “gift,” and “task.” This matters for trust during purchase/approval.
- **Broken mobile flows:** The code has many Android-specific workarounds, but no automated mobile viewport tests.
- **Accessibility basics:** Some labels exist, but modal focus trapping, escape handling, and keyboard return focus are not consistently evident.
- **Error messages:** Some errors expose raw database messages; others are swallowed. Standardize user-safe messages plus developer logs.

# 8. Observability and Debugging

- **Logging:** Browser toasts and Edge Function `console.log/error` only. No structured client/server logs.
- **Error tracking:** No Sentry/LogRocket/PostHog/etc. integration found.
- **Analytics:** No product analytics found.
- **Admin visibility:** No admin dashboard for users, tasks, rewards, purchases, proof status, or email delivery.
- **Job status visibility:** No queue/job table for emails or recurring daily task generation.
- **Audit trail:** `credit_transactions` exists, but task status changes, proof submissions, reward edits/deletes, and admin actions do not have a durable audit trail.
- **User support/debuggability:** No support tooling to inspect a user’s current state, failed upload, failed notification, or disputed credit balance.

# 9. Testing Before Launch

## Must-have automated tests

- RLS integration: direct client cannot mutate `user_credits`, cannot tamper task lifecycle fields, cannot read/update unrelated users’ rows.
- RPC integration: `approve_task` awards credits exactly once under double-click/concurrent calls.
- RPC integration: `purchase_reward` rejects insufficient funds, self-purchase, wrong collector, inactive reward, and concurrent double purchase.
- Storage integration: bucket policies allow only expected upload/read/delete behavior for `avatars`, `bounty-proofs`, and `reward-images`.
- Domain unit tests for `evaluateStatusChange`, proof validation, and reward purchase response mapping.
- Migration test: clean Supabase reset plus seed from repo, no manual SQL.

## Must-have manual QA flows

- Sign up/log in via Google, password, and magic link on desktop and mobile.
- First-time onboarding creates/does not create expected missions/rewards and does not loop.
- Create a friend request, accept/reject/cancel/remove friend.
- Creator creates mission with proof required; assignee submits proof; creator approves; credits increase once.
- Creator creates mission without proof; assignee submits for review; creator approves.
- Creator rejects proof; assignee resubmits; creator approves.
- Create reward for a friend; friend purchases it; balance deducts; creator notification behavior is visible or logged.
- Upload avatar, reward image, and proof file from mobile.

## Nice-to-have tests

- Playwright mobile viewport smoke tests for Dashboard, Issued, Rewards Store, My Rewards, Friends, Profile.
- Accessibility checks for modals and keyboard navigation.
- Bundle budget test for production JS.
- Email rendering snapshot tests with escaped user content.

## Regression tests

- Credit balance cannot go negative.
- Completed task cannot be approved twice.
- Inactive reward cannot be purchased.
- Deleted reward does not break My Rewards.
- Onboarding state is stable across refresh.
- Lint and build run in CI on every PR.

# 10. Launch Plan Recommendation

1. **Local verification:** Clean `npm install`, `npm run lint`, `npm run build`, and local Supabase reset from migrations. Do not proceed while reset/lint fail.
2. **Staging:** Create a fresh Supabase project from migrations only, configure storage buckets through code, configure secrets, and seed test users.
3. **Internal test:** Run the must-have manual flows with 2-3 internal accounts and intentionally malicious REST calls against RLS.
4. **Private beta:** Invite a small known group after section 11 is complete. Keep email notifications optional and monitored.
5. **Public beta:** Add observability, rate limits, support/admin views, storage privacy, and a regression suite.
6. **Production:** Only after backup/restore has been tested and support/debug flows are operational.
7. **Monitoring:** Track auth failures, RPC failures, storage upload failures, purchase failures, email failures, and database errors daily during beta.

# 11. Minimum Fix Set

Smallest realistic set needed to reach private beta:

- Drop direct client insert/update access on `user_credits`; replace browser initialization with a server-safe RPC or trigger.
- Narrow task `UPDATE` policies and move status/proof/archive lifecycle writes behind RPCs.
- Add storage bucket and storage policy migrations for `avatars`, `bounty-proofs`, and `reward-images`.
- Align proof UI, allowed MIME types, and DB `proof_type` constraints.
- Make clean Supabase reset pass from migrations, or remove unfinished recurring-task migrations/functions from the launch path.
- Add or migrate `collected_rewards` RLS policies into `supabase/migrations` if collected rewards are part of beta.
- Secure or remove unauthenticated/under-authorized email Edge Functions.
- Fix current lint errors and add CI running `npm run lint` and `npm run build`.
- Add minimum database/RPC tests for credits, approvals, and purchases.

# 12. Bigger Refactor Set

Longer-term stability work before public launch:

- Consolidate task/reward business logic into server RPCs with typed frontend wrappers; stop relying on client-side domain checks for authorization.
- Regenerate and enforce Supabase TypeScript types after schema cleanup; remove `as never` RPC casts in reward code.
- Introduce a durable audit/event table for task status changes, proof submissions, credit changes, reward purchases, and admin actions.
- Add a notification job table with retry state instead of fire-and-forget Edge Function calls.
- Make proof files private and serve them through signed URLs scoped to creator/assignee.
- Add admin/support views for users, missions, rewards, credits, uploads, and email/job failures.
- Normalize product language across code/UI: choose one vocabulary for mission/contract/task and reward/bounty/gift.
- Add Playwright smoke tests, Supabase RLS integration tests, and a release checklist tied to CI.
- Add observability: client error tracking, Edge Function logs/alerts, Supabase query/RPC error dashboards, and analytics for funnel health.
- Document production backup, restore, migration, rollback, and incident response procedures, then run a restore drill.
