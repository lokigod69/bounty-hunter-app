# Native push — rollout and activation

Verified 2026-09-07. Proposal 020 is **already live, dormant**. Do not reapply it. Technical review was delegated by Michael; no additional human SQL review is required. Apple access and successful device acceptance are separate prerequisites.

## What is deployed

`020_native_push.up.sql` adds private device/queue tables, caller-bound registration, service-only dispatch RPCs, authoritative mission/reward/connection triggers and the expanded account-deletion inventory. Three gates remain off: database `push_settings.enabled`, Vercel `APNS_ENABLED`, and build-time `VITE_PUSH_ENABLED`. No device token is registered or sent by this rollout.

One Node HTTP/2 dispatcher at `/api/dispatch-push` sends to Apple's fixed APNs hosts. It accepts only POST with a dedicated bearer secret. The Supabase service key and Apple key stay in server variables, never `VITE_` variables. Alerts contain generic copy and validated identifiers, without mission text, names or arbitrary URLs. Taps re-read current authorized data.

The queue leases ten deliveries for two minutes, caps retries at five and expires deliveries after 24 hours. Registration is tied to the actual Auth session and device installation. Deletion, sign-out, blocking, token reassignment and account switching invalidate or suppress delivery. APNs acceptance is not a device-delivery receipt; alerts already sent cannot be recalled. Old Apple invalidation responses cannot remove newer registrations.

## Evidence and reversal

- Actual live-019 schema/ACL backup: `schema_acl_20260907_210156_964.backup`, SHA256 `CD8966A6752C82E0359BD53584A914701331C3B0697423B3E2CA9B6BCB11F0C6`. It excludes Auth/app rows and Storage bytes; it is not a full disaster-recovery backup.
- Actual archive restore and 020 rehearsal: [record](../release/verification/push-rehearsal.json).
- Hosted apply/validator: [apply](../release/verification/020-live-apply.txt), [validation](../release/verification/020-live-validation.txt).
- 106 PostgreSQL checks cover 018–020, races, grants, lifecycle and restoration. Hosted acceptance additionally verifies disabled registration, private-schema denial, service-only dispatch and deletion after 020.
- Independent read-only review found no remaining blocker for the dormant rollout after fixes for account-switch revocation, deletion freezes and timestamped Apple invalidation.

Revert the client/server source independently if necessary. Leave the dormant schema in place: blindly dropping 020 breaks the exact deletion inventory. To suspend an activated system, disable the database gate first (this clears pending deliveries), set `APNS_ENABLED=false`, and disable its scheduler. Remove tables only through a separately reviewed forward migration that also restores the deletion guard.

## Apple activation

1. Obtain access to the enrolled Apple Developer team, register `com.bountyhunter.app` with Push Notifications, and create the signing profile and APNs authentication key. Never put keys in chat or source.
2. Set Vercel **server-only** variables: `SUPABASE_URL=https://mvbmpcmexkgfairnthux.supabase.co`, `SUPABASE_SERVICE_ROLE_KEY`, a new random `PUSH_DISPATCH_SECRET` of at least 32 characters, `APNS_TEAM_ID`, `APNS_KEY_ID`, `APNS_PRIVATE_KEY`, and `APNS_ENVIRONMENT`. Keep `APNS_ENABLED=false` while configuring. Redeploy after changing server configuration.
3. Match all three environments: database setting, dispatcher `APNS_ENVIRONMENT`, and app `VITE_APNS_ENVIRONMENT` plus signed `aps-environment` entitlement. Debug uses development; TestFlight/Release uses production. Do not switch a live production queue to development. Use an isolated test environment for sandbox acceptance.
4. Prepare a signed internal build with `VITE_PUSH_ENABLED=true`. Only the explicit Profile notification action may prompt. Existing permission may be reused; permission is not proof that registration or delivery succeeded.
5. Enable the database and dispatcher only for controlled internal acceptance after configuration is validated. Confirm method/auth failures before making one authenticated dispatch. See the device matrix below. Keep public distribution closed until it passes.
6. Install one scheduler after controlled acceptance. No scheduler is currently installed; `pg_net` and Vault exist on the project, but `pg_cron` was absent at inspection. Do not add a second notification service.

## Scheduler recipe — prepared, not installed or verified live

Use Supabase's documented `pg_cron` + `pg_net` + Vault pattern to wake the Vercel dispatcher. Store the dedicated dispatch secret in Vault as `bounty_push_dispatch_secret` through secure provider configuration. Enable `pg_cron` through Supabase Extensions. Before scheduling, verify the secret exists and is at least 32 characters **without selecting its plaintext**. The command below contains only a secret reference, not its value. Run with the guarded backup/apply workflow after reviewing the exact extension state.

```sql
select cron.schedule(
  'bounty-push-dispatch', '* * * * *',
  $job$
  select net.http_post(
    url := 'https://www.bountyhunter.xyz/api/dispatch-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'bounty_push_dispatch_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) where exists (
    select 1 from bounty_private.push_settings where singleton and enabled
  );
  $job$
);
```

Use the stable `www` production origin to avoid redirects. Verify one named job, its execution result and the HTTP response; a successful cron invocation alone does not prove successful dispatch. Missing authentication must return 401, wrong method 405, disabled service 503. Monitor aggregate accepted/retry/discard counts, oldest pending age and failed HTTP responses. Never log tokens or keys. Ten deliveries per minute is intentionally bounded; revisit capacity only when measured demand requires it. Disable with `cron.unschedule('bounty-push-dispatch')` after verifying that exact job exists.

Reference: [Supabase scheduling and Vault guidance](https://supabase.com/docs/guides/functions/schedule-functions). This recipe requires a live smoke test after installation; it is not evidence of an active scheduler.

## Required signed-device acceptance

- Fresh permission prompt, denial, Settings re-enable, disable/re-enable; no prompt on initial login.
- Foreground/background/terminated app: each supported event reaches its intended account; tap opens current mission/collection/People content.
- Sign out A and sign in B, including slow network overlap and old Notification Center alerts. No A content or registrations become B's. Native activation clears delivered alerts.
- Block, disconnect, delete a mission and delete an account before dispatch. No new unauthorized alert; stale taps fail closed.
- Retry/offline/reconnect, duplicate wakeup and expired lease: bounded retries and no repeated business transaction.
- Token rotation, expired session, revoked Apple token, correct sandbox/production signing.
- Repeat core auth/invites/proofs/credits/collection/deletion flows on the signed build. Save OS/device/build and actual outcomes, not just screenshots of a simulator.
