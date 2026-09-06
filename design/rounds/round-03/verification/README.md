# A/B/C skins and dialog polish — 2026-09-07

Implemented in `59c29e2`, independently reversible from the earlier Starlight and workflow commits. Michael explicitly approved B and C and delegated the dialog refinements. Release/security/iPhone testing remains the next milestone.

## Try it

The [local sample preview](http://127.0.0.1:6077/) is open on B — Forged. Avatar → Appearance → Starlight / Forged / Astral. Choice is remembered on this device and is independent of the Mint/Gold/Rose account palette. A remains the default on devices without a saved choice. Changing a skin does not require Save Changes.

## What changed

- B: generated graphite/brass frame on navigation, cards, dialogs and controls; a warmer metallic Mandalore heading and inset dark panels.
- C: generated chamfered optical frame, cyan/violet reflections, floating navigation and a static orbital heading accent.
- Both use one reusable transparent WebP each: [Forged](../../../../src/assets/generated/forged-frame.webp), 29,520 bytes; [Astral](../../../../src/assets/generated/astral-frame.webp), 20,438 bytes. Built-in image generation; [exact prompts and original assets](../assets/PROMPTS.md). The total new production artwork is 49,958 bytes. No new dependencies, backend fields, skin engine, generated text or denomination alphabet.
- Credit numbers now sit beside the coin as live, localized text. Removed unused Coin animation/overlay APIs and associated spin CSS. Zero stays visible; decorative coins have no invented numeral.
- Evidence no longer has an extra top margin; desktop evidence/reward panels stretch together. Two action columns share width, minimum height and typography. Sample mission cards also share a 96px minimum content height, while longer content can grow.
- A one-shot 700ms rim sweep runs on button hover/focus/click. No idle loop or pointer tracking. Existing immediate action/haptics, loading, disabled states and focus management remain.

## Verification performed

- `npm test`: 345 tests / 29 files pass. New tests cover restored/default/invalid skin values, in-session choice with blocked writes, no account write or palette change, localized large amounts, zero and decorative coins.
- `npx tsc -p tsconfig.app.json --noEmit`: clean. `npm run build`: passes, main JS 351.15 kB (103.92 kB gzip). `npm run lint`: 0 errors, 3 existing Fast Refresh warnings. `git diff --check`: clean.
- Built the separate `tests/ux-preview/vite.config.ts` fixture and inspected it through the browser. Regular `dist` has no sample-data banner, fixture token, test email or stress-scenario markers.
- Desktop 1280×900: switched A/B/C, confirmed stored choice survives reload and A uses its original frame. Three sample mission cards all measure 137.33px high. Review panels have identical top and bottom edges (193.33px height); Approve/Reject each measure 202×48px.
- Phones: B and C at 390×844; German B review and selector at 360×800. Both German actions measure 157.33×49.33px and 12.500 fits beside the coin. Fixed a 2px outer scroll caused by the bottom frame: final B/C body height/width match the 844×390 viewport.
- Keyboard Tab reached Accept contract and its computed rim-glint animation was 0.7s. Accept changed the sample to In progress; Approve completed it; Reject opened the existing confirmation and then moved it to Sent back. No browser errors during the walkthrough.
- Source review checked reduced-motion, increased-contrast/reduced-transparency and forced-color fallbacks. They disable moving light/decorative rims as appropriate; OS preference emulation and physical iPhone rendering were not performed.

The fixture uses in-memory sample records. These checks do not establish live Supabase, storage, push, email or iOS readiness. No live data or security configuration was changed.

## Screenshots

- [B desktop](B-desktop.png), [B review](B-review-desktop.png), [B phone](B-phone.png)
- [C desktop](C-desktop.png), [C phone](C-phone.png), [C Accept](C-phone-accept.png)
- [A remains available](A-desktop.png), [final selector](skin-selector.png)
- [German 12.500-credit review](B-phone-review-de-12500.png); [German selector at 360px](skin-selector-de-360.png) was captured before the final shared dialog frame was added.

To reproduce larger amounts, open `/issued?scenario=skin-stress` in the separately built fixture. Ordinary reload restores fictional records; this scenario is not compiled into the regular app.
