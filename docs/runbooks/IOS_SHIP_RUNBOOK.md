# iOS Ship Runbook — Phase 5 (TestFlight)

Everything Windows-doable is already done (2026-07-15, this repo):
- `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/keyboard` installed —
  `capacitor.config.ts` referenced all three but none were installed, so the StatusBar/
  SplashScreen/Keyboard config was silently ignored until now. Podfile lists all 5 plugin pods.
- `npx cap sync ios` run: `ios/App/App/public` now mirrors the current `dist` build
  (the stale hand-copied junk — .asd files, marketing PNGs, duplicate wav/aif — is gone;
  marketing originals live in `assets-src/marketing/`).
- Safe-areas: `viewport-fit=cover` is set (index.html), `.safe-top`/`.safe-bottom`
  utilities applied to header, mobile menu, modal footers; Fab offsets by
  `env(safe-area-inset-bottom)`.
- `bountyhunter://auth/callback` scheme registered in Info.plist (CFBundleURLTypes);
  camera/microphone/photo-library usage strings present.

## Prerequisites (Mac, one-time)
1. Xcode from the App Store (includes xcodebuild + simulators). Log in:
   Xcode → Settings → Accounts → add the Apple ID with the developer membership.
2. Apple Developer Program membership active (needed for TestFlight).
3. `brew install cocoapods node` (or nvm). Node ≥ 20.
4. Clone the repo; copy `.env.local` over securely (it is gitignored — contains
   `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` for mvbmpcmexkgfairnthux).

## Build + open (Mac, every iteration)
```sh
npm install
npm run build            # produces dist/ with env inlined from .env.local
npx cap sync ios         # copies dist → ios/App/App/public, runs pod install
npx cap open ios         # opens ios/App/App.xcworkspace in Xcode (NOT the .xcodeproj)
```

## Xcode configuration (first run)
1. Target **App** → Signing & Capabilities: set your Team; bundle id is
   `com.bountyhunter.app` (change only if the id is taken in your account —
   if you change it, also update `appId` in capacitor.config.ts + the
   CFBundleURLName in Info.plist).
2. General → Minimum Deployments: iOS 14.0 (matches Podfile).
3. App icon: `Assets.xcassets/AppIcon.appiconset` currently has a single 512@2x
   (=1024) image — Xcode 14+ accepts a single 1024 icon ("Single Size"); verify it
   renders, otherwise regenerate from `assets-src/` artwork.
4. Supported orientations: currently portrait + both landscapes (Info.plist).
   Consider portrait-only for v1 (Info.plist → UISupportedInterfaceOrientations).

## Device smoke test (before TestFlight)
Run on a real device (simulator has no haptics and odd keyboard behavior):
- [ ] Login: email+password AND magic link. The magic-link email opens
      `bountyhunter://auth/callback` → app must land logged-in (appUrlOpen handler
      in AuthContext exchanges the code).
- [ ] Notch/home-indicator: header not under the status bar, modal footer buttons
      and Fab clear of the home indicator (safe-area CSS).
- [ ] Status bar: dark style over the app background (StatusBar plugin now active —
      config: style DARK, overlaysWebView false, #090A0F).
- [ ] Splash: dark splash, auto-hides (SplashScreen plugin now active).
- [ ] Keyboard: form inputs scroll into view, no viewport jump (Keyboard plugin,
      resize=body).
- [ ] Haptics: tap feedback on buttons, success/warning notifications on
      approve/reject (feedback.ts — first time testable on device).
- [ ] Core loop as on web: create mission → submit proof (camera + photo library
      permission prompts must show the Info.plist strings) → approve → credits.

## TestFlight upload
1. Xcode: Product → Destination → Any iOS Device (arm64).
2. Product → Archive.
3. Organizer window → Distribute App → App Store Connect → Upload (defaults fine).
4. appstoreconnect.apple.com → My Apps → (create the app record on first upload:
   name "Bounty Hunter", bundle id, SKU anything) → TestFlight tab.
5. Wait for processing (~10 min), fill the export-compliance question (uses standard
   HTTPS only → "No" to proprietary encryption), add internal testers (up to 100,
   no review needed) by Apple ID email.
6. Testers install via the TestFlight app. New builds: bump CFBundleVersion
   (Xcode auto-increments if you use "Manage Version and Build Number").

## Known iOS-specific caveats
- `@capacitor/haptics` is lazy-imported (static import breaks vite dev — see
  memory/LOG 2026-07-08); don't "fix" it to a static import.
- Auth emails: Supabase Site URL / redirect allowlist must include
  `bountyhunter://auth/callback` (Dashboard → Authentication → URL Configuration →
  Additional Redirect URLs) or magic links will bounce to the web URL.
- If Supabase keys rotate, rebuild is required (env is inlined at build time).
