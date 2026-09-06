# Bounty Hunter — Starlight glass

Locked 2026-09-07 by Michael. Reference: rounds/round-02/A-01.png, inspected directly. Supersedes round 01 material and page-heading treatment; workflow remains intact.

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
- Reuse a neutral glass texture through nine-slice borders; accent coloring is restrained CSS. No entire-screen raster, individual word images, permanent star flares, or extra skin selector.
- Keep existing compact header and responsive mobile bottom navigation, not the image's wide desktop-only composition. Existing dialogs remain intentionally opaque enough to read.
- B (Forged relic) and C (Astral lens) are preserved as possible later skins, not implemented now.
- Target <=150 kB incremental decoration. Record measured production asset bytes and browser evidence after implementation; physical iPhone performance cannot be established on Windows.
