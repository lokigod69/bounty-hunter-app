# Current State
Last verified: 2026-09-07

## Product
Private missions and rewards between connected accounts. One People list supports partners, relatives and friends together; each mission has one sender and recipient. No household/child permission model exists.

- Navigation: Missions (For you / Sent by you + History), Rewards, People. Profile/settings behind the avatar.
- Mint / Gold / Rose are account palettes (compatible guild/family/couple IDs), not relationship modes. Device-local Starlight / Forged / Astral skins are independent.
- Optional mission details/proofs/reward artwork expand on request. Credits, core RPC lifecycle and private proof loading remain.
- Email-first login; Google secondary on web, native email-only. Cold/warm native auth callbacks handled. Public native invitation origin is set in .env.production.

## Visual milestone — complete
- Michael authorized shape coverage for A/B/C and concurrent release/security work. Separate reversible artwork commit cdc1570 adds six control/ring WebPs (129,108 bytes); each complete panel/control/ring set is below 100 kB.
- Panel corners use nine-slice: square, wide and tall surfaces keep corner proportions. Dedicated shallow controls and true circular portrait rings fill the shape gaps. Reward image frames remain visible; compact desktop header avoids a cut wordmark.
- Matching review actions, adjacent live credit numerals, brief interaction glints and accessibility fallbacks remain. No extra appearance setting or animation loop.
- Browser proof: A desktop; B square/tall rewards, phone People and 960px header; C phone mission and German 360px review. Sample Accept works; skin survives reload. [[../design/rounds/round-04/verification/README]]. Preview: http://127.0.0.1:6078/ (fictional data).

## Security/release — prepared repairs, live blockers remain
- Current read-only live metadata confirms profiles RLS OFF, broad profile/role grants, role-derived task admin bypass, overlapping permissive Storage policies, weak friendship consent and empty Realtime publication. Saved [[../docs/release/live-safety-snapshot.json]] and targeted [[../docs/release/live-functions.json]]. No exploit, production SQL mutation, live account deletion or email send performed.
- 016 replaces staged 014/015 intent: profile/role/email restrictions, removal of direct task/admin bypass, narrow Storage policies, Realtime membership. Client bootstrap no longer inserts role.
- 017 enforces friendship consent, immutable endpoints and connected mission recipients; includes the discovered reward-purchase recipient boundary. Client reject/remove/cancel now require an affected row before success. New mission error copy has 12-locale parity.
- 018 stages recent-auth self-deletion, progress receipt/write freeze, Storage API removal and ordered relational/Auth cleanup. Profile disclosure and retry UI are implemented/tested in 12 locales but hidden until VITE_ACCOUNT_DELETION_ENABLED=true after verified deployment.
- Router 7.18.3 removes the remaining audit findings; build now enforces app TypeScript. Hardened reward notifier verifies Auth-owned recipient, bounded requests/retries and generic errors. Browser response headers are in vercel.json and verified in the compiled fixture.
- No SQL proposal or Edge Function was deployed. No fresh backup exists. Supabase CLI DB initialization hit postgres/cli_login_postgres membership conflict; read-only dashboard SQL worked. Do not mutate privileged roles to bypass this. Production requires verified backup plus Michael's exact review/go.

## Live service configuration
- Added/verified Supabase redirect URLs bountyhunter://auth/callback and https://www.bountyhunter.xyz/login; site URL remains root HTTPS. These are the only live settings changed in this pass.
- Resend domain bountyhunter.xyz is verified. Supabase custom SMTP is absent; CLI Edge Functions inventory is empty. Mail, image generation, daily routines and deletion are not live services.
- Vercel bounty-hunter-app uses Node 22.x and www.bountyhunter.xyz. Native source remains unbuilt/unverified on Mac/iPhone. No Apple archive/upload, APNs delivery or physical-device testing occurred.

## Next actions
1. Follow [[../docs/release/RELEASE_STATUS]] and runbooks 016/017/018: secure backup access, exact review/go, ordered apply and real Supabase HTTP/Storage/Auth checks. Do not apply old 014/015 rollback files.
2. Configure SMTP and the hardened notifier through secure service tools; obtain an explicitly authorized delivery-test recipient. No secret belongs in chat or a VITE_ variable.
3. Finish bounded contact lookup/email privacy, effective blocking/reporting and public privacy/support pages. Operator name/support address and Apple enrollment/team/Mac/iPhone details were requested; answer pending.
4. Implement actual push/token delivery; rebuild/sync/sign on Mac, test native auth/invites/proofs/notifications on iPhone and internal TestFlight. Current badges/Realtime are not push.
5. Complete older hardcoded strings/CLDR coverage and local-day streak work after launch blockers. Rotate previously exposed database credential through secure service access.

## Verification and history
Final gate results and release/source commits are recorded in protocol/NEXT_STEP.md and [[../docs/release/RELEASE_STATUS]]. Local DB checks are real PostgreSQL 18 tests, not proof of deployed PostgreSQL 17/Supabase behavior. No public iOS readiness claim.

Prior source: workflow c8a52c3, A 03f9323, B/C 59c29e2. Proposals 011/012/013 have recorded production applies. July 30 test-data wipe retained profiles/Auth accounts; do not repeat it. Old backups may omit data/ACLs. Historical state: [[archive/STATE_2026-08-03]].
