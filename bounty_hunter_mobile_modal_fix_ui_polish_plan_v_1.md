# Implementation Plan (v1.0)

**Goal:** Ship a stable, mobile-first UI where modals never get trapped behind the mobile menu, the close button is always reachable, and core components look consistent. Preserve the galactic theme and existing animations, but sand down the rough edges. Defer the new "Daily Contracts" system to a later phase with a clear design stub.

---

## 0) Scope & Non‑Goals

**In scope (now):**
- Fix mobile modal/menu overlap and stacking issues.
- Standardize z-index usage via existing CSS variable system.
- Ensure the mobile close “X” is always accessible and not occluded.
- Introduce a single overlay portal root and a layer mutex in UI state.
- Standardize component sizing/typography/padding for cards, buttons, badges.
- Keep all colors and theme tokens; small animation polish only.

**Deferred (future):**
- Full “Daily Contracts” feature with recurrence, rewards, and calendar UI.
- Any color palette changes or brand overhaul.
- Any breaking refactors of routing or data layer.

---

## 1) Phase 1 — Mobile Modal Overlap: Fix & Hardening

### Objectives
- “Create Contract” modal must appear above the burger menu on all mobile breakpoints.
- Opening a modal auto-closes the mobile menu and vice versa.
- Close controls are always tappable; body scroll is locked under modal.

### Acceptance Criteria
- On 360×780, 393×852, 430×932 viewports (portrait):
  - Opening **Create Contract** closes the mobile menu and the modal renders above all UI.
  - Tapping backdrop or the “X” closes the modal. No page refresh required.
  - iOS Safari: no viewport jump; bottom sheets and full modals scroll internally, page behind stays locked.
  - Android back button while modal open closes the modal (not the page).
- No component uses ad‑hoc `z-50`/`z-[9999]` after this phase.

### Z‑Index Map (canonical)
Define once in CSS variables (root or theme file) and reference everywhere.

```css
:root {
  --z-base: 0;
  --z-header: 100;
  --z-drawer: 900;        /* mobile menu, side drawers */
  --z-popover: 1200;      /* tooltips, popovers */
  --z-modal-backdrop: 10000;
  --z-modal: 10100;       /* modal content */
  --z-toast: 20000;
  --z-debug: 30000;
}
```

Optional TypeScript enum for consistency at call sites:
```ts
export const Z = {
  base: 0,
  header: 100,
  drawer: 900,
  popover: 1200,
  modalBackdrop: 10000,
  modal: 10100,
  toast: 20000,
  debug: 30000,
} as const;
```

### Single Overlay Portal
- Ensure exactly one `#overlay-root` in `index.html` (sibling to app root).
- All modals, drawers, popovers render into this portal. No nested portals.
- Remove transforms/filters on ancestors that create unintended stacking contexts around overlay root.

### UI Layer Mutex (global state)
- Extend `UIContext` with `activeLayer: 'none' | 'menu' | 'modal' | 'popover'`.
- When opening a modal, dispatch `setActiveLayer('modal')` which auto‑closes menu/popovers.
- When opening the mobile menu, auto‑close modal/popovers.
- Backdrop taps and the top‑right “X” set `activeLayer('none')`.

### Mobile Close Control & Body Scroll Lock
- Close “X” lives inside the modal header, positioned with `position: sticky; top: 0;` to remain visible while content scrolls.
- Lock scroll on `<body>` when `activeLayer === 'modal'` using a tested utility (apply `overflow:hidden; touch-action:none;` and store/restore scroll position).

### iOS Safari Gotchas
- Use `height: 100dvh` for full‑screen modals.
- Avoid `position: fixed` within elements that have `transform` on iOS; render such content at the portal root.
- Set `overscroll-behavior: contain` on modal containers.

### Back Button & History
- When modal opens, push a lightweight history state `{modal: true}`.
- `popstate` closes the modal if present.

### Code Touchpoints
- `index.html`: ensure single `#overlay-root`.
- `UIContext.tsx`: add layer mutex and helpers.
- `MobileNav / Drawer`: adopt `--z-drawer`; close when modal opens.
- `CreateContractModal` and all modal primitives: adopt `--z-modal*`, portal to `#overlay-root`, sticky header with “X”, focus trap.
- Remove hardcoded `z-50`, `z-9999` in components. Replace with variables.

### Test Checklist
- Manual on real iOS Safari and Android Chrome.
- Keyboard focus trap cycles within modal; tabbing doesn’t escape.
- Screen reader announces modal role, title, and close action.

---

## 2) Phase 2 — Styling Consistency (Mobile‑First)

### Tokens (no color changes)
- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32
- **Radii:** 8, 12, 16, 24
- **Shadows:** `xs`, `sm`, `md` (mobile: prefer lighter blur to reduce GPU cost)
- **Typography scale:**
  - `display`: 28/34/700
  - `h1`: 22/28/700
  - `h2`: 18/24/700
  - `body`: 16/24/500
  - `caption`: 13/18/500

### Component Normalization
- **Cards (Task/Bounty):** consistent padding (16), radius (16), shadow (`sm`), header layout, coin badge placement.
- **Buttons:** `primary`, `secondary`, `ghost` variants with fixed heights (44), consistent icon sizes.
- **Badges/Coin display:** single `CoinBadge` primitive used app‑wide.
- **Lists:** consistent item spacing (12) and dividers only where useful.

### Animations
- Keep current effects but standardize durations: 120–200ms for micro‑interactions, 240–300ms for overlays.
- Prefer transform/opacity animations. Avoid animating blur on mobile.

### Acceptance Criteria
- Visual audit shows no mixed padding or inconsistent font sizes across TaskCard/BountyCard/CreateContract flows.
- Tap targets ≥ 44px everywhere.

---

## 3) Phase 3 — Mobile UX Polish & Perf
- Reduce backdrop blur radius on mobile to improve GPU stability.
- Lazy‑load heavy modal content below the fold.
- Ensure content skeletons for slow data.
- Smooth scroll restore when closing modals.

Acceptance: Lighthouse mobile perf does not regress vs current; interaction latency feels snappy on real devices.

---

## 4) Future — “Daily Contracts” Design Stub (Do Not Build Yet)

### Problem Statement
Recurring, reward‑bearing contracts that users schedule (e.g., every day, or Mon/Fri). Completing grants coins; missing has no penalty. Must be flexible, simple to author, and visible in a calendar‑like view.

### Minimal Data Model (Supabase)
- `daily_contract_templates`
  - `id` (uuid, pk)
  - `creator_id` (uuid)
  - `title` (text)
  - `description` (text)
  - `schedule_type` (enum: `everyday`, `weekdays`, `weekends`, `weekly`, `custom`)
  - `weekdays_mask` (int2, bitmask 0–127 for Sun..Sat)
  - `start_date` (date)
  - `end_date` (date, nullable)
  - `coin_reward` (int)
  - `is_active` (bool)
  - `created_at` (timestamptz)

- `daily_contract_occurrences` (materialized instances per user/date)
  - `id` (uuid, pk)
  - `template_id` (uuid fk)
  - `user_id` (uuid)
  - `date` (date)
  - `status` (enum: `pending`, `completed`, `skipped`)
  - `completed_at` (timestamptz, nullable)
  - Unique constraint `(user_id, template_id, date)`

- `daily_contract_rewards`
  - `id` (uuid, pk)
  - `occurrence_id` (uuid fk)
  - `coins_awarded` (int)
  - `awarded_at` (timestamptz)

### Scheduling Logic
- Start with `weekdays_mask` approach for simplicity; no RRULE engine yet.
- A nightly job (Supabase cron/edge function) pre‑generates next N days of `occurrences` for active templates.
- Completion endpoint marks occurrence and awards coins idempotently.

### UI Concept
- “Daily” tab: list today’s occurrences with big check buttons.
- Simple picker: Every day / Weekdays / Weekends / Custom days (checkbox list Sun–Sat).
- Calendar dots for completion streaks (no penalty visuals).

### Risks & Mitigations
- **Clock skew/time zones:** store dates and compute using user’s tz offset.
- **Double awards:** enforce unique reward per occurrence with db constraint.
- **Scale:** cap pre‑generation horizon to 30 days.

---

## 5) Delivery Mechanics
- Branch: `feature/mobile-modal-fix`
- PR Template checkboxes:
  - [ ] Replaced hardcoded z-index with tokens
  - [ ] Added `#overlay-root` and portaled modals
  - [ ] Introduced layer mutex in `UIContext`
  - [ ] Closed mobile menu when modal opens
  - [ ] Sticky header with visible close button
  - [ ] Body scroll lock on modal open
  - [ ] Android back closes modal
  - [ ] iOS Safari checked on device
  - [ ] No color changes; theme preserved

- QA pass on iPhone Safari and a mid‑range Android Chrome.

---

## 6) Rollback Plan
- Keep diff isolated to UI primitives and `UIContext`; no data changes.
- If regressions appear, revert `feature/mobile-modal-fix` and re‑enable legacy modal z-indexes temporarily (behind a flag in `UIContext`).

---

## 7) Handover Note for Windsurf
Implement Phase 1 exactly as specified, touching only the files listed, and replacing ad‑hoc z-indexes with tokens. Submit a PR with the checklist above and attach before/after mobile screenshots (Create Contract over open menu; closing behavior; back button). After merge, proceed to Phase 2 normalization scoped to Task/Bounty cards and buttons only.

