# Current State
Last verified: 2026-09-07

## Product
Private missions and rewards between connected accounts. One People list supports partners, relatives and friends together; each mission has one sender and recipient. No household/child permission model exists.

- Navigation: Missions (For you / Sent by you + History), Rewards, People. Profile/settings behind the avatar.
- Mint / Gold / Rose are appearance choices; persisted IDs guild/family/couple remain compatible. They do not limit recipients or create separate spaces.
- Single introduction; invite redemption precedes onboarding. Mission description/deadline/proof rules and reward image customization are optional.
- Core RPC lifecycle, credits, proof privacy and existing rewards remain. Private proof paths no longer get discarded by the received-mission loader.
- Email-first login; web Google is secondary, native email-only for now. Cold/warm native auth callbacks are handled. Public HTTPS origin is required for native invitation links.

## Latest verification
- App TypeScript: clean. Tests: 345 / 29 files pass. Lint: 0 errors, 3 existing Fast Refresh warnings. Production build: passes; main chunk 351.15 kB.
- Local browser fixture verified desktop, 390/360px phones, landscape, German, appearance changes, preselected creation, approval, first-run and invite recovery. See [[../docs/product-simplification/RELEASE_REVIEW]].
- No live SQL/account writes or physical-device checks in this pass. No claim of public iOS readiness.
- Dependency audit: 2 moderate React Router package findings remain; reviewed major upgrade is next security work. Compatible patches removed the other reported advisories.

## Latest milestone — A/B/C skins and dialog polish
- Michael approved B/C on 2026-09-07. Source 59c29e2 is independently reversible from A (03f9323) and the workflow pass (c8a52c3).
- Avatar → Appearance offers Starlight, Forged and Astral. Skin is device-local, independent of the Mint/Gold/Rose account palette. A remains the unsaved default; changing skin never changes recipients or missions.
- B metal/brass and C angular optical frames cover navigation, cards, dialogs and controls. Two true-alpha WebPs total 49,958 bytes. Live Mandalore/Poppins and all twelve translations remain; no new dependency or DB setting.
- Credits display beside the coin in readable live numerals; unused spin/overlay code removed. Evidence/reward panels align, action pairs share sizing, mission card minimum heights agree, and button rims glint once on hover/focus/press.
- 345/29 tests, clean app types/build, lint 0 errors/3 known warnings. Browser: A/B/C, reload, 1280 desktop, 390/360 phones, German 12.500 credits, keyboard feedback and in-memory Accept/Approve/Reject. See [[../design/rounds/round-03/verification/README]].
- Next: Michael tries the skins; release/security/iPhone work follows. No owner inputs needed for this visual review. Physical iPhone and OS accessibility preference emulation remain unverified.

## Release blockers / subsequent actions
1. Reconcile live 014/015 state. Saved July 30 evidence showed profiles RLS OFF and an empty Realtime publication; proposals were still staged August 3. Current live state is unverified. Use approved access, backup and review under the runbooks; never request a password in chat.
2. Implement account deletion, privacy/support and appropriate abuse-report/block behavior. Implement actual push delivery; current badges are not push.
3. Verify auth SMTP/templates/redirects and reward email deployment. Set VITE_PUBLIC_APP_URL for native builds; native share/Universal Links remain work.
4. Rebuild and sync on Mac, configure Apple Team, verify on iPhone, then internal TestFlight. Signing/APNs/service access and operator contact details require the owner.
5. Finish older hardcoded strings/CLDR formatter coverage and the local-day streak issue after launch blockers.

## Durable prior evidence
- Proposals 011, 012 and 013 have recorded production applies; task creation/content edits/lifecycle are RPC-authoritative. 013 prevents credit self-awarding. See docs/runbooks/PROD_RUNBOOK_013.md and predecessors.
- July 30 test-data wipe completed, profiles/auth accounts retained. Do not repeat or delete accounts as a prerequisite for UX testing.
- Old backups before July 30 may contain auth.users only; verify coverage before trusting them. scripts/prod backup validation was corrected then.
- Database credential entered earlier transcripts; rotation was reopened for taking users. Use secure access and rotation during release work, not another transcript copy.
- Sound defaults OFF, haptics ON. Proof supports text/private image/video/PDF under existing validation and RLS. Physical-device behavior remains unverified.
- Existing native bundle is stale until rebuilt/synced on Mac. No Apple archive/upload was performed here.

## Current handoff
UX simplification implementation c8a52c3 is committed and pushed to origin/main under Michael's explicit authorization. The separate handoff commit contains the design/verification artifacts and memory update. Starlight source is 03f9323; A/B/C and dialog polish source is 59c29e2. Design/history/evidence and handoff are committed separately. Current resume instructions: protocol/NEXT_STEP.md. Full evidence, remaining engineering work and human setup: docs/product-simplification/RELEASE_REVIEW.md.

Prior overgrown state is preserved, explicitly historical, in [[archive/STATE_2026-08-03]]. Do not treat its obsolete instructions as current.
