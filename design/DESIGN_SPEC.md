# Bounty Hunter — visual skins

Locked 2026-09-07 by Michael. A established the contract below; the approved B/C extension supersedes its earlier deferral and adds the device skin selector. All three round-02 references were inspected directly. The simplified workflow remains intact.

## Contract
- Atmosphere: near-black #030810, midnight #0B1520, static distant stars visible through card centers. Mint #9BE9DF reflected light; existing Mint/Gold/Rose accent choices remain.
- Heading: actual local Mandalore, normal weight, uppercase, 36–64px responsive, tracking 0.06em, 1.15 line height. Silver #DCE6E8 / steel #81999F material finish. Poppins stays on mission titles, statuses, navigation, and forms.
- Rhythm: existing page max-width 1024px (header 1152px), 16–24px mobile gutters, 24px section gaps. Two cards at desktop, one on phones. Flexible sizes and wrapping for localization and text zoom.
- Materials: smoked clear centers, polished rounded crystal lips, reflected mint-white highlights. One reusable generated nine-slice frame shared by cards, selected tabs, primary actions and balance. No baked labels. Quiet resting cards, richer reflection on hover/focus, immediate press feedback. No continuous shimmer or pointer tracking.
- Radii: 20px cards, 14px controls, round avatar. Borders: subtle warm gold for credit rewards, mint for gifts; semantic status remains explicit live text. A thin CSS fallback border keeps controls visible before artwork loads.
- Elevation: fine inner edge and soft shadow. No per-card backdrop blur. Header/bottom navigation retain limited blur; modal surfaces stay darker for legibility.
- Components: header with three destinations, transparent credit capsule, brand heading, History link, For you/Sent by you tabs, New mission action, mission/reward/person cards. Remove redundant Missions subtitle.
- Accessibility: 44px minimum controls, keyboard focus also reveals reflection; readable live text and accessible names; stable layout with missing image; solid surfaces under reduced transparency/high contrast; reduced motion removes movement.

## Practical deviations from the generated reference
- Use the real Mandalore font rather than rasterized/generated letterforms. All translations and user content remain selectable live text.
- Reuse each material through nine-slice borders; accent coloring is restrained CSS. No entire-screen raster, individual word images or permanent star flares.
- Keep existing compact header and responsive mobile bottom navigation, not the image's wide desktop-only composition. Existing dialogs remain intentionally opaque enough to read.
- The initial B/C deferral is superseded by the approved extension below.
- Target <=150 kB incremental decoration. Record measured production asset bytes and browser evidence after implementation; physical iPhone performance cannot be established on Windows.

## 2026-09-07 — B/C approved as additional skins

References inspected: rounds/round-02/B-01.png and C-01.png. Supersedes the earlier deferral of B/C. A remains the default for existing devices; a compact visual selector in Profile > Appearance adds B/C as opt-in, device-local finishes independent of Mint/Gold/Rose. No data model or workflow changes.

- B / Forged relic: blackened graphite #111514, small brass #A88C50 catches, brushed platinum #D9DCD6, teal light inset rails. Authored bevelled metal nine-slice frames on mission/reward/person cards and action controls; the same metal framing joins header and bottom navigation. Squared/chamfered silhouettes, 16–24px frame regions, restrained inner illumination. Larger heading treatment in actual Mandalore. No baked text, extra decorative badges or physical screws repeated behind content.
- C / Astral lens: ink #040A13, angular optical crystal, narrow cyan #7CFFF0 / violet #BAA4FF / warm gold #FFD791 prismatic catches. Authored chamfered frame, floating framed header and delicate orbital line around the page heading. Distinct angular shapes and glass depth, without permanent star flare or moving space background.
- All skins: fixed frame corners scale through nine-slice, content stays fluid. No card-size-specific images, screenshot backdrops or runtime drawing engine. The palette remains independent. Main text/nav hierarchy and existing page rhythm persist.
- Dialogs: aligned evidence/reward columns, with more width for the report, one column on phones. Common top/bottom edges; center a single reward within a useful-width panel. Approve/Reject share height, width and typography; danger color still signals rejection.
- Credits: ⚠️ adjacent-numeral treatment superseded by round 05 below. Keep live localized text and no generated digit alphabet.
- Interaction: short light sweep on intent/press, no perpetual animation. Keyboard equivalent and reduced-motion fallbacks; preserve disabled/loading and focus-trap behavior.
- Target each skin's reusable decoration below 100 kB. Load only the selected material. Static thumbnails may use the already-loaded preview textures in the settings screen. Measure final bytes; real iPhone rendering remains unverified.

Implemented in 59c29e2. B 29,520 bytes; C 20,438 bytes. Proof and implementation details: rounds/round-03/verification/README.md.

## 2026-09-07 — authored controls and circular portraits

Round 04 supersedes the one-frame-for-everything material rule. Keep the original nine-slice panel for square/wide/tall content, use a separate shallow control frame for actions/tabs/balance, and a uniformly scaled circular ring for portraits. Six new WebPs add 129,108 bytes; all three complete decoration sets remain below 100 kB each. The main panel corner art is preserved at every aspect ratio, not squeezed into a rectangle. No per-card-size variants, new settings, animation loop or rasterized text. See rounds/round-04/VERDICTS.md and its browser evidence.

## 2026-09-07 — readable medallions and reward flow

Round 05 puts live localized amounts into deliberately blank dark centers in three new coin materials. The header uses the coin itself as its control, removing its redundant surrounding plaque. Clipped dialogs/reward cards use tight versions of the existing panels, with compensated nine-slice widths. Six new assets total 157,468 bytes across A/B/C; this supersedes the earlier total-decoration budget as a measured user-authorized extension. Form choices are Gift / Credits and five coin amounts; labels are For / Reward / Details. Collected rewards have explicit Ready/Used states with Undo. Phone reward tabs have equal widths and allow translated labels to wrap. See rounds/round-05/VERDICTS.md and verification/README.md. No new product skin selector: the top comparison toolbar exists only in the sample preview.
