# iOS Setup Guide - Bounty Hunter App

**Created**: 2025-10-27
**Capacitor Version**: 7.4.4
**Platform**: iOS

---

## Prerequisites

Before you can build and run the Bounty Hunter app on iOS, you need:

### 1. macOS Machine
- **Required**: Xcode only runs on macOS
- **Version**: macOS 12.0 (Monterey) or later recommended

### 2. Xcode
- **Version**: Xcode 14.0 or later
- **Download**: [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835)
- **Install Command Line Tools**:
  ```bash
  xcode-select --install
  ```

### 3. CocoaPods (Dependency Manager)
- **Install**:
  ```bash
  sudo gem install cocoapods
  ```
- **Verify Installation**:
  ```bash
  pod --version
  ```

### 4. iOS Simulator or Physical Device
- **Simulator**: Included with Xcode
- **Physical Device**: Requires Apple Developer account (free or paid)

---

## Project Setup

The iOS platform has already been added to this project using Capacitor. The following files/folders were created:

- `capacitor.config.ts` - Capacitor configuration
- `ios/` - Native Xcode project folder
- Updated `package.json` with iOS-specific scripts

---

## Building for iOS

### Step 1: Build the Web App

First, build the Vite React app to generate the `dist/` folder:

```bash
npm run build
```

This compiles TypeScript and bundles the app into static files that Capacitor will wrap.

### Step 2: Sync Web Assets to iOS

Copy the built web assets to the iOS project:

```bash
npx cap sync ios
```

This command:
- Copies `dist/` contents to `ios/App/App/public/`
- Installs/updates Capacitor plugins
- Updates CocoaPods dependencies

**Shortcut**:
```bash
npm run ios:sync
```

### Step 3: Open Xcode

Launch the iOS project in Xcode:

```bash
npx cap open ios
```

**Shortcut**:
```bash
npm run ios:open
```

**Or** navigate manually:
1. Open Xcode
2. File → Open
3. Select `bounty-hunter-app/ios/App/App.xcworkspace`

### Step 4: Build and Run in Xcode

1. **Select a Target Device**:
   - Click the device dropdown in Xcode toolbar
   - Choose iPhone simulator (e.g., "iPhone 15 Pro")
   - Or select your connected physical device

2. **Build the App**:
   - Click the Play button (▶️) in Xcode toolbar
   - Or press `Cmd + R`

3. **Wait for Build**:
   - First build takes 2-5 minutes (compiles dependencies)
   - Subsequent builds are faster (incremental)

4. **App Launches**:
   - Simulator opens automatically
   - App installs and launches
   - Web app loads inside native wrapper

---

## Development Workflow

### Hot Reload (Local Development)

For rapid development, you can run the web app locally and point the iOS app to your dev server:

1. **Start Vite Dev Server**:
   ```bash
   npm run dev
   ```
   Note the local IP address (e.g., `http://192.168.1.100:5173`)

2. **Update Capacitor Config** (temporarily):
   ```typescript
   // capacitor.config.ts
   const config: CapacitorConfig = {
     appId: 'com.bountyhunter.app',
     appName: 'Bounty Hunter',
     webDir: 'dist',
     server: {
       url: 'http://192.168.1.100:5173', // Your local IP
       cleartext: true
     }
   };
   ```

3. **Sync and Run**:
   ```bash
   npx cap sync ios
   npx cap open ios
   ```

4. **Test on Device**:
   - Ensure device is on same Wi-Fi network
   - Changes to web code auto-reload in app (via Vite HMR)

**IMPORTANT**: Remove the `server` config before production builds!

---

## Common Issues and Troubleshooting

### Issue 1: "Command PhaseScriptExecution failed"

**Cause**: CocoaPods not installed or outdated

**Fix**:
```bash
cd ios/App
pod install
cd ../..
npx cap sync ios
```

### Issue 2: "No such module 'Capacitor'"

**Cause**: Xcode opened wrong file

**Fix**: Always open `App.xcworkspace`, NOT `App.xcodeproj`

### Issue 3: Simulator Won't Launch

**Cause**: Xcode command line tools not installed

**Fix**:
```bash
xcode-select --install
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

### Issue 4: App Shows Blank Screen

**Cause**: `dist/` folder missing or empty

**Fix**:
```bash
npm run build
npx cap sync ios
```

### Issue 5: "Unable to boot device" (Simulator)

**Cause**: Simulator runtime not downloaded

**Fix**:
1. Xcode → Settings → Platforms
2. Download iOS simulator runtime
3. Wait for download to complete
4. Try again

### Issue 6: Code Signing Error (Physical Device)

**Cause**: No Apple Developer account configured

**Fix**:
1. Xcode → App target → Signing & Capabilities
2. Select your Team (Apple ID)
3. Change Bundle Identifier to unique value (e.g., `com.yourname.bountyhunter`)
4. Trust certificate on device (Settings → General → Device Management)

---

## Testing on Physical Device

### Free Apple Developer Account

1. **Add Apple ID to Xcode**:
   - Xcode → Settings → Accounts
   - Click `+` → Add Apple ID
   - Sign in with your Apple ID (no paid account needed)

2. **Configure Signing**:
   - Select project in Xcode navigator
   - Select "App" target
   - Signing & Capabilities tab
   - Check "Automatically manage signing"
   - Select your Team (your Apple ID)

3. **Change Bundle Identifier**:
   - Change `com.bountyhunter.app` to `com.yourname.bountyhunter`
   - Must be globally unique

4. **Connect Device**:
   - Plug iPhone/iPad via USB
   - Unlock device
   - Trust computer (dialog on device)

5. **Select Device in Xcode**:
   - Device dropdown → Select your device
   - Click Run (▶️)

6. **Trust Developer on Device**:
   - First run shows "Untrusted Developer" error
   - Settings → General → VPN & Device Management
   - Tap your email → Trust
   - Return to app and launch

---

## App Configuration

### App Name and Bundle ID

Edit [capacitor.config.ts](../../capacitor.config.ts):

```typescript
const config: CapacitorConfig = {
  appId: 'com.bountyhunter.app',        // Change for your org
  appName: 'Bounty Hunter',             // App display name
  webDir: 'dist'
};
```

### App Icon and Splash Screen

**Icon**:
1. Create 1024x1024 PNG icon
2. Use [appicon.co](https://www.appicon.co/) to generate all sizes
3. Replace files in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

**Splash Screen**:
1. Create 2732x2732 PNG splash image
2. Replace `ios/App/App/Assets.xcassets/Splash.imageset/splash.png`

**Or** use Capacitor's asset generator:
```bash
npm install -g @capacitor/assets
npx capacitor-assets generate --ios
```

### App Permissions (Info.plist)

If you use device features (camera, location, etc.), add permissions:

```xml
<!-- ios/App/App/Info.plist -->
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to upload reward images</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs photo library access to select images</string>
```

---

## Native Plugins (Future)

Capacitor supports native iOS APIs via plugins. To add plugins:

```bash
npm install @capacitor/camera
npx cap sync ios
```

Then use in code:
```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const takePicture = async () => {
  const image = await Camera.getPhoto({
    resultType: CameraResultType.Uri
  });
  const imageUrl = image.webPath;
};
```

**Available Plugins**:
- `@capacitor/camera` - Camera and photo library
- `@capacitor/haptics` - Vibration feedback
- `@capacitor/push-notifications` - Push notifications
- `@capacitor/share` - Native share sheet
- `@capacitor/status-bar` - Status bar styling
- [Full list](https://capacitorjs.com/docs/plugins)

---

## Production Builds

### TestFlight (Beta Testing)

1. **Enroll in Apple Developer Program**:
   - $99/year subscription required
   - [developer.apple.com](https://developer.apple.com)

2. **Archive App**:
   - Xcode → Product → Archive
   - Wait for build to complete
   - Organizer window opens

3. **Distribute to TestFlight**:
   - Click "Distribute App"
   - Select "TestFlight & App Store"
   - Follow wizard (upload to App Store Connect)

4. **Add Testers**:
   - [App Store Connect](https://appstoreconnect.apple.com)
   - TestFlight → Internal Testing
   - Add tester emails
   - They receive TestFlight invite

### App Store Release

1. **Prepare Metadata**:
   - App Store Connect → My Apps → New App
   - Screenshots (required sizes)
   - Description, keywords, privacy policy

2. **Submit for Review**:
   - Upload build via Xcode archive
   - Select build in App Store Connect
   - Submit for review
   - Review takes 1-3 days

3. **Release**:
   - Once approved, click "Release"
   - App goes live on App Store

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (web only) |
| `npm run build` | Build production web bundle |
| `npm run ios:sync` | Build web + sync to iOS |
| `npm run ios:open` | Open Xcode |
| `npm run ios:run` | Build, sync, and open Xcode (full workflow) |
| `npx cap sync ios` | Sync web assets + plugins to iOS |
| `npx cap open ios` | Open iOS project in Xcode |
| `npx cap add ios` | Add iOS platform (already done) |
| `npx cap copy ios` | Copy web assets only (no plugin sync) |

---

## Next Steps

1. **Run the app on simulator**:
   ```bash
   npm run ios:run
   ```

2. **Test core features**:
   - Login/signup
   - Create bounty
   - Claim reward
   - View tasks

3. **Test on physical device** (optional):
   - Follow "Testing on Physical Device" section
   - Verify touch interactions work smoothly

4. **Customize branding**:
   - Replace app icon
   - Update splash screen
   - Adjust theme colors

5. **Add native features** (future):
   - Push notifications
   - Camera integration
   - Share functionality

---

## Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [iOS Developer Guide](https://capacitorjs.com/docs/ios)
- [Xcode Documentation](https://developer.apple.com/documentation/xcode)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

**Questions?**
- Capacitor GitHub: https://github.com/ionic-team/capacitor/discussions
- Stack Overflow: Tag `capacitor`

---

**END OF GUIDE**
