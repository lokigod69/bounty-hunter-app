# 018 — Account deletion (staged, not applied)

Updated 2026-09-07. This source is implemented and locally tested; no live account was deleted, no Storage bytes were removed, and the Edge Function has not been deployed. The frontend must keep `VITE_ACCOUNT_DELETION_ENABLED` unset/false until the deployment checks below pass. Overall release state: [RELEASE_STATUS.md](../release/RELEASE_STATUS.md).

Production SQL still requires a verified backup and Michael's explicit approval of this concrete runbook. The project protocol requires this independently of permission to edit/push source. Do not paste database passwords or service keys into chat.

## Product behavior

The account owner explicitly confirms deletion from Profile. The endpoint accepts only the authenticated account as its destructive target. It deletes the profile, connections/invites, own credit balance/history, collected rewards and created reward offers. It also removes missions involving that account and their proof files/streaks. Other people's credit amounts and balances remain; references to removed missions are cleared. Other people's reward offers assigned to this account remain private to their creator, become inactive, and lose the assignment. Collections of a departing creator's removed reward are removed too. This shared-data effect must remain visible in the confirmation copy.

One private marker stores only account UUID, random operation UUID, session UUID, timestamps and phase. It freezes new links/writes and allows a failed request to resume across Storage, database and Auth calls. Passwords, access tokens, email addresses, names and file paths are not stored in that marker or logged by this endpoint.

| Phase | Committed state | Safe retry |
|---|---|---|
| Before start | No marker; no deletion | Authenticate again if required |
| `storage` | Account frozen; some/all matching file bytes may be removed | Reuse the operation, remove remaining Storage objects, then run relational cleanup |
| `auth` | Matching Storage objects gone; relational cleanup committed | Retry Auth admin deletion; database must confirm actual identity absence |
| `complete` | Auth identity absent | Opaque receipt confirms completion after a lost response |

No source rollback can restore already removed user data. Reverting visual changes is independent of deleting an account.

## Authentication and recovery contract

- Destructive POST body: `{ "operation_id": "<random UUIDv4>", "confirm": true }`. Extra fields, including a target user ID, are rejected. The Edge Function first verifies the exact bearer through Auth `getUser`, then binds that token's `sub` and `session_id` to the verified account. SQL confirms the same existing `auth.sessions` row, matching user, non-expired `not_after` and `created_at` within five minutes for a new operation/session. A refreshed JWT `iat` does not qualify. The same existing session can resume its own operation after five minutes; a replacement session must be fresh. [Supabase sessions](https://supabase.com/docs/guides/auth/sessions).
- Fresh email/password or OAuth login creates a qualifying session. Password reauthentication uses the current verified Auth email and must return the same account. An older OAuth/passwordless session needs a fresh login with that provider; the current UI explains signing in again. Supabase's password-update nonce method is not used as general reauthentication.
- `src/lib/accountDeletion.ts` retains only `{userId, operationId}` in localStorage, with a memory fallback. The same operation must be kept on retry. Do not discard it merely because a request returned 5xx or because refresh/signout failed.
- Read-only POST body: `{ "operation_id": "<same UUIDv4>", "receipt_user_id": "<saved account UUID>", "receipt": true }`. This separate capability uses the public anon key via direct fetch, bypassing automatic Auth refresh. It can only return whether that exact account/operation completed; it cannot start/resume deletion and reveals no account details or pending phase. This recovers a lost final response after the Auth account is gone, without retaining an expired bearer. The destructive path never derives authorization from these caller-supplied receipt fields.
- Responses contain only a generic code: `deleted`, `reauth_required`, `deletion_in_progress`, `retry_required`, `unavailable` (invalid methods/bodies also have generic errors). HTTP 202 `retry_required` is not success. The UI signs out locally only after `deleted`.
- Storage runs in 100-object batches, at most 20 batches/request; after each removal it queries from the start. A retry handles larger accounts. A missing or failed batch does not permit relational/Auth cleanup. Auth admin errors never mean success by themselves: SQL checks actual `auth.users` absence. [Auth admin deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser).

## Deployment order and review

1. Keep the UI flag off. Verify a complete restorable database backup, including all public tables, Auth data, RLS/functions/grants and schema. Storage bytes need their own retention/backup policy; a schema/database dump is not proof of a Storage backup.
2. Review/apply/validate 016, then 017 including the private `purchase_reward` authorization repair. 018 checks the complete known public-table inventory, all incoming FKs to deleted tables, private reward SELECT policy, and the reviewed purchase function before starting deletion. New personal-data tables/FKs or purchase/policy drift require an updated deletion review. No live mutation is needed for that preflight.
3. Use the exact verified schema/ACL manifest with `scripts/prod/apply_sql.ps1 -Sql db/proposals/018_account_deletion.up.sql -BackupManifest $reviewedBackup` only after explicit go. Review/apply [018_account_deletion.up.sql](../../db/proposals/018_account_deletion.up.sql). The private schema must not be added to PostgREST exposed schemas. Clients have no table access to its marker and no execution privileges on the service RPCs. `account_active` is intentionally VOLATILE so post-lock checks observe a committed deletion marker. Normal client and service uploads/updates check frozen actors/linked accounts; Storage service deletes and the transaction-local relational cleanup can remove frozen data.
4. After 018 validation, staged 019 extends the exact FK inventory with blocks/reports/budgets and gives those tables the same deletion freeze. Apply its separate runbook before enabling contact safety. Validate 018 read-only using [018_validation.sql](../../db/proposals/018_validation.sql). Earlier 016/017 exact policy-count validation is intended before 018: 018 intentionally adds restrictive policies and triggers. Do not reapply earlier migrations blindly over them.
5. Deploy `supabase/functions/delete-account` only with reviewed SQL in place. It uses server-provided `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; no new third-party credential is needed. Keep the gateway JWT check enabled with the current legacy anon JWT key. Confirm the receipt request works with the project's public key; a future switch to publishable keys/asymmetric JWT signing requires the corresponding current gateway configuration review. Never ship a service key as `VITE_*`.
6. Run the real staging matrix below with disposable accounts and actual Supabase Storage/Auth APIs. Prove the fresh email session and native callback route on an iPhone too. Only after those checks, set `VITE_ACCOUNT_DELETION_ENABLED=true` in the intended production/native build and redeploy/rebuild. An enabled UI without deployed/verified deletion is not release-ready.

## Verification and limits

Local commands:

```text
node db/proposals/018_test.mjs
npx vitest run src/lib/accountDeletion.test.ts
npx tsc -p tsconfig.app.json --noEmit
deno check supabase/functions/delete-account/index.ts
```

The disposable PostgreSQL runner accepts no connection input and only starts localhost on a random port. It loads the actual saved public table definitions and confirmed live FKs/policies, then 016/017/018. It checks permissions, session freshness/expiry, shared cleanup, privacy of detached rewards, retained balances, schema drift, Storage inventory, uppercase proof UUID paths, stale JWT writes, ordinary service uploads and repeatable completion. A two-session test starts a mutation before the marker commits, proves it is waiting on the advisory lock, commits deletion, then verifies the mutation is rejected using the new snapshot. Local tests simulate successful Storage and Auth API calls with FK-enforced test rows; they do not prove hosted Storage removes bytes or Auth invalidates real refresh tokens.

Required staging cases before enabling:

- Two reciprocal accounts, unrelated third account, balances/transactions, rewards/collections, legacy owned objects, service-owned canonical avatars/rewards and task-scoped proofs (including uppercase UUID path segments). Delete one; verify bytes are gone through actual Storage APIs, unrelated data remains, detached reward is private/inactive and cannot be bought by UUID.
- Fail a Storage removal midway, then fail relational cleanup, then fail/lose the Auth response. Retry with the same saved operation after reload. Never display success while Auth exists. Verify direct receipt after account removal even when automatic token refresh fails.
- Race uploads/updates from the owner, counterpart and ordinary service client with begin-deletion. Confirm active owner operations continue working outside deletion. The local SQL race proves lock/snapshot behavior, but actual Storage service transactions and in-flight upload cleanup need hosted verification.
- Old/refreshed token, missing/foreign session, expired session, wrong receipt user/operation, extra caller target, pending operation replacement and revoked session. No other account can be deleted. A fresh replacement login can resume the existing operation.
- Actual login/refresh after completion fails; lingering JWT cannot recreate app/Storage data. Native Profile confirmation remains readable and recoverable, and successful deletion signs out locally.

Supabase requires removing Storage through its API rather than deleting metadata rows. The migration never deletes `storage.objects` rows. The test runner's synthetic row removal must never be copied into production instructions. [Storage deletion](https://supabase.com/docs/guides/storage/management/delete-objects), [user deletion and existing JWTs](https://supabase.com/docs/guides/auth/managing-user-data).

## Operations, partial failures and retention

- If a request is pending/failed, leave its marker and freeze intact. Never delete the marker to make a half-deleted account usable, and never accept an operator-supplied account UUID through the public destructive endpoint. Retry by its owner with the same operation and valid session. A lost operation/browser storage needs a trusted support recovery procedure: verify the owner through Auth, recover the existing operation through service-only administration, and resume; the code deliberately does not reveal pending receipts through an unauthenticated lookup.
- A completed receipt stores pseudonymous identifiers, not content. Before opening release, choose and document its retention period and implement/review the cleanup mechanism. Recommended policy: retain completion receipts for seven days for response-loss recovery; purge only completed entries after that period. Pending `storage`/`auth` markers must not be purged automatically. If Auth is already absent and phase is `auth`, a service-only reconciliation may mark it complete before later purging. No retention cron/job has been deployed or claimed here.
- Explain ordinary database backup/log retention in the privacy policy; immediate live deletion does not erase historical backups. Operator contact/support and the final retention policy remain real owner inputs.
- On a deployment problem, disable the UI flag and stop new endpoint starts while preserving private markers/guards. Repair and resume existing operations. Do not roll back 018 or remove its protections while any operation is pending. Inspect only aggregate phase/error counts for normal monitoring; do not log request bodies, tokens, names or Storage paths.

Remaining release gates are hosted API/device tests, reviewed production migration/deployment, a usable support recovery path and implemented receipt retention. They are distinct from the locally passing implementation.
