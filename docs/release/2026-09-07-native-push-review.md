# Native push technical review — 2026-09-07

Scope: exact proposal 020, session-bound client registration and cleanup, the Vercel/APNs dispatcher, navigation, deletion integration and dormant rollout. Michael delegated the review and production go; the independent reviewer performed read-only code review and did not operate production.

## Findings addressed

1. A delayed device opt-out could revoke the next account's registration. Revocation now captures the old session's bearer in memory; asynchronous completion is fenced by session generation. Native unregister/register work is serialized. The overlap has a regression test.
2. A private delivery DELETE freeze could interrupt another user's transaction or Auth-session cascade during account deletion. The new private table freeze guards apply to INSERT/UPDATE; reviewed removal of private delivery state remains permitted. PostgreSQL checks cover session deletion while an account is frozen.
3. A delayed Apple 410 response could remove a newer same-token registration. Removal now requires the matching device version and Apple invalidation timestamp no older than its latest registration. Other permanent APNs errors discard that delivery while retaining the registration. PostgreSQL checks reproduce the stale response.
4. Capacitor's delivered-notification cleanup requires a native registration callback in the current launch. The Swift delegate therefore also clears delivered alerts when the app becomes active. Signed-device acceptance must verify the cold-start/account-switch behaviour.

Final independent conclusion: no residual blocker found for the **dormant** rollout. Keep all production gates off until Apple configuration, scheduler and signed-device acceptance are complete. This is not certification of actual APNs delivery or public App Store readiness.

## Verification

- 457 application/server/preview tests in 41 files; app and server TypeScript checks and production build pass.
- Lint: zero errors, three pre-existing Fast Refresh warnings. Production dependency audit: zero vulnerabilities reported at verification.
- 106 real PostgreSQL 018–020/restore/race cases passed. Fresh actual live schema/ACL archive restored and 020 rehearsed before applying.
- 020 hosted metadata validation passed. Real hosted acceptance then verified dormant registration, dispatch privilege denial, unexposed private tables and the full Auth/Storage/credit/safety/deletion workflow; all three disposable accounts were removed.
- Preview mission URL opens the intended authorized card dialog; closing removes its URL parameter. A stale `?v=rev2` module entry caused mismatched cached development Router instances; removing that obsolete cache-busting suffix restored fresh loading.
- Earlier source 95928b3 passed both Linux web checks and a macOS26 unsigned iOS Release archive in run34122816954. The new Swift/source changes require their own post-push CI result; see the current release status for that result.

Evidence: [020 rollout](verification/020-rollout.json), [restore](verification/push-rehearsal.json), [hosted acceptance](verification/hosted-acceptance.json), [activation runbook](../runbooks/PROD_RUNBOOK_020.md).
