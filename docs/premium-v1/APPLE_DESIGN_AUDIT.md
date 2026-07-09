# Apple-Design Audit — Bounty Hunter

Date: 2026-07-10. Source: global `apple-design` skill (WWDC *Designing Fluid Interfaces* et al.),
applied against the app's real design language (galactic dark theme, Mandalore/Poppins,
mode accents, glass materials, CSS-only motion). Section numbers (§) refer to the skill.

## Verdict

The app's foundations are better than average: symmetric modal paths (slide-up/down on
mobile, scale-up/down on desktop — §7 ✓), a token-driven glass material system (§12 ✓),
a semantic sound+haptics API firing on causal events (§13 ✓), z-index and modal tokens,
and partial reduced-motion support. The gaps were all in the same place: **response
latency and press feel** (§1) — the things users touch hundreds of times a day — plus
incomplete accessibility fallbacks (§14).

## Applied in this pass

| # | Principle | File | Change |
|---|---|---|---|
| 1 | §1 Response | `src/index.css` | Buttons transitioned with `all 0.3s ease-in-out`, so the `:active` press scale ramped over 300ms — mushy. Now `:active` overrides `transition-duration` to `0.08s` (press lands in ~1 frame), while release still settles back at the graceful base speed. Instant in, smooth out. |
| 2 | §1 Response | `src/index.css` | `touch-action: manipulation` on `.btn-*`, `.nav-item-galactic`, `.modal-icon-button` — kills iOS Safari's double-tap-zoom tap delay. |
| 3 | §1 / §10 | `src/components/TaskCard.tsx` | The single most-touched element had **no press state**. Now `motion-safe:active:scale-[0.99] active:duration-100 touch-manipulation`. |
| 4 | §1 / §10 | `src/components/ui/Fab.tsx` | Hover-only feedback (`hover:scale-110`) — nothing on touch, where hover doesn't exist. Now `motion-safe:active:scale-95 active:duration-75 touch-manipulation`. |
| 5 | §1 / §10 | `src/components/RewardCard.tsx` | Same hover-only problem; added press scale + `touch-manipulation`. |
| 6 | §7 Spatial consistency | `src/index.css` | New motion tokens `--ease-enter: cubic-bezier(0.32,0.72,0,1)` (iOS sheet curve) and `--ease-exit: cubic-bezier(1,0,0.68,0.28)` (its exact mirror). Modal enter/exit now travel the same path with mirrored easing instead of generic `ease-out`/`ease-in`. Enter durations raised (slide-up 0.35s, scale-up 0.25s) — the fluid curve front-loads motion so it *feels* faster while settling softer. Exit durations unchanged (0.2s/0.15s) so the JS unmount timers (`MissionModalShell` 200ms) stay valid. |
| 7 | §14 Reduced motion | `src/index.css` | Modal fallback was `animation: none` — a closing modal froze fully opaque for 200ms then vanished. Now slides/scales become 0.15s opacity cross-fades (non-vestibular, but open/close still reads). |
| 8 | §14 Reduced motion | `src/index.css` | New global block: coin spins, coin-sheen sweep, scan-line sweeps, laser-pulse, cursor trail, and button hover/press transforms all disabled under `prefers-reduced-motion`. Opacity/color press feedback intentionally kept — reduced motion ≠ no feedback. Tailwind scales in components use `motion-safe:`. |
| 9 | §14 Reduced transparency | `src/index.css` | New `prefers-reduced-transparency` block: modal tokens go solid (`--modal-bg` opaque, blur 0), `.glass-card`/`.input-field` frost over. |
| 10 | §12 Materials (craft) | `src/components/modals/MissionModalShell.tsx` | The flagship modal hardcoded its material inline (`rgba(12,18,40,0.92)`, `blur(16/24px)`); now reads `--modal-bg` / `--modal-blur-*` / `--modal-border` tokens — one source of truth, and the reduced-transparency fallback reaches it. |
| 11 | §16.7 Craft | `tailwind.config.js` | `animation` key was declared twice in `extend`; the first (`spin-slow`) was silently dead. Merged. |

## Deliberately NOT changed (restraint is the aesthetic — §16.1/§16.6)

- **Sound/haptics on `onClick`** (AppButton/Fab): commit-time feedback is causality-correct
  (§13); visual press response is already instant via `:active`. Moving haptics to
  pointer-down would fire on cancelled taps.
- **Brand typography** (Mandalore 0.3em tracked titles, Poppins 500 body): §15 would say
  tighten large text, but this is deliberate sci-fi identity — brand overrides Apple defaults.
- **No spring library added.** Nothing in the app is gesture-driven enough to need
  interruptible springs (pull-to-refresh and swipe are library-handled). Adding
  motion/framer-motion for fixed-duration modals would be dead weight. Revisit only if a
  draggable sheet is built (then: damping 0.8 / response 0.3, velocity handoff per §5–6).
- **Hover glows, scan-lines, starfield**: decorative brand identity, kept (now
  reduced-motion-aware).

## Parked (next candidates, in impact order)

1. **Draggable bottom sheet** for `MissionModalShell` on mobile — grab, 1:1 tracking,
   velocity-projected dismiss (§2/§5/§6). The one place a real spring would pay for itself.
   High effort; needs a gesture util + spring.
2. **Materialize on enter** (§12): animate blur radius with scale on modal enter. Skipped —
   animating `backdrop-filter` is a compositor cost on low-end phones.
3. **Scroll edge effect** (§12): the header already blurs on scroll; a fade-mask where
   content meets it would finish the effect.
4. **Count-up on credits** already eases out and respects reduced motion (`UserCredits.tsx`) —
   could take a payday overshoot tick (damping 0.8) since credits landing carry momentum (§4).
