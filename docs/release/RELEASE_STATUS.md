# Release status — 2026-09-07

The visual shape pass is complete. Security engineering has progressed, but the live backend is **not ready for new users**. The access-control repairs below are prepared source, not deployed protection. Do not infer production safety from the sample preview or passing local tests.

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
| Web response policy | CSP, framing protection, nosniff, no-referrer and restricted browser capabilities are configured in `vercel.json`. The compiled fixture returns these headers and works under them; verify the production response after deployment. |
| Dependencies | React Router upgraded to 7.18.3. Build now enforces app TypeScript before Vite. `npm audit` returned zero vulnerabilities at this pass; this does not establish database safety. |

## Reviewed deployment sequence

1. Publish the source changes with account deletion **disabled**. The paired profile bootstrap must no longer insert `role: null` before 016 revokes that field. Verify the production build and response headers.
2. Obtain a fresh verified schema **and ACL** backup via the protected workflow. Existing backups are historical; no fresh backup was created in this pass. Supabase CLI database initialization failed with a `postgres` / `cli_login_postgres` membership conflict. Read-only dashboard SQL worked, but do not repair privileged roles to bypass the backup problem. Use securely configured database access/pgpass or the password prompt, never chat or command-line credentials.
3. Michael reviews the exact [016 runbook](../runbooks/PROD_RUNBOOK_016.md) and [017 runbook](../runbooks/PROD_RUNBOOK_017.md), then gives the explicit production go required by `protocol/PROTOCOL.md`. Apply and validate them in order; keep records of backup and results. They change access rules/functions, not user rows or file bytes. Do not apply old 014/015 or restore their known-unsafe rollback policies.
4. Review proposal 018 and its account-deletion runbook separately. It adds service-only, recent-session-bound cleanup with a durable progress marker and write freeze. Verify Storage API removal, shared-data semantics, interrupted retries, stale-session denial and Auth absence on designated test accounts. Deploy `delete-account`, then enable `VITE_ACCOUNT_DELETION_ENABLED=true` only after the live smoke checks pass. Until then the Profile control stays hidden.
5. Configure the verified Resend sender in Supabase SMTP and the hardened reward notifier. Use a sending-only scoped secret through provider/Supabase secret configuration; never a `VITE_` variable or committed file. Test actual delivery with an explicitly authorized recipient. The notifier bounds retries but is not a durable outbox; see [delivery proposal](reward-notification-delivery-proposal.md).
6. Complete remaining privacy/abuse and native work below before inviting users or submitting an iOS build. This document is a deployment handoff, not security sign-off.

## Remaining engineering

- Restrict authenticated profile/email enumeration with a bounded contact lookup and compatible client joins; 016 removes anonymous access but deliberately preserves the current authenticated directory.
- Add effective bilateral blocking and reporting, with an operator response path. Removing a friendship alone is not blocking. Review invitation, mission and reward RPC boundaries together.
- Publish accurate privacy/support pages once operator identity/contact and retention choices are supplied. Account-deletion consequences must match 018; do not invent company details or legal guarantees.
- Implement actual native notification permission, token registration and authorized event delivery. Current badges/Realtime are in-app updates, not APNs. Add credential rotation and monitoring appropriate to the release; Sentry/Cloudflare are not prerequisites by themselves.
- Verify native invitations/deep links, killed-app auth, SMTP templates, private proofs and offline/reconnect behavior with the deployed backend. Rebuild/sync the currently stale iOS bundle on a Mac; add Apple signing/APNs configuration, test on iPhone and distribute internal TestFlight.

## Owner inputs still needed

- Public support email and legal operator name; Apple Developer enrollment/team and available Mac/iPhone. A bundled question was sent during this pass; no answer had arrived when this file was prepared.
- Secure backup-capable database access and explicit review/go for the exact production SQL after backup verification. The standing rule is: “production SQL is never applied without a backup and Michael's explicit go”. General authorization to work on release did not remove that requirement.
- Apple signing/APNs access and a designated delivery-test recipient. Existing signed-in Supabase, Vercel and Resend access is sufficient to provision a domain-limited sender credential during the ordered rollout; that is engineering work after the database repair, not a request for the owner to copy a key. No password needs to be pasted into chat.

## Final local verification

- `npm test`: 407 tests / 33 files pass. Five deletion-screen interaction cases cover acknowledgement, old-session rejection, failure visibility, retry identity and duplicate submission; 29 handler/helper cases cover authorization, bounded inputs, cleanup failure and post-Auth receipt recovery.
- `npm run build`: app TypeScript and production build pass; primary app chunk 352.71 kB. A separate feature-enabled sample build also compiled; the 390px disclosure renders without overflow and the destructive button stays disabled before acknowledgement. [Screenshot](verification/deletion-confirmation-390.png). No destructive browser action was submitted.
- `npm run lint`: no errors; three existing Fast Refresh warnings. `npm audit --json`: zero vulnerabilities. Both actual Edge entrypoints pass `deno check`; root deno.lock preserves the checked remote dependency resolution.
- 016/017: 111 real PostgreSQL checks (62 profile/Storage and 49 consent/purchase). 018: 38 checks including actual concurrent lock orderings, uppercase proof paths, service uploads, shared-history retention and schema/FK drift. These are isolated local databases, not production probes.
- Browser headers were read from the compiled fixture response, and desktop/phone flows worked under that CSP. Hosted response verification follows source push.

Evidence: [security review](2026-09-07-security-review.md), [visual verification](../../design/rounds/round-04/verification/README.md), per-proposal runbooks and `tests/security-db/`. Local database tests use PostgreSQL 18, so deployment still needs the PostgreSQL 17 and Supabase HTTP/Storage checks in the runbooks.
