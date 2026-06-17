# 2026-06-11 V1 Launch-Readiness Hardening

Scope: Milestone 0 and Milestone 1 launch-readiness hardening, plus narrow quick wins from the audit. Broad UI beauty work was intentionally not started.

## Commands Run

Baseline before edits:

- `npm run build` - pass.
  - Warnings: stale Browserslist data, unresolved `/img/C1.jpg`, mixed static/dynamic import for `src/domain/rewards.ts`, bundle chunk over 500 kB.
- `npm run lint` - pass with 3 existing fast-refresh warnings in `AuthContext.tsx`, `ThemeContext.tsx`, and `UIContext.tsx`.
- Existing test command - absent at baseline.

After edits:

- `npm test` - pass, 8 test files / 26 tests.
- `npm run build` - pass with the same known Vite/Browserslist/bundle warnings.
- `npm run lint` - pass with the same 3 fast-refresh warnings.
- `npx cap sync ios` - pass.
  - Warnings: CocoaPods is not installed; `xcodebuild` is not available in this Windows environment.
- `npx tsc -b --pretty false` - fail. This is not currently wired into `npm run build`; remaining failures are existing project type issues in page/layout/domain/database generated types. No new ES2020 test-file type issue remains after cleanup.

## Tests Added

- `src/domain/credits.test.ts` - verifies direct client `grantCredits` is blocked.
- `src/core/contracts/contracts.domain.test.ts` - verifies streak date behavior.
- `src/core/rewards/rewards.domain.test.ts` - verifies local reward purchase decisions.
- `src/theme/themes.test.ts` - verifies theme/i18n key contracts across Guild, Family, and Couple.
- `src/lib/authRedirect.test.ts` - verifies web/native auth redirects and callback parsing.
- `src/security/emailFunctions.test.ts` - verifies active email functions do not use Gmail/nodemailer and legacy endpoints require bearer auth.
- `src/security/storagePolicies.test.ts` - verifies storage bucket policy migration coverage.
- `src/security/launchQuickFixes.test.ts` - verifies the launch quick-fix regressions.

## Migrations And SQL

- Added `supabase/migrations/20260611120000_storage_buckets_and_policies.sql`.
  - Creates/updates `bounty-proofs`, `reward-images`, and `avatars` buckets.
  - Makes `bounty-proofs` private and participant-scoped.
  - Keeps `reward-images` and `avatars` public-read with owner-only write paths.
- Added validation SQL: `docs/supabase-storage-policy-validation.sql`.

Important storage follow-up: the proof bucket policy is intentionally safer than the current public-URL client flow. Before applying to production, verify proof viewing uses authenticated/signed access or update the app to store proof object paths and create signed URLs.

## Supabase Dashboard Checks Still Required

- Add production auth redirect URLs:
  - `bountyhunter://auth/callback`
  - deployed web `/login` URL
  - any local dev `/login` URLs used for testing
- Confirm Edge Function deployment state:
  - `notify-reward-creator` remains the Resend production email path.
  - `send-new-bounty-alert` and `send-proof-submitted-alert` are either undeployed or deployed as the authenticated disabled stubs.
  - Unauthenticated calls to the disabled stubs return `401`; authenticated calls return `410`.
- Confirm secrets:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - Supabase service role/anon/url secrets for functions
- Apply the storage migration and run `docs/supabase-storage-policy-validation.sql`.

## iOS Local Steps Still Required

This Windows environment could sync Capacitor but could not run CocoaPods or Xcode.

Run on a Mac:

```bash
npm install
npm install @capacitor/keyboard @capacitor/status-bar @capacitor/splash-screen
npm run build
npx cap sync ios
cd ios/App
pod install
open App.xcworkspace
```

Npm registry fetches for the missing Capacitor plugins failed here with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; do not disable TLS globally to work around it.

## Known Follow-Ups

- Fix the real project typecheck path: `npm run build` currently runs `tsc`, but the root project references require `tsc -b` to typecheck the app.
- Resolve existing `tsc -b` errors in layout props, streak/database generated types, collected rewards typing, and `approve_task` RPC types.
- Verify proof viewing after the private `bounty-proofs` migration and switch to signed URLs if needed.
- Install and configure Capacitor Keyboard/StatusBar/Splash plugins once npm certificate trust is fixed.
