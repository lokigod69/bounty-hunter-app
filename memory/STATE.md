# Current State
Last verified: 2026-09-07

## Product
Private missions and rewards between connected accounts. One People list supports partners, relatives and friends together; each mission has one sender and recipient. No household/child permission model exists.

- Navigation: Missions (For you / Sent by you + History), Rewards, People. Profile/settings behind the avatar.
- Mint / Gold / Rose are account palettes (compatible guild/family/couple IDs), not relationship modes. Device-local Starlight / Forged / Astral skins are independent.
- Optional details/proofs/reward artwork expand on request. For / Reward / Details, Gift/Credits radios and equal coin choices have 12-locale parity.
- Email-first login; Google secondary on web, native email-only. Cold/warm native auth callbacks handled. Public native invitation origin is configured.

## Visual milestone — complete
- Pushed visual commit **95b2e83**: Forged has an irregular hammered rim; Astral has an octagonal glass rim. Shared actual 0–9 metal artwork and Starlight are byte-for-byte unchanged. Two replacement WebPs add only 5,334 bytes; all 13 credit assets total 128,222 bytes. [[../design/rounds/round-07/verification/README]].
- Round 06's bright numeral assets and filled faces remain; round 07 supersedes only the similar hooked B/C silhouettes. Accessible/localized text, image-error and forced-colors fallbacks remain. Normal choices stay 48px; longer values grow to fit.
- Tight crops and compensated nine-slice widths align mission/form/reward frames. Existing control/portrait assets, equal review actions and quiet interaction glints remain.
- Claim refreshes balance and opens Collected; Ready to enjoy → Mark as used → Used → Undo. Sample purchases debit once (24 → 4); actual client purchases require explicit server success. No live credit operation was tested.
- Preview http://127.0.0.1:6078/ uses fictional data. Skin comparison and Reset are fixture-only. Blocks persist per tab; Reset clears them, while other transactions reset on reload. Relative Supabase imports and explicit dummy config prevent hosted backend access from the fixture. Built-bundle exclusion checks passed.

## Security/release — source pushed, backend still staged
- Pushed source **fa34d0d**: private profile projections, account-scoped Auth/People state, gated block/report controls, deletion-aware notification preflight, proposal 019 and verified-backup tooling. Vercel 69zXVkBvAkmQ98NmSHAFfxWoyXZJ completed; hosted /login HTTP200/headers and index-DUrEiTNB.js match verified. Backend protection is not deployed by a frontend push.
- Read-only live metadata still shows profiles RLS OFF, broad profile/role grants, role-derived task admin bypass, overlapping permissive Storage policies, weak friendship consent and empty Realtime publication. [[../docs/release/live-safety-snapshot.json]] and [[../docs/release/live-functions.json]]. Do not invite new users yet.
- 016 replaces staged 014/015 intent: profile/role/email restrictions, task/admin bypass removal, narrow Storage policies and Realtime membership. Client bootstrap omits role.
- 017 enforces connection consent, immutable endpoints, connected mission recipients and reward-purchase recipient boundaries. Client connection mutations require an affected row before success.
- 018 stages recent-auth self-deletion, progress receipt/write freeze, Storage API removal and ordered relational/Auth cleanup. Profile deletion remains hidden until verified rollout and VITE_ACCOUNT_DELETION_ENABLED=true.
- 019 limits profile fields/rows, adds bounded literal contact lookup, bilateral blocks and private reports. Block disconnects, hides shared content and rejects underlying writes/invites/purchases; balances remain. Unblock needs fresh consent. Private records participate in deletion freeze/cascade. VITE_CONTACT_SAFETY_ENABLED remains false in production.
- Safety controls exist on People, missions, rewards and the blocked list. Success requires a server receipt; block/unblock reloads to discard cached content. Reports require a named operator and response process before public use.
- Backup helper preserves schema/owners/ACLs/policies with target/hash/scope/age validation before apply; local restore and rejection cases pass. Production backup refused safely without secure password/pgpass. No fresh production backup exists. This helper is schema/permissions only, not an Auth/data/Storage-byte backup.
- No proposal 016–019 or Edge Function was deployed. AGENTS.md requires a backup and Saya review; protocol additionally requires Michael's exact review/go. A generic agent review does not fulfill the named review. Never mutate privileged roles to bypass the earlier CLI membership conflict.

## Live service configuration
- Supabase native/www Auth callback URLs were added in the earlier release pass; site URL remains root HTTPS. No live settings changed in this follow-up.
- Resend domain bountyhunter.xyz is verified; custom Supabase SMTP is absent and Edge Functions inventory is empty. Mail, image generation, daily routines and deletion are not live services.
- Vercel uses Node 22.x and www.bountyhunter.xyz. No Mac/Xcode runtime here: simulator discovery returned spawn xcrun ENOENT. No native build, physical iPhone test, APNs delivery or TestFlight upload occurred.

## Next actions
1. Follow [[../docs/release/RELEASE_STATUS]] and runbooks 016 → 017 → 018 → 019: secure backup, named review and exact go, then ordered hosted SQL/REST/Storage/Auth checks. Double-click protocol/backup-release.bat for a hidden local password prompt. Do not apply old 014/015 rollbacks.
2. Obtain public support email/operator name and Apple enrollment/team/Mac/iPhone availability (asked, no answer yet). Publish accurate privacy/support pages and establish report handling.
3. Configure SMTP and service sender securely after backend repair, with an explicitly authorized delivery-test recipient. No secret belongs in chat or a VITE_ variable.
4. Implement actual native push/token/event delivery; rebuild/sync/sign on Mac and test auth/invites/proofs/notifications and offline behavior on iPhone/internal TestFlight. Current badges/Realtime are not push.
5. Complete older hardcoded strings/CLDR and local-day streak work after launch blockers. Rotate the previously exposed database credential through secure service access.

## Verification and history
428 tests / 38 files; app types/build pass; lint 0 errors / 3 existing Fast Refresh warnings; production dependency audit 0 findings. 111 PostgreSQL checks for 016/017 and 81 for 018+019, plus real schema/ACL restore, negative backup cases and two-session races; local PG18 versus hosted PG17.6. Notification entrypoint passes Deno checking. Browser desktop and 360×640/360×360 verify distinct rims, scrollable safety controls, local report receipt, block balance retention and unblock without reconnect. Preview reset and viewport restored. No live account/block/report/mail mutation or iOS readiness claim.

Prior source: workflow c8a52c3, A 03f9323, B/C 59c29e2, security 138f2f4, form/collection 278f2e2, shared numerals b89bfe8. Proposals 011/012/013 have recorded production applies. July 30 test-data wipe retained profiles/Auth accounts; do not repeat it. Old backups may omit data/ACLs. Historical state: [[archive/STATE_2026-08-03]].
