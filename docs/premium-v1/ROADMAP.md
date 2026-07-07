# Premium V1 Roadmap — Bounty Hunter

Written 2026-07-07 from a 4-track audit (design congruence, code review,
UX flow, assets/sound). Goal: TestFlight-ready app with a coherent,
premium bounty-hunter feel. Work through phases in order; each phase is
independently shippable.

## Phase 0 — Stabilize (DONE 2026-07-07)

- UI-primitives refactor verified and committed (was floating since Jun 18);
  2 broken theme-contract tests fixed.
- Two white-screen bugs fixed: emoji display names crashing avatarFallback;
  duplicate UserCredits realtime subscription unmounting the app on desktop.
- ConfirmModal a11y (Escape, dialog role, focus, 44px close); toasts above
  confirm overlays.
- Dead weight: shipped payload cut ~71 MB → ~2 MB (marketing art, raw audio,
  unused fonts moved to assets-src/); dead Google Fonts (Orbitron/Rajdhani/
  Inter/Bebas) removed; 1 MB logo replaced with sized versions.
- Sound root cause fixed: 10 sound keys the app was already requesting were
  never registered (silent no-op) — nav clicks, save, approve, friend
  request now actually play.
- Safe areas: header/menu respect the iPhone notch; `.safe-bottom` for sheet
  footers; `.modal-enter` standard modal animation; global `.text-sm`
  font-weight bug fixed; `Spinner` primitive added.

## Phase 1 — Congruence (IN FLIGHT, agents working)

Every button → AppButton (cta/secondary/ghost/danger), every modal →
`.modal-enter` + Escape + 44px close + one backdrop recipe, every
loading/empty state → PageState/EmptyState/Spinner, hardcoded teal →
`var(--mode-accent)` so family/couple themes actually recolor.
Remaining after agent batches:

- [ ] Dead CSS purge: ~800 lines in index.css are grep-verified unused
      (Route 66 cards, galactic bounty cards, laser box, old shimmer).
- [ ] Extract shared `TabBar` (Friends + RewardsStore drift).
- [ ] One `ModalShell` to own backdrop/surface/close/animation (Create/
      EditBounty, TaskForm, ProofModal, ProfileEditModal migrate onto it).
- [ ] Single source of truth for mode accent hexes (currently 4 copies:
      index.css, modalTheme.ts, ProfileEditModal, OnboardingStep1Mode).
- [ ] i18n sweep: ~30 hardcoded English strings (PageState defaults,
      IssuedPage Fab/empty titles, ArchivePage stats, "Loading credits…",
      de `rewards.confirmDialog` block missing).

## Phase 2 — UX coherence (the "feels random" fix)

Ranked by impact; all evidence in the UX audit (see git history of this
session or memory/LOG.md):

1. **One noun system.** Task object is called Contract, Mission, Task,
   Chore, and "Bounty Contract" depending on the screen; "bounty" is
   doubly booked (store item AND task type). Decision needed (Michael):
   canonical noun per mode — recommend **Mission** (guild) / theme-driven
   elsewhere, store items become plain **Rewards**, "Bounty" reserved for
   the credit pot on a mission. Then purge `taskForm.*`, `contracts.*`,
   ~30 toast strings.
2. **Action badges + realtime.** Nav badges exist only for friend
   requests. Add: badge on Missions tab for proofs awaiting my approval;
   badge on Contracts tab for newly assigned/rejected missions. Wire the
   orphaned realtime channel in `src/hooks/useTasks.ts` into
   useAssignedContracts/useIssuedContracts. This closes the "loop stalls
   because nobody knows it's their turn" hole.
3. **Rejection loop.** Rejecting a proof silently resets the task and
   deletes the proof — no reason, no visible state. Add a reason field +
   "Rejected — resubmit" state on the assignee card.
4. **History reachable.** Archive action toasts "moved to History" but the
   History nav item is commented out (Layout.tsx). Re-enable it (or drop
   the archive action).
5. **No-friends dead ends + external invites.** TaskForm warns "add
   friends first" without linking (fixed in Phase 1 batch); both invite
   surfaces only find existing accounts. Add a shareable invite link
   (deep link or signed URL) — a two-player app must recruit player 2.
6. **Mode + onboarding persistence.** Theme and onboarding-complete are
   localStorage-only; `Onboarding.tsx` already reads `profile.theme` that
   nothing writes. Persist both to profiles (needs a small migration —
   prod SQL rule applies: backup + Michael's go).
7. **Orphan surfaces.** `/profile/edit` duplicates ProfileEditModal,
   leaks all 3 modes past V1 gating, and exposes a debug panel via URL.
   Fold "Restart onboarding"/system status into the modal or delete the
   page. Also delete the `/my-rewards` alias or keep documented.
8. **Collected-rewards loop.** Collected tab is terminal — add "mark as
   redeemed/delivered" so gift contracts feel complete.

## Phase 3 — Visual identity & generated assets

Pipeline confirmed working: Codex CLI (v0.128.0) + `gpt-image-2-skill`
(~/.codex/skills/) → transparent-friendly renders → post-process →
drop into slots. The full 10-slot spec is in the asset audit; priority
order:

1. **Coin set** — replace the CSS-gradient SVG face with premium art
   (256px master; 24–80px usage; keep the number as overlaid text so
   values stay dynamic; must survive 2D spin). Optional per-mode tint.
2. **Contract-type emblems** — the actual product ask: gift/bounty
   contracts visually distinct. Gift emblem (replaces 🎁 at TaskCard,
   MissionModalShell, RewardCard fallback) + credit emblem, per-mode
   variants (guild loot-crate / family present / couple heart).
   Card treatment: type emblem + accent outline per type instead of the
   current random-hash accent.
3. **Mode identity artwork** — onboarding mode cards + modal headers
   (currently one lucide icon per mode). 3 hero illustrations.
4. **Empty-state illustrations** — 4-5 spots, per-mode tint.
5. **Reward-store placeholder art** — the biggest visible slot
   (square card tops), 3–5 rotating designs.
6. **iOS app icon + splash** (1024 icon, 2732 splash) — needed for
   TestFlight anyway; derive from the logo.

Data model already supports more than the UI shows: `is_daily` +
streaks have full theme strings but zero UI — a daily badge + streak
flame is a cheap, high-feel add here.

## Phase 4 — Sound & haptics

- Registry fixed in Phase 0; remaining: audition/replace placeholder
  mappings (upload/toggle currently alias click files), volume pass.
- Add `@capacitor/haptics`: light impact on button taps, success notify
  on approve/claim, warning on reject. Wrap in one `feedback.ts` util
  (sound + haptic together, respects the sound toggle).
- Consider a distinct "payday" sound for credit award + count-up.

## Phase 5 — Ship vehicle (Capacitor / TestFlight)

- `npx cap sync ios` against the slimmed dist; verify safe areas on
  device; keyboard resize behavior on forms.
- App icon + splash from Phase 3; bundle id `com.bountyhunter.app`.
- Push notifications: defer to post-TestFlight; badges + realtime
  (Phase 2) cover the in-app need first. When wanted:
  `@capacitor/push-notifications` + a Supabase Edge Function on
  task-status change.
- Pre-flight: root tsconfig has `files: []` so `npm run build` never
  typechecks pages — 17 stale-type errors exist under `tsc -p
  tsconfig.app.json`; regenerate `src/types/database.ts` once prod
  schema is reconciled (CODEX_NEXT_STEPS).
- Backend items that gate real users: production migration state
  reconciliation, storage bucket policies verification, task lifecycle
  RPCs (all pre-existing, tracked in CODEX_NEXT_STEPS.md).

## Feature assessment (Michael's ideas)

**Public matching / feed ("Tinder for chores", open requests to
strangers):** different app. It changes the trust model (strangers vs
private group), triggers App Store UGC-moderation requirements
(reporting, blocking, moderation), marketplace liability, and a
discovery/matching backend. Recommendation: park it as a separate
product experiment (Phase 6+ or its own repo); don't let it delay V1.

**The in-scope stepping stone — "Open Bounties" board:** post a mission
to your whole guild instead of one assignee; first friend to accept
claims it. Reuses tasks table (nullable assignee + `claimed_by`),
existing cards, existing approval flow. Delivers 70% of the
"marketplace feeling" with zero stranger-danger. Good Phase 2.5/3
candidate and a natural use for the Archive-style feed surface.

**Contract sourcing (how missions get created):** today creation is a
blank form behind one FAB. Add a template library ("Clean the kitchen",
"Airport pickup", "Massage voucher"…, per-mode sets, with emblem art
from Phase 3) + a "duplicate past mission" action. Cheap, directly
attacks the empty-dashboard cold start, and makes the create flow feel
designed. Recommend doing this alongside Phase 3 art.

## Standing decisions parked for Michael

- Canonical noun set per mode (Phase 2.1).
- Proof types allowed (PDF/text/private) — pre-existing.
- Prod SQL go/no-go per runbook — always.
