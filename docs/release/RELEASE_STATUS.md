# Release status — 2026-09-07

The visual shape pass is complete. Security engineering has progressed, but the live backend is **not ready for new users**. The access-control repairs below are prepared source, not deployed protection. Do not infer production safety from the sample preview or passing local tests.

Current follow-up: contact privacy/block/report source and proposal **019** are implemented and locally verified; no backend proposal or Edge Function has been deployed. The private fields are removed from client projections and contact screens. Safety controls use one default-off flag; the ordinary Invite route remains while lookup is off. New Forged/Astral rims preserve the shared 0–9 numeral art and Starlight. See [round 07](../../design/rounds/round-07/verification/README.md) and [019 runbook](../runbooks/PROD_RUNBOOK_019.md). Source commits/deployment will be recorded after the final push.

Backup tooling now preserves owners, grants, policies and private-schema definitions in one custom archive, requires a target/hash/scope/age manifest for apply and has been restored into a second isolated database. The read-only production backup command refused safely because no password/pgpass is configured; no fresh production backup was produced. Double-click [backup-release.bat](../../protocol/backup-release.bat) for a hidden local password prompt. This backs up schema/permissions, not Auth/data or Storage bytes.

## Verified services and changes

| Area | Current evidence / action |
| --- | --- |
| Web hosting | Authenticated Vercel project `bounty-hunter-app`, ID `prj_WKRWOJchg7aQJbNjTAVycPmEkzOj`, Node 22.x, production `https://www.bountyhunter.xyz` |
| Supabase | Project `mvbmpcmexkgfairnthux`, PostgreSQL 17.6. Read-only dashboard transaction saved policy/grant/trigger/bucket/FK/publication metadata in `live-safety-snapshot.json`; targeted lifecycle definitions in `live-functions.json`. No app records exported and no production SQL mutation performed. |
| Database boundaries | Live profiles RLS OFF, client-writable role and role-derived task admin bypass, overlapping broad Storage policies, weak friendship consent, empty Realtime publication. Proposals 016/017 address these. |
| Auth URLs | Site URL remains `https://bountyhunter.xyz`. Added and verified `bountyhunter://auth/callback` and `https://www.bountyhunter.xyz/login` in the redirect allowlist. Existing root callback and wildcard retained. These are the only live configuration changes in this pass. |
| Native invitation origin | `.env.production` now supplies public `VITE_PUBLIC_APP_URL=https://bountyhunter.xyz`. Deployment-specific env overrides still need checking when packaging native builds. |
| Auth email | Supabase custom SMTP is not configured. Resend dashboard confirms `bountyhunter.xyz` is verified; do not redo its DNS setup. No mail was sent. |
| Edge Functions | Authenticated CLI returned an empty inventory. Reward mail, image generation, daily routines and account deletion are not deployed services. No Resend sender secret was configured in this pass. |
| Web response policy | CSP, framing protection, nosniff, no-referrer and restricted browser capabilities are configured in `vercel.json`. The compiled fixture works under them. After push, the production /login response returned HTTP 200 and the expected CSP/DENY/nosniff/no-referrer headers; the hosted login rendered in the browser. |
| Dependencies | React Router upgraded to 7.18.3. Build now enforces app TypeScript before Vite. `npm audit` returned zero vulnerabilities at this pass; this does not establish database safety. |

## Reviewed deployment sequence

1. Publish the source changes with account deletion **disabled**. The paired profile bootstrap must no longer insert `role: null` before 016 revokes that field. Verify the production build and response headers.
2. Obtain a fresh verified schema **and ACL** backup via the protected workflow. Existing backups are historical; no fresh backup was created in this pass. Supabase CLI database initialization failed with a `postgres` / `cli_login_postgres` membership conflict. Read-only dashboard SQL worked, but do not repair privileged roles to bypass the backup problem. Use securely configured database access/pgpass or the password prompt, never chat or command-line credentials.
3. Michael reviews the exact [016 runbook](../runbooks/PROD_RUNBOOK_016.md) and [017 runbook](../runbooks/PROD_RUNBOOK_017.md), then gives the explicit production go required by `protocol/PROTOCOL.md` (AGENTS.md also calls for Saya review). Apply and validate them in order; keep records of backup and results. They change access rules/functions, not user rows or file bytes. Do not apply old 014/015 or restore their known-unsafe rollback policies.
4. Review proposal 018 and its account-deletion runbook separately. It adds service-only, recent-session-bound cleanup with a durable progress marker and write freeze. Verify Storage API removal, shared-data semantics, interrupted retries, stale-session denial and Auth absence on designated test accounts. Deploy `delete-account`, then enable `VITE_ACCOUNT_DELETION_ENABLED=true` only after the live smoke checks pass. Until then the Profile control stays hidden.
5. Review/apply/validate [019](../runbooks/PROD_RUNBOOK_019.md), preserving 018’s strict dependency guard. Verify hosted profile projections, literal/rate-limited lookup, both block directions, saved invitation/purchase denial, report privacy and account deletion. Assign an operator and verify the support/report response process. Enable `VITE_CONTACT_SAFETY_ENABLED=true` only after these checks.
6. Configure the verified Resend sender in Supabase SMTP and the hardened reward notifier. Use a sending-only scoped secret through provider/Supabase secret configuration; never a `VITE_` variable or committed file. Test actual delivery with an explicitly authorized recipient. The notifier bounds retries but is not a durable outbox; see [delivery proposal](reward-notification-delivery-proposal.md).
7. Complete remaining service and native work below before inviting users or submitting an iOS build. This document is a deployment handoff, not security sign-off.

## Remaining engineering

- **Implemented, staged 019:** bounded lookup, protected profile columns, restrictive counterpart visibility and compatible client joins. Removing contact emails from the UI alone is not a substitute for applying this server repair.
- **Implemented, staged 019:** bilateral blocks, private report intake, invitation/content/credit/proof guards and service notification preflight. The operator response process and public support channel remain to be activated; receiving a report does not imply staffed moderation.
- Publish accurate privacy/support pages once operator identity/contact and retention choices are supplied. Account-deletion consequences must match 018; do not invent company details or legal guarantees.
- Implement actual native notification permission, token registration and authorized event delivery. Current badges/Realtime are in-app updates, not APNs. Add credential rotation and monitoring appropriate to the release; Sentry/Cloudflare are not prerequisites by themselves.
- Verify native invitations/deep links, killed-app auth, SMTP templates, private proofs and offline/reconnect behavior with the deployed backend. Rebuild/sync the currently stale iOS bundle on a Mac; add Apple signing/APNs configuration, test on iPhone and distribute internal TestFlight.

## Owner inputs still needed

- Public support email and operator name; Apple Developer enrollment/team and available Mac/iPhone. The asynchronous question remains unanswered. XcodeBuildMCP simulator discovery returned `spawn xcrun ENOENT`: no Xcode runtime on this host. No physical iPhone or native build was tested.
- Secure backup-capable database access and explicit review/go for the exact production SQL after backup verification. The standing rule is: “production SQL is never applied without a backup and Michael's explicit go”. General authorization to work on release did not remove that requirement.
- Apple signing/APNs access and a designated delivery-test recipient. Existing signed-in Supabase, Vercel and Resend access is sufficient to provision a domain-limited sender credential during the ordered rollout; that is engineering work after the database repair, not a request for the owner to copy a key. No password needs to be pasted into chat.

## Current local verification — 2026-09-07

- 428 application/interaction tests across 38 files; types/build pass; lint has 0 errors/3 existing Fast Refresh warnings.
- Final `npm audit --omit=dev --audit-level=moderate`: zero vulnerabilities. Built preview JavaScript contains neither the hosted project ID nor `supabase.co`; production JavaScript contains none of the fixture key, safety state key or sample banner.
- 111 checks for 016/017 and 81 for 018+019, plus backup restore/negative cases and race handshakes. Explicit inherited-column drift aborts; actual saved invite/purchase functions cannot bypass blocks; direct service writes respect deletion freeze; A’s reassignment B→C is not blocked by B↔C alone. PostgreSQL 18 local only.
- Notification entrypoint passes Deno checking and denies missing/failed block preflight without sending. No live mail or block/report mutation was performed.
- Browser shows unchanged shared numeral sprites on distinct rims, 360×640 and 360×360 scrollable safety UI, local report receipt and block/unblock semantics. Sample import resolution was fixed for relative Supabase imports, and explicit dummy configuration prevents hosted credentials/URLs entering the fixture. The first preview report failed before that fix; no live report was created.
- Production still has both safety/deletion flags off. Deployment verification is distinct from server authorization verification.

## Historical security-pass verification (source 138f2f4)

- `npm test`: 407 tests / 33 files pass. Five deletion-screen interaction cases cover acknowledgement, old-session rejection, failure visibility, retry identity and duplicate submission; 29 handler/helper cases cover authorization, bounded inputs, cleanup failure and post-Auth receipt recovery.
- `npm run build`: app TypeScript and production build pass; primary app chunk 352.71 kB. A separate feature-enabled sample build also compiled; the 390px disclosure renders without overflow and the destructive button stays disabled before acknowledgement. [Screenshot](verification/deletion-confirmation-390.png). No destructive browser action was submitted.
- `npm run lint`: no errors; three existing Fast Refresh warnings. `npm audit --json`: zero vulnerabilities. Both actual Edge entrypoints pass `deno check`; root deno.lock preserves the checked remote dependency resolution.
- 016/017: 111 real PostgreSQL checks (62 profile/Storage and 49 consent/purchase). 018: 38 checks including actual concurrent lock orderings, uppercase proof paths, service uploads, shared-history retention and schema/FK drift. These are isolated local databases, not production probes.
- Browser headers were read from the compiled fixture and hosted /login response; desktop/phone sample flows worked under that CSP. No hosted login, account mutation or delivery test was submitted.

Source commits: visual **cdc1570**, security/release engineering **138f2f4**, both pushed to origin/main. Vercel production deployment `dpl_HKWzvFctDtABwGwopsLqRVUZ29xF` is Ready and aliases `www.bountyhunter.xyz`; deployment URL `https://bounty-hunter-gbrvjyoh0-lokigod69s-projects.vercel.app`. This deploys frontend changes and stores the reviewed SQL/Edge source in Git; it does not execute those SQL proposals or deploy Edge Functions.

Evidence: [security review](2026-09-07-security-review.md), [visual verification](../../design/rounds/round-04/verification/README.md), per-proposal runbooks and `tests/security-db/`. Local database tests use PostgreSQL 18, so deployment still needs the PostgreSQL 17 and Supabase HTTP/Storage checks in the runbooks.
