# Current State
Last verified: 2026-09-07

## Product and visuals
Private missions and rewards between connected accounts. One People list supports partners, relatives and friends together; each mission has one sender and recipient. No household/child permission model exists.
- Navigation: Missions (For you / Sent by you + History), Rewards, People. Profile behind the avatar.
- Mint / Gold / Rose are palettes, not relationship modes. Device-local Starlight / Forged / Astral skins are independent.
- Optional details/proofs/artwork expand on request. For / Reward / Details, Gift/Credits radios and equal coin choices have 12-locale parity.
- Email-first login; Google secondary on web, native email-only. Cold/warm native callbacks and public native invitation origin are configured.
- Visual95b2e83 is pushed: distinct hammered Forged/octagonal Astral rims, unchanged shared 0–9 numeral art and Starlight. Thirteen credit assets total128,222 bytes. [[../design/rounds/round-07/verification/README]].
- Claim debits once and opens Collected; Mark as used / Undo work. Real hosted acceptance now verifies these operations.
- Preview http://127.0.0.1:6078/ uses fictional isolated data; skin controls and Reset are preview-only. No hosted backend in its bundle.

## Live security rollout
- Michael explicitly delegated technical review and authorized all remaining release work. Prior named Saya/human-review gate is superseded; do not request SQL review/password again. Verified backup/technical review/validation remain required.
- Guarded provider-documented CLI-role repair succeeded after exact metadata capture, independent review and8 local PostgreSQL cases. Provider recreated the CLI role; temporary credentials stay in memory via scripts/prod/with_cli_connection.ps1. No app records changed by that repair.
- Actual public/storage/private schema/ACL backup schema_acl_20260907_195121_589.backup, SHA2563ED359C249567F3DB4D919C6920BF5A805CB0606B12D9594BEFE43B1CA3C67A6,268 TOC entries. Actual restore/rehearsal passed with external Auth/extensions and bucket-config fixtures. It excludes app/Auth rows and Storage bytes.
- **016→017→018→019 are LIVE** on hostedPG 17.6. Each metadata validator passed. Profiles/roles/Storage/Realtime, connection consent, account deletion, private lookup/block/report protections are deployed. [[../docs/release/live-rollout-2026-09-07]].
- Hosted HTTP acceptance passes real Auth/bootstrap, profile column/privacy restrictions, consent, actor checks, private proof upload/download, single award/purchase, Used/Undo, literal lookup/private report, bilateral block/invite/signing denial, deletion/receipt/Auth absence, Storage removal and counterpart balance/existing-ledger retention. All disposable accounts were removed. No real users mutated.
- A warmed private proof download remains a CDN HIT after blocking; cacheNonce/fresh requests and NEW signed URLs are denied. New proof uploads now request cacheControl=0; old cached/downloaded copies cannot be recalled. The old one-hour signed-token lifetime was never a guaranteed cache upper bound.
- Source production flags now enable verified deletion/safety; push remains off. Frontend deployment verification after this source commit is pending. Report intake is private; public operator/support response process remains needed before inviting users.

## Services and native release
- delete-account and notify-reward-creator Edge Functions deployed, gatewayverify_jwt=true; each also authorizes the actual Auth user and operation. Legacy alert/routine functions remain undeployed.
- Supabase customSMTP saved/reloaded: smtp.resend.com:465, username resend, Bounty Hunter <notifications@bountyhunter.xyz>,60 seconds per user interval. Domain verified; new sending-only domain-limited Resend credential is stored server-side. No secret in source/chat.
- SMTP/reward-notifier simulation acceptance passed against Resend's documented delivered+label@resend.dev sink, not a human inbox. See mail-acceptance.json; no real-inbox delivery claim.
- Push package 8.1.2, native delegate/Podfile/entitlement/presentation wiring and a macOS 26 GitHub release-build check are prepared. Public build variables configured; no Apple private key or signing team configured. Queue/client permission/dispatcher engineering remains.
- Windows has no Xcode (spawn xcrun ENOENT). New CI will compile unsigned iOS after push; no completed native build, APNs/device delivery, signing or TestFlight claim yet.
- Production frontend previously verified: Vercel69zXVkBvAkmQ98NmSHAFfxWoyXZJ and index-DUrEiTNB.js. Current local feature-enabled build is index-DSihRKJx.js; latest deployment is not yet checked.

## Next actions
1. Finish mail simulation/provider evidence, publish current reversible source and verify Vercel + new Mac build check.
2. Complete actual native push registration/transaction-derived queue/HTTP2 dispatcher under off-by-default gates; validate deletion/block/session/retry boundaries before rollout. Apple credentials/device acceptance still required for activation.
3. Get public operator/support contact and Apple enrollment/team/iPhone facts (asked, unanswered). Prepare accurate privacy/support/report response and App Store materials; do not invent owner facts.
4. Test native auth/invites/proofs/offline/notification taps with signed build, then internal TestFlight. CI can compile without a local Mac; signing and real-device tests still need Apple access.
5. Older hardcoded strings/CLDR and local-day streak work remain after blockers. Previously exposed database credential needs supported secure rotation; no password should be posted in chat.

## Verification/history
428 tests/38 files, app types/build pass; lint0 errors / 3 existing FastRefresh warnings. Previous production audit 0. 111 local PG016/017 cases and81 local PG018/019+backup checks pass; role repair8 cases and actual live-schema restore/rehearsal passed. Current hosted acceptance record is authoritative for real services. Native/Mac CI pending.
Prior source: c8a52c3 workflow,03f9323A,59c29e2B/C,138f2f4security,278f2e2form/collection,b89bfe8numerals,95b2e83rims,fa34d0dprivacy/safety,b6ad866handoff. July30test-data wipe is historical; do not repeat it. [[archive/STATE_2026-08-03]].
