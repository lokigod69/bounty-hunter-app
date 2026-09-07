# Release status — 2026-09-07

The database security rollout is **live and verified through real service requests**. This supersedes earlier staged-only reports. Public release still requires completion of native notifications, operator/support details and Apple/device acceptance.

## Completed and verified

| Area | Evidence |
| --- | --- |
| Review authorization | Michael explicitly delegated technical review and authorized all remaining release work. No further named Saya/human SQL review is required. |
| Backup/access | Guarded official provider CLI-role repair; actual schema/ACL archive with268 TOC entries and verifiedSHA256; restored actual live schema and rehearsed016–019. [Repair and backup record](cli-connection-repair.md). |
| Live database | 016→017→018→019 applied on hostedPG 17.6, each validator passed. Exact apply/validation records in verification/. |
| Real API acceptance | Auth/profile privacy, consent, mission actor restrictions, private proofs, one award/debit, collection Used/Undo, lookup/report privacy, bilateral blocks and saved invitation denial. [Results](verification/hosted-acceptance.json). |
| Account deletion | Edge Function deployed; real disposable account files/shared content/Auth removed, receipt recovery works, stale/deleted identity denied, counterpart balance and existing ledger preserved. All fixture accounts cleaned. |
| Mail configuration | Resend domain verified; sending-only domain-limited credential; custom SupabaseSMTP saved/reloaded using smtp.resend.com:465 and notifications@bountyhunter.xyz; notifier Edge Function deployed. Provider simulation passed, not a human-inbox delivery claim. |
| Local gates |428 tests/38 files, app types/build pass, lint0 errors / 3 existing warnings;111+81 local PG checks, role repair8 cases, actual restore/rehearsal. |

Production source now enables deletion/safety after hosted acceptance. Verification of the new frontend deployment is pending; the previous verified deployment is Vercel69zXVkBvAkmQ98NmSHAFfxWoyXZJ. Source pushes do not apply SQL or deploy Edge Functions; those were separately performed and verified.

## Cache and retention findings

Previously warmed proof downloads can remain CDN HITs after blocking. Fresh requests with cacheNonce and new signed URLs are denied at the origin. New private proof uploads request zero cache lifetime. Existing object metadata, downloaded copies and already issued links cannot be recalled by an RLS change. Signed-token lifetime and cache lifetime are separate; see [Supabase Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn).

The current approval RPC increments balance/total-earned without writing an earned ledger entry. Purchase writes its debit entry. Deletion acceptance compares the actual existing ledger before/after rather than incorrectly assuming that historical ledger sums reconstruct the balance. No existing credit history was fabricated or rewritten.

## Remaining release work

- Finish SMTP/notifier provider simulation and record provider event evidence; real-inbox acceptance still needs an owner-designated recipient.
- Complete native permission/token/session cleanup, transaction-derived notification queue and one authenticated Node HTTP2 APNs dispatcher. Keep registration/delivery off until Apple credentials and device tests pass.
- macOS 26 GitHub build workflow and native APNs delegate/Podfile/entitlements are prepared; run after source push. It builds unsigned and is not TestFlight or an iPhone usability test.
- Publish accurate operator/support/privacy information and define report handling. The public operator/support contact is an unanswered owner fact; private report storage is not staffed moderation.
- Sign and test native auth, invitations, private proofs, offline/reconnect and push taps/account switching, then distribute internal TestFlight. No Apple team/key, physical-device test or signed upload yet.
- Supported secure rotation of the previously exposed database password remains; temporary provider CLI access means no password is needed for routine release SQL.

Only unavailable owner facts/access should be handed back: operator/support identity, Apple enrollment/team/APNs/signing access and an iPhone for acceptance. A local Mac is avoidable for compilation via the new workflow. Do not ask for SQL review or keys in chat.

Full current rollout: [live record](live-rollout-2026-09-07.md). Earlier security review and design rounds are historical evidence, not assertions that the now-deployed controls remain staged.
