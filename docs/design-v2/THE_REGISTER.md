# THE REGISTER — Design Direction V2

> **North star:** *"I can see exactly what I'm worth to the people I live with, and there is no way to fake it."*

Written 2026-07-24 from an adversarial design review run across 23 agents: 7 forensic recon passes,
7 design-director critiques, 5 competing design directions, 1 principal-engineer stack assessment,
and a 3-lens judge panel (taste · daily-use · memorability). THE REGISTER won two of three lenses
and placed second on the third. This document is the synthesis: THE REGISTER as the spine, with the
best grafts from BESKAR, INK & SIGNAL, THE RELAY and THE VISOR, and the slop the judges named
explicitly killed.

Status: **proposal**. No code changed. Nothing here ships without Michael's go.

---

## 1. The verdict on what exists today

The honest summary is that this app has an ambition in `package.json` and a CRUD form in `src/`.
It declares `animejs`, `react-confetti`, `react-swipeable`, `react-currency-input-field` and
`react-hook-form` — five libraries for motion, celebration, gesture, money and forms — and imports
exactly zero of them. That gap is the whole review in one line. The fantasy was specified; the feel
layer was never built.

**The atmosphere is only visible when you are logged out.** `index.css:234` paints the body with
`radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)` — the starfield ground the entire
visual identity rests on. `Layout.tsx:171` then wraps every authenticated screen in
`<div className="h-screen flex flex-col bg-indigo-950">`, an opaque `#1a1a3a` (remapped in
`tailwind.config.js:8`). Because `Layout.tsx:166-168` early-returns a bare `<Outlet />` when there
is no user, Login and Invite are the *only* two routes in the product that ever show the gradient.
The moment you sign in, the app's sky is painted over with flat indigo. There are also no stars: the
starfield pseudo-elements are commented out at `index.css:240` and were never restored. A one-line
fix recovers the single most identity-carrying surface in the product.

**The one typographic decision that says "Star Wars" renders at a third of its value.**
`.app-title { letter-spacing: 0.3em }` (`index.css:75`) and `.text-display { letter-spacing: 0.1em }`
(`index.css:112`) are both single-class selectors at identical `(0,1,0)` specificity. `PageHeader`
applies both. The later rule wins, silently, on every page title in the app — and it kills the
mobile `0.15em` override for the same reason. Compounding it: all three `@font-face` blocks declare
`font-weight: normal`, yet the display classes apply `font-bold`, so the browser synthesises bold by
smearing a deliberately thin, wide face at exactly the two loudest brand moments.

**Mode theming repaints about 15% of the pixels.** `--accent-blue: #00d4ff` is hardcoded at
`index.css:204` and is what `.glass-card`, `.nav-item-galactic-active` and `.input-field:focus`
actually consume. So every card, nav pill, focus ring and button glow is cyan regardless of whether
you are in guild, family or couple mode. The mode accent is a sticker, not a theme.

**Five distinct moments in the core loop resolve to five identical toast pills.** Accepting work,
transmitting proof, rendering a verdict, getting paid, claiming a reward — all of them end in a
3500ms `react-hot-toast` rectangle saying things like `Task submitted for review!` and
`Task moved to History!`. Meanwhile the app has an elaborate theme-strings system it bypasses
entirely in those toasts, and the two motion behaviours that *do* exist are hover and press on
buttons — the least meaningful interactions in the product. Card `:active` is `scale(0.99)`, which
on a 358px card is 1.8px of travel: below the perceptual threshold, on the most-repeated interaction
in the app.

**The reward fires on the wrong phone.** `feedback.payday()` is called at exactly two sites —
`IssuedPage.tsx:212` and `RewardsStorePage.tsx:115` — and both are the device of the person *giving
money away*. The hunter who did the work experiences their payout as a card that quietly changed
from yellow to green. *(Note: four of the five direction documents claimed this fires "exactly once";
it fires twice. The substance holds, the count did not — verified before writing.)*

**Four things are built, complete, and switched off.** A full streak subsystem —
`daily_mission_streaks` table, `computeNewStreakCount` with passing tests, plus two duplicate client
implementations in `src/domain/streaks.ts` and `src/hooks/useDailyMissionStreak.ts` — has zero
consumers. `proof_description` is collected by `ProofModal`, sent as `p_proof_description`, stored in
`tasks`, and rendered by no component at all, so a hunter who does the chore and writes two careful
paragraphs instead of attaching a photo shows their issuer a blank dossier. `credit_transactions` is
written on every earn and every spend and read by nothing. And `in_progress` exists in the type
union, in the transition map at `contracts.domain.ts:55`, and in the Dashboard filter — but no
assignee UI ever writes it, so there is no way to *accept* a contract. `soundManager.ts:52` even
registers a key literally named `acceptContract`, fired only from a code path assignees cannot reach.

**What is genuinely good and must be protected.** The correctness discipline is better than most
shipped products: storage-cleanup-before-row-delete with the RLS reason in a comment, atomic
`WHERE status='review' AND created_by=auth.uid()` race guards, stable toast ids, synchronous ref
guards, an RPC-authoritative lifecycle. The `prefers-reduced-transparency` block at `index.css:1094`
is better than most design systems ship. The mirrored `--ease-enter`/`--ease-exit` pair is real
craft. `MissionModalShell`'s full-bleed mode-hero header with its two-layer scrim and per-mode
`objectPosition` tuning is the best art direction in the app. The generated empty-state set is five
objects that are genuinely *empty* rather than five shrugs, in one coherent gold-on-black hand —
do not regenerate them. And `useCountUp` in `UserCredits.tsx:144-177` is interruption-safe motion
code written by someone who cared.

---

## 2. The idea

**THE REGISTER.** Standing is earned, never bought.

The app already contains a complete, server-authoritative, un-cheatable progression system and has
never rendered a single pixel of it. `user_credits.total_earned` is typed at `database.ts:402`. It
is incremented only by `increment_user_credits`, which is `service_role`-only, reachable only through
`approve_task`, which requires that **someone else** created the contract and approved your evidence.
`purchase_reward` spends `balance` and never touches it. Both credit reads in the entire client
select `'balance'` and nothing else (`useUserCredits.ts:28`, `UserCredits.tsx:43`).

So the database has been quietly maintaining a monotonic, un-mintable record of what the people you
live with judged your work to be worth — for months — and the UI collapsed it into one number.

**Balance is what you can spend. Standing is what you are.**

That distinction is the whole direction, and the reason it wins is that it is not a design assertion.
It is an RLS policy. Standing cannot be bought (the store only spends `balance`), cannot be
self-awarded (approval requires `created_by = auth.uid()` and pays `assigned_to`), and cannot be
lost. A bounty hunter's defining attribute was never the helmet or the starfield — it is standing
with the guild. Every other direction proposed painting the fantasy onto the surface. This one
discovers that the schema already *is* the fantasy and needs a face.

Around that spine, three grafts:

- **The chassis is BESKAR's.** One persistent machine with a top relay rail and a bottom thumb rail,
  which never unmounts on navigation. Material law: *beskar is structure — brushed dark metal,
  etched hairlines, weight, never glows. Holo is light the machine projects — the mode accent,
  always glowing, never has weight.* Metal never emits; light never has mass. One sentence a whole
  team can hold in its head, and it kills the generic-glassmorphism read without a component rewrite.
- **The physical vocabulary is INK & SIGNAL's.** Two verbs and nothing else: **ink** is a stamp —
  instantaneous, local, percussive, permanent. **Signal** is a wire — directional, travelling,
  arriving. Accept is ink. Transmit is signal. Verdict is ink. Payment is signal. That is not a
  metaphor imposed on the app; it is the app's own two-person architecture made visible.
- **The warmth is THE RELAY's**, stripped to its honest half: a presence arc that shows your crew is
  reachable, with no room labels and no punishment for absence.

---

## 3. The signature moves

### 3.1 STANDING — the second number

Two numbers in the rail, with two meanings. **Balance** (gold coin pill, exists today) is what you
can spend. **Standing** is what you are: a 22px CSS-drawn hexagonal sigil, a rank word in
MandaloreTitle at 11px/0.18em, and a 2px bar under the rail filling toward the next band.

**Five bands, not nine.** The judges were unanimous that nine was three too many, and the direction
itself conceded it could not calibrate absolute thresholds across a family paying 5 a chore and a
couple paying 200. Five bands, with the metal ramp carrying the progression:

| Band | Name | Standing | Metal |
|---|---|---|---|
| 0 | UNSWORN | 0 | none — hollow outline |
| 1 | DRIFTER | 120 | iron `#B9C2CF → #7E8899 → #6B7484` |
| 2 | TRACKER | 600 | iron, three chevrons |
| 3 | IRONMARK | 2,000 | brass `#F0DFA0 → #C9A227 → #8C6F1A` |
| 4 | THE NAMED | 8,000 | the mode accent itself |

Reaching the top means your mark finally takes the guild's own colour.

Rank-up is the only ceremony in the app over one second, and it happens roughly four times in a
user's life: board dims to 0.35 over 220ms → sigil at 96px cross-fades its metal ramp over 420ms on
`--ease-metal` while rotating 0 → −6deg → 0 → a 1px accent ring expands `scale(1)→scale(3.2)`,
opacity .8→0 over 520ms → the rank word wipes in left-to-right via `clip-path: inset(0 100% 0 0)` →
`inset(0)` over 300ms → subline `6,240 EARNED · 41 SEALED · SARAH VOUCHED FOR 28` fades over 240ms →
dismiss on tap or 3.5s. Sound: `seal`, `payday` at +140ms, `success` at +320ms — the only three-note
event in the product. Haptic: Heavy, then Success.

**Build:** `useStanding.ts` extends the existing select from `'balance'` to `'balance, total_earned'`.
`src/core/credits/standing.domain.ts` is a pure function next to the existing `credits.domain.ts`, so
it gets Vitest coverage on day one. `StandingSigil.tsx` is a `clip-path` hexagon carrying
`background: var(--standing-metal)` — no art. Rank names go into `ThemeStrings`, where
`themes.test.ts:52-55` already enforces three-mode parity.

**Cost:** ~0 kb. One extra column on a query that already runs. **Reduced motion:** ceremony loses
the dim, rotation, ring and wipe; sigil cross-fades its metal over 300ms and the hold extends to
2.5s because there is less to read it by. The bar snaps.

**The day-one trap, designed for up front:** standing only counts contracts *someone else* issued, so
a solo user exploring before they invite anyone sits at UNSWORN with a zero bar — the worst possible
first run. In the UNSWORN state the bar does not render at all. It renders the invite affordance and
one line: *"Standing is granted by others. Bring someone in."* The empty state becomes the
recruitment funnel.

### 3.2 THE SEAL — one gesture for every commitment

Every irreversible act in the loop ends the same way: **something is stamped.**

A 44px ring carrying a glyph arrives at `scale(1.9)` opacity 0 and lands at `scale(1)` opacity 1 over
**180ms on `--ease-press: cubic-bezier(0.2,0,0,1)`** — fast attack, hard stop, no overshoot, because
a press is not a bounce. At +140ms a 1px ring of the same colour expands `scale(1)→scale(2.4)` and
fades over 420ms. The surface underneath takes a 110ms `translateY(2px)` recoil — the paper flexing,
and the single most satisfying frame in the app. Haptic Medium on the landing frame.

Five uses, five glyphs, one gesture:

| Moment | Glyph | Colour |
|---|---|---|
| Accept a contract | your Mark | `var(--mode-accent)` |
| Transmit proof | chevron | `#8b5cf6` |
| Render a verdict — paid | issuer's Mark | `#22c55e` |
| Render a verdict — sent back | open ring | `#f97316` |
| Seal a record | wax disc | `#8E1B14` |

**The stamped mark persists on the card afterward** at 28% opacity, rotated −8deg. A card you
accepted looks different from a card you merely read, forever.

Three of five directions independently converged on the stamp as this app's signature gesture. That
convergence is the strongest single signal the exercise produced.

**Build:** `src/components/visual/Seal.tsx` (~50 lines) + three keyframes. Renders into a new seal
layer — `position:fixed; inset:0; pointer-events:none; z-index:10250` — slotted into the documented
ladder at `index.css:700-725`, above modal controls (10200), below critical overlays (99000). So a
seal lands over an open dossier. **Cost:** ~75 lines, 0 kb, 0 new art, transform/opacity only.
**Reduced motion:** the mark still appears and still persists — it simply does not strike.

### 3.3 THE ANTI-CEREMONY — it lifts, it does not slam

Rejection uses the same instrument inverted, and the inversion is the argument: a returned contract
is not destroyed, it is handed back. The `SENT BACK` seal is already resting on the dossier at
opacity 0.30 in **orange `#f97316`, not red**. Then over 320ms on `--ease-exit` — the mirror curve,
finally used on something that deserves it — the seal **lifts**: `scale(1)→scale(1.22)`, opacity
0.30→0, `blur(0)→blur(3px)`, and the drop-shadow *grows* as it is pulled away. No shock ring, because
nothing lands. The surface goes opacity 1→0.88 for 200ms and back. It exhales.

**Global dignity law:** no ceremony in this app ever shakes at a person, flashes red, buzzes, or
plays a descending tone. This also fixes a live hierarchy inversion — today deleting a *draft* gets
`feedback.warning('delete')` with an actual sound file, while telling a real person their work was
rejected gets `feedback.warning()` with no sound key at all: bare haptic and silence.

It also fixes a real bug on the way: `mapTaskStatusToModalState` currently returns `'overdue'` for
`'rejected'`, so a hunter whose work was bounced is told in red that they missed a deadline that may
be a week away.

### 3.4 THE DROP — payday has mass, and lands on the right phone

The instant a hunter's contract flips to `completed`, **on their device**:

`N = min(5, ceil(amount/10))` coins spawn at the card's coin rect and fly to the credit rail over
620ms on `cubic-bezier(0.32,0.72,0,1)`, staggered 55ms, `scale(1→0.42)`, `rotate(0→±180deg)`. The
path is a genuine arc, not a lerp: 12 sampled keyframes of `y = y0 + t*(y1-y0) + g*t*(1-t)` with
`g = -140px`. A wire sags; money falls.

On **each** landing: the credit badge takes `scale(1)→scale(1.10)→scale(1)` over 320ms plus a ring
`0 0 0 0 rgba(245,215,110,.65) → 0 0 0 14px rgba(245,215,110,0)`, one `coin` sound at
**`playbackRate` jittered ±4%** so five landings do not sound like one file looped, and one
`Haptics.impact({style:'Light'})`. Three to five light taps in sequence is a physical count of what
you earned. The balance counts up in tabular figures using the existing `useCountUp`.

**The 400ms hold is cut.** INK & SIGNAL specified 400ms of the coin sitting still — "the frame you
watch 300 times." Two judges independently killed it: you watch it twice, then you are holding a hot
pan. Total ceremony lands under 800ms.

**Build:** WAAPI (native, 0 kb), `<Coin>` already exists, coin art already loaded. This is what
replaces `react-confetti` — and it is why that dependency should be deleted rather than wired.

**The addressing fix is the actual work.** A `usePayoutWatcher` diffing `review → completed` in
`useAssignedContracts`, mounted **once inside the persistent chassis — never in a page, because pages
unmount**.

### 3.5 THE GUILD RATE — rarity that cannot inflate

Every contract carries a tier derived from what it pays **relative to the household's own going
rate**: `r = credits / guildRate`, where `guildRate` is the rolling median payout of the last 30
approved credit contracts.

| Tier | Ratio | Treatment |
|---|---|---|
| ROUTINE | r < 0.6 | no rail, `rgba(255,255,255,0.08)` border |
| STANDARD | 0.6–1.5 | 2px left rail, `rgba(var(--mode-accent-rgb),0.45)` |
| MARKED | 1.5–3 (or proof_required at r≥1) | 3px rail `#C9A227` + 12px cut corner |
| PRIORITY | 3–6 (or deadline ≤24h, bumped one tier) | 3px rail `var(--mode-accent)` + 16px notch + inner hairline |
| BLACKMARK | r ≥ 6 | 3px rail `#B3271E`, 20px notch, 28px wax disc + one 620ms sweep on mount |

This app mints credits from nothing — `approve_task` credits the assignee and never debits the
issuer — so absolute thresholds ("80+ is rare") decay to meaninglessness the first time someone posts
a 500-credit contract as a joke. Expressing tier as a ratio to the household's own median makes
rarity **self-calibrating and structurally inflation-proof**: if everyone starts paying 500 for the
bins, 500 becomes the standard and nothing is rare, exactly as it should be.

It is also the one idea in the corpus that **fails the paste test in the good direction** — you
cannot lift it into another product, because it only works in a small closed economy.

The create form gains the rate as an anchor: `GUILD RATE · 20`, quick-picks at 0.5× / 1× / 2.5×, and
a live tier readout that updates as you type. You feel the weight of what you are minting *before*
you post it. In the store, every price is denominated in work: `240 · TWELVE CONTRACTS AT RATE`.

**Guardrails (non-negotiable):** floor the rate at 20 until `n ≥ 5` samples; cap movement at ±25% per
week; and **never downgrade a tier already rendered to a user** — freeze tier at accept time. Accept
that a new install shows mostly STANDARD in week one, which is honest.

**Build:** `deriveContractTier()` in `contracts.domain.ts`, which already ships a Vitest suite.
Rendering is pure CSS custom properties on the existing `BaseCard`. **Cost:** ~120 lines, 0 kb,
0 queries, 0 migration. Rails and notches are static geometry — reduced motion untouched.

### 3.6 ACCEPT CONTRACT — the missing verb

`in_progress` exists in the type union (`custom.ts:55`), in the transition map
(`contracts.domain.ts:55`), and in the Dashboard filter (`Dashboard.tsx:205`). No assignee UI writes
it. Split TaskCard's primary action: `pending` → **ACCEPT CONTRACT** (writes `in_progress`, presses
your Mark into the card, fires `feedback.success('acceptContract')` — the sound key that has existed
this whole time); `in_progress` → **TRANSMIT PROOF**.

This is the cheapest large win in the document. It converts a todo list into a board where work is
*taken*, and it is the moment the fantasy first becomes true.

### 3.7 THE EVIDENCE PANEL — stop hiding the work

`proof_description` is collected, transmitted, stored and rendered by nothing. Both render gates test
only `proof_url`. A hunter who writes a careful account instead of attaching a photo shows their
issuer a blank dossier.

The dossier body opens with an EvidencePanel spanning both desktop columns: inline `<img>` /
`<video playsInline>` / PDF tile off the signed URL, plus the hunter's written report. Today the
proof is a text link that ejects you to a Chrome tab — which on Capacitor iOS is a full app-switch
round trip, in the middle of the one decision the whole loop depends on.

Pair it with **swipe-to-verdict** on the review queue via `react-swipeable` (already a dependency,
zero imports): drag tracks 1:1 to 80px then rubber-bands at `80 + (raw-80)*0.42`; crossing threshold
fires `Haptics.selectionChanged()` once — the iOS picker detent, a completely different sensation
from an impact, and an API this app has never used. Right approves, left sends back. A five-proof
Sunday backlog goes from five open-scroll-leave-return cycles to about fifteen seconds.

---

## 4. The gimmicks — the week-3 depth

1. **THE NAMED.** Cross into band 4. Never announced, never in a tooltip, not in onboarding. Your
   display name stops rendering in Poppins and renders in MandaloreTitle at 0.14em — *everywhere your
   name appears to anyone in the guild*. In an app whose type rule is "Mandalore = the guild speaks,
   Poppins = a person speaks," the guild has started speaking your name. **Your partner sees it
   before you do and asks what happened.** That is the best possible discovery: it is delivered by
   another human. One ternary in an `<ActorName>` wrapper, ~15 lines.
2. **The back of the Guild Card.** Long-press flips it. The reverse is the honest half, in 11px
   stencil on plain `#0B1120` with no ornament: `SENT BACK 2 · SLOWEST SEAL 9 DAYS · LONGEST SILENCE
   11 DAYS · OPEN SINCE 4 MAR: "Fix the shelf"`. The only surface in the app that tells you something
   unflattering, deliberately beautiful and quiet rather than scolding. People show each other the
   back, not the front — that is the tell that it worked.
3. **Your mark.** A 3-glyph personal sigil, deterministic from `stableHash(user.id)` (the function
   already exists at `accentVariants.ts:120-129`), drawn in CSS: 9 shard shapes × 3 rotations × 3
   rails = 243 distinct marks. Stamped at 18px into every contract you issue and every verdict you
   render. Never explained. One day the other person realises they have been recognising it instead
   of reading your name.
4. **WEAR.** After 25 sealed contracts the chassis bezel picks up faint scratches. At 50 and 100,
   more — always in the same places for a given user, seeded from your callsign hash. Nobody is ever
   told this will happen. The device ages with you. ~1 kb of inline SVG, no runtime cost, nothing to
   disable.
5. **CALLSIGN.** `HN-4417 "DUSTFALL"` — deterministic from the same hash, indexed into two word lists
   of 32. It appears in the rail at 9px from first boot; you simply notice you have a designation.
   Then it does real work: the invite reads *"HN-4417 has vouched for you"* instead of a lucide
   checkmark. Two strangers' phones agree on who you are without a single row of storage.
6. **Quiet Hours.** Between 22:00 and 07:00 local, every ceremony silently drops to its reduced-motion
   path and sound mutes — **haptics stay**, so everything still lands physically. Nothing is
   announced; there is a 10px `RELAY DIMMED` at 30% opacity in the rail if you look. The
   architectural prize is that it is one `useMemo` folded into a single `shouldAnimate()` gate, so
   every current *and future* ceremony inherits it by construction rather than by discipline.
7. **The Stamped Ledger.** Open an old contract — especially a messy one that got sent back twice —
   and it is covered in its own history: ACCEPTED at −8deg, IN TRANSIT in violet, two orange SENT
   BACK marks, PAID in green, overlapping at the corner like a real file that has been through an
   office. Derived entirely from `created_at` / `proof_url` / `approved_at` / `rejection_reason`,
   rotation from `stableHash(task.id + seal.kind) % 22 - 11` so it never re-shuffles. Capped at 3
   visible plus a `+N` counter, stack opacity clamped to 0.30, or it becomes a sticker album.
8. **First light.** Exactly one card in the Register carries a 1px `#C9A227` hairline and a 9px
   overline: `FIRST SEAL · 14 MAR 26`. Never appears anywhere else, never explained. `min(approved_at)`
   over a query you already run — ~8 lines. In a two-person household this is the app quietly keeping
   the first thing you ever did for each other.
9. **The creed follows your rank.** `src/i18n/locales/en/quotes.json` already contains seven in-world
   creed lines — *"No target too distant, no bounty too great." — The First Hunter* — imported by
   literally nothing, while `src/lib/quotes.ts` ships 113 English aphorisms including Steve Jobs. Bind
   the creed to standing bands. The line at the foot of the board becomes a thing that changes because
   *you* changed. Net −8 kb.
10. **THE WIRE.** Any contract crossing 60 minutes remaining: the rail hairline picks up a slow red
    breath (2.4s, opacity .55↔1) for as long as anything is inside the hour, and that card's stripe
    turns `#EF4444`. Most users will rarely see it — which is the point. `--warning-orange` has
    carried the comment `/* For urgent bounties */` at `index.css:209` since it was written and has
    never once been used on a deadline.

---

## 5. Screen by screen

**Dashboard → THE BOARD.** Delete `StatsRow` (`Dashboard.tsx:316-337`) — it restates the three
section-header counts 100px below itself, and its "Done" number is permanently 10 because
`completedMissions` is `.slice(0,10)`. Spend the reclaimed 112px on the Standing block. Cards render
tier. **ACCEPT CONTRACT ships.** The payout lands here. Stop nuking the board on every realtime event.
Give pull-to-refresh real content — it is currently the npm default (`↧ pull to refresh ↧` in Poppins,
three `#363636` dots on a `#090A0F` starfield: invisible). Empty sections stop rendering three
stacked "nothing here" states below your actual work. *Keep:* the three-section structure, the
deadline-first sort as the tiebreaker under tier, `empty-missions.webp`.

**Issued → THE MINTING ROOM.** The create form gains the Guild Rate anchor with a live tier readout.
Verdicts move onto the card face with a 96px evidence thumbnail and swipe-to-verdict. **Lift
`selectedMissionId` to the page** and render one `MissionModalShell` — today approve moves the row
between two separate `.map()` calls, so React unmounts the card and tears the open dossier out
mid-frame. Add the missing fourth section: `rejected` matches none of the three filters, so sending
work back makes it vanish from the issuer's own board. *Keep:* the mode-hero header, the
storage-before-row delete ordering, the ref guards.

**Rewards Store → THE VAULT.** Price denominated in work. Both numbers in the hero. Claim becomes a
two-tap requisition (`CONFIRM — 240`), the card seals and collapses, the coin flies, the balance
counts. **Fix the invisible-balance bug:** `.animate-shimmer-credit` sets `color: transparent` with
`background-clip:text`, and neither the `prefers-reduced-motion` nor the `prefers-contrast: high`
override restores a colour — so the app's single most important number renders as **blank space** for
two accessibility populations. *Keep:* the gold hairline + wash + inset-rim recipe (the best material
in the app — promote it to the token), the affordability system, the four generated loot fallbacks.

**Friends → THE ROSTER.** Each card carries their sigil, rank word, and `SEALED 41 · VOUCHED FOR YOU
12` — the most socially interesting figure the app can compute, and it closes the standing loop
visibly: their approvals are literally what your rank is made of. The join moment becomes **the
oath**: two 72px avatar discs converge, a hairline draws between them, both marks press in
simultaneously, `OATH SEALED — {inviter} has vouched for you`. Today that is a lucide CheckCircle and
a `setTimeout`, in a file that imports `feedback` zero times. Also: swap the guards — removing a real
member is one unconfirmed tap while cancelling a pending request opens a red-triangle modal. And
replace the global `ilike` user directory (`Friends.tsx:178`) with exact-email lookup: an unscoped
search across every profile row is a public-social-network pattern inside an app explicitly built for
small trusted groups.

**Archive → THE REGISTER.** 101 lines with four no-op props becomes the trophy room: two tabs,
LEDGER and CASE. Sort by `approved_at`, not `created_at` — the page calls itself a ledger and orders
by the date contracts were *issued*. Query `.or(assigned_to.eq.me, created_by.eq.me)` so the ~50% of
shared history you *issued* stops being unreachable through the UI forever. Kill the live motion on
dead records — the coin currently spins forever inside a settled contract and a red "Overdue" alarm
still fires on filed rows. *Keep:* `empty-archive.webp` — a spotlit ornate plinth with nothing on it
is the single best piece of product thinking on this surface; this direction finally builds the case
it was promising.

**Onboarding.** Step 1 is not a choice — `PUBLIC_THEME_IDS = ['guild']` means it renders exactly one
pre-ticked option wearing an App Store "Popular" pill, which on a one-option screen is not off-brand,
it is factually meaningless. Retitle to TAKE THE GUILD OATH and give it `hero-guild.webp` at real
size — the hooded hunter at a torchlit board of glowing contracts is literally the product thesis and
currently appears once, cropped to 112px, on this dead step. Step 2 becomes THE REGISTER OPENS: your
sigil at 96px in UNSWORN state, the bar at zero, and one line — *"Standing is granted by other
people. Nobody can give it to themselves."* The user now understands the entire meta-game before
their first contract. Fix the progress numerals: `text-white` on `#20F9D2` is ≈1.25:1, failing AA by
3×, when `.btn-cta` solved this exact pairing with `#06231d` (12.4:1) three hundred lines away.
Invite-born users skip the "Invite Someone" step — asking a person who was just invited to invite
somebody is the current flow.

**Login + Invite.** These are the only two routes outside Layout and therefore the only two that show
the starfield today. Make `hero-guild.webp` a fixed dimmed backdrop (`opacity:.22;
filter:saturate(0.7) blur(2px)`, radial mask) — 71 kb already in the bundle, on the two screens where
a stranger decides whether this is worth signing up for. Restyle the Google button from a full-width
pure-`#ffffff` slab — currently the single brightest object in the entire product, louder than the
wordmark — to the dark-surface treatment with the official four-colour mark at 20px, which is what
Google's guidelines actually require. Then `.btn-cta` becomes the brightest thing on screen, which is
correct. Arriving on an invite link changes the heading to YOU HAVE BEEN SUMMONED.

**Modals.** One modal material: promote the dossier's navy to `.modal-surface` and delete
`.glass-card` from every dialog — because `ModalShell` uses a *card* token as its surface, every
dialog in the app **brightens on hover**. A dialog is not a card. Give `MissionModalShell` the
`role="dialog"`, `aria-modal`, `aria-labelledby`, focus move and focus trap that the plain
`ModalShell` it replaces already has. Initialise `isMobile` from `matchMedia` synchronously — every
mission modal on every iPhone currently paints one full desktop frame before the effect swaps it to a
bottom sheet and restarts the animation. Make `useEscapeToClose` a LIFO stack so one Escape stops
closing two dialogs. Give `ConfirmModal` `modal-enter` so the highest-stakes dialog in the app stops
materialising like a rendering glitch.

---

## 6. Design system deltas

**Type — the rule that resolves everything: MandaloreTitle is the guild's voice. Poppins is a
person's voice.** Today the display face is spent on furniture (`MY MISSIONS` at 48px, bare integers
in a stats row) while the dossier — where the fiction should be strongest — is 100% Poppins. Invert
it. Mandalore renders only system-authored uppercase strings ≤24 characters: rank words, state chips,
section headings, seal labels, tier names, `EVIDENCE`, `HUNTER'S REPORT`. Poppins renders everything
a human typed. This is also why THE NAMED lands.

New workhorse: `.text-stencil { font-family:'MandaloreTitle'; text-transform:uppercase;
letter-spacing:.18em; font-size:11px }` at 9/10/11/14px.

Three type bugs die first: (1) delete `letter-spacing` from `.text-display` and let `.app-title` own
it at `0.22em` desktop / `0.12em` ≤768px — 0.3em at 48px is 14px of air per gap and breaks
"Completed Contracts" onto two lines on a 390px iPhone; (2) drop `font-bold` from the display
classes, and if it reads light use `-webkit-text-stroke: 0.4px currentColor`; (3) move the
`.spacing-*` / `.text-*` block into `@layer components` — it currently sits *after*
`@tailwind utilities`, unlayered, and silently beats every padding utility in the app, which is why
`TaskCard`'s `sm:p-5` has literally no effect.

Page titles become `#F2F5F8`, not the inherited `--text-primary: #c0c5ce` metallic grey. The mission
board's title should be the brightest type on the page, not the dullest.

**Colour — four families, each with exactly one job.**

- *Currency gold*, identical in all three modes because a coin is gold in every fiction:
  `--credit-gold-light #FCF6BA` · `--credit-gold-core #F5D76E` · `--credit-gold-deep #BF953F`. This
  replaces five unrelated golds currently coexisting in one viewport. `getTypeAccentVariant(themeId,
  'credit')` already declares this exact law at `accentVariants.ts:173-180` and is never called on
  the credits surface.
- *Standing metals*, and the only place they appear: iron `#B9C2CF/#7E8899/#6B7484` · brass
  `#F0DFA0/#C9A227/#8C6F1A` · then the mode accent at the top band. Blackmark wax `#A8241B → #5A0F0A`.
- *Mode accent* — guild `#20F9D2`, family `#F5D76E`, couple `#FF6FAE`. **Two one-line changes make
  mode real:** set `--accent-blue: var(--mode-accent)` and `--accent-blue-rgb:
  var(--mode-accent-rgb)` at `index.css:203-204`, taking theme coverage from ~15% of pixels to ~95%
  with zero component changes. And add `--mode-accent-ink` per mode (guild `#06231d`, family
  `#2A1D02`, couple `#33061A`) to replace the hardcoded `#06231d` that currently paints dark
  teal-green as the foreground of gold and pink CTAs in every mode.
- *State* — `stateConfig` in `modalTheme.ts:102-138` is the best-designed of the three competing
  systems and becomes the only one: pending `#f59e0b` · review `#8b5cf6` · **rejected `#f97316`**
  (new) · completed `#22c55e` · overdue `#ef4444` · archived `#64748b`. Export it and drive the card
  chips, section pills, stats icons and modal from it, so one contract stops being orange in the
  stats row, yellow on the card and violet in the modal.

**Motion — the law: nothing moves unless a person or the relay made it move.** Today four animations
loop forever (coin 4s, pill sheen 3s, credit shimmer, cursor trail) and all five loop moments resolve
to a toast. Invert the budget exactly. Idle motion after this work: **one** element — the countdown
digit under an hour, which ticks because time is genuinely passing.

Curves: `--ease-enter` and `--ease-exit` stay (but `--ease-exit` must become *reachable* — `TaskCard`
currently deletes modals synchronously on four of six dismissal paths, so the crafted exit only plays
when nothing happened). Add `--ease-press: cubic-bezier(0.2,0,0,1)` (the stamp) and
`--ease-metal: cubic-bezier(0.16,1,0.3,1)` (weight arriving — reserved so that when a user sees this
curve, it means standing changed).

Duration ladder, six values and no others: **90** press-in · **180** stamp / state cross-fade ·
**260** chips and colour · **420** ring, rail draw · **620** coin flight · **1600** rank-up.

**Press feedback floor:** ≥3px of travel *or* ≥8% luminance change on every interactive surface,
always. And under reduced motion, transform feedback is **replaced** by `active:brightness-125`, not
removed — today `motion-safe:` means reduced-motion users get *zero* press confirmation, which
contradicts this repo's own written principle at `index.css:1035-1037`.

**The single test for every animation: if I delete the motion, is the information still on screen?**
If no, it is not an animation — it is the UI, and it must be redrawn as static.

**Sound — six events, not 21 keys pointing at 12 files.** Today `acceptContract`, `success`,
`approveProof` and `saveProfile` are four names for `success.mp3`, so the biggest moment in the
product is acoustically identical to saving your display name. The History nav tab requests
`click1e`, a key registered nowhere with no file on disk — one of five tabs is silently mute.

Palette: `tick` (any press/nav, 0.28) · `seal` (**one new asset**, a struck metal note, ~120ms attack,
mono, <8 kb) · `payout` (coin, preceded by seal at −140ms) · `denied` · `arrival` · `rankUp` (the only
three-note event). Navigation goes quiet — all five tabs collapse to `tick`. Four distinct 83 kb click
samples for switching tabs while accepting a contract is silent is the reward hierarchy exactly
inverted.

Type the keys — `export type SoundKey = keyof typeof soundFiles` — so `npm run build` fails on the
next `click1e` instead of shipping four months of silence.

**Split haptics from sound, and flip the default.** `feedback.impact()` and `feedback.notify()` both
early-return on `!soundManager.isEnabled()` (`feedback.ts:28, :36`), so muting the app in a quiet
evening room — the normal state for a family app — silently removes every vibration too, on the one
platform where haptics are the *only* remaining silent channel. Add an independent `bh:haptics` pref,
default fresh installs to **sound OFF, haptics ON**. All five directions independently called this
the single highest-leverage feel change available. It is about four lines.

---

## 7. Tech stack decision

**Adopt (all 0 kb of new dependency):**

- **Delete 5 dead deps + 1 deprecated stub** — `animejs`, `@types/animejs` (pinned ^3.1.13 against
  animejs ^4, so it would emit wrong types the moment anyone imported it), `react-confetti`,
  `react-currency-input-field`, `react-hook-form`, `@types/react-dropzone`. ~3.4 MB off node_modules
  and the end of a false stack narrative. **Keep `react-swipeable`** — it is the tool the swipe-verdict
  queue needs, and it is already paid for.
- **Kill `backdrop-filter` on the card system** (`index.css:297`). This is the largest single GPU win
  available and no design reviewer caught it: `BaseCard` defaults to `variant='glass'`, so every
  TaskCard, RewardCard, FriendCard and EmptyState carries its own backdrop blur. A Dashboard with 12
  contracts is 12 compositing layers each re-running a blur over its own backdrop region every scroll
  frame. Blur belongs to the ~4 full-bleed surfaces that earn it. At `rgba(0,212,255,0.07)` over a
  near-black starfield the visual diff is near-imperceptible. **One word, worth more than every
  animation library on the list.**
- **Web Animations API** for every ceremony — native, 0 kb. Two gotchas: WAAPI does *not* respect
  `prefers-reduced-motion` for you (guard explicitly), and animations on elements that unmount
  mid-flight need the seal layer.
- **Web Audio buffer pool** behind the identical `soundManager` public API, plus re-encoding.
  **844 kb of 320 kbps stereo MP3 is fetched during first paint** — the constructor runs at module
  scope with `preload='auto'`, and every UI "click" is a 2.09-second sample. Re-encode to 96 kbps
  mono, trim transients: → ~130 kb. Beats howler.js because howler's value is HTML5 fallback and
  autoplay unlocking, none of which a WKWebView-only app needs.
- **Route-level `React.lazy`** — `App.tsx` statically imports all eight pages, so a user on `/login`
  downloads the entire authenticated app. Realistically 55–75 kb gz off the initial download.
- **Self-hosted woff2 + preload, delete the Google Fonts link.** `index.html:13-15` pulls Poppins
  from a CDN — in a Capacitor WKWebView launched offline it never arrives, so body text degrades to
  system sans while the local Mandalore faces render correctly, which is a worse mismatch than either
  font alone. 148.8 kb of TTF → ~55–60 kb of woff2, minus `mandalorerough.ttf` (50.8 kb, declared in
  CSS and referenced by nothing).
- **`@formkit/auto-animate`** (~2.3 kb gz) — one `useAutoAnimate()` per list container gives every
  add/remove/reorder in the app a correct FLIP for ~1% of current payload.
- **`@layer components` discipline** — five lines that fix the padding-override bug class.
- **CSS-only starfield** on one fixed layer, ~0.4 kb — three radial-gradient tiles of 1px/1.5px dots
  at 0.55/0.35/0.2 alpha, two drifting over 120s/200s. Must ship *with* the `bg-indigo-950` removal or
  it stays invisible.
- **Align the build floor.** `Podfile` says `platform :ios, '14.0'` while Vite 6.4 defaults to
  `baseline-widely-available` = Safari 16. An iOS 14 device can install this app and white-screen on
  modern syntax. Pick one floor (recommend Safari 16.4 / iOS 16.4), record it in
  `memory/DECISIONS.md`, and then `@property`, `color-mix()` and OKLCH become available to collapse
  the accent token system.

**Trial:** View Transitions API (Safari 18.2+, silently no-ops elsewhere) for the card→dossier morph
before reaching for a motion library. Supabase Realtime Presence (0 kb, already shipped inside
`@supabase/realtime-js`, zero uses in `src/`) for the crew beacon. Container queries for the card
system. `vite-plugin-pwa` for the web build only.

**Reject, with reasons:** three.js / R3F (~180 kb gz — an 83% increase on the entire JS payload to
render a background the brief describes as a two-stop gradient with stars). ogl (defensible at ~12 kb
and still wrong — a shader only pays for itself if the starfield does something a gradient cannot,
and the tempting one is gyro, which is a trap). GSAP (nothing here needs a timeline engine; every
sequence is 2–4 steps). react-spring (strictly dominated by Motion at the same cost). vaul (~30 kb gz
with its Radix peer, to buy a sheet `MissionModalShell` already implements correctly).
`@use-gesture/react` (11 kb for a second gesture library while a working one sits unimported).
Rive (~100 kb gz of WASM cold-start on the tightest-budget platform, plus an art pipeline only one
person can operate). Lottie. Houdini paint worklets (never shipped in WebKit, not on the roadmap).
Scroll-driven CSS animations (Safari 26 — and there is no scroll narrative here; the app's lists are
lists, not stories). react-window (a virtualization library to fight a CSS grid, a PullToRefresh
wrapper and 20 rows). Tailwind v4 *as the fix for the CSS override bugs* — it would fix them, but a
high-risk full migration to solve what a five-line `@layer` wrap solves today is the wrong order of
operations.

**Motion (framer-motion) only via `LazyMotion` + `domAnimation` (~18 kb gz), and only if View
Transitions proves unworkable on the target devices.** The real risk is not the kb — it is that once
`motion` is in the tree, every future component reaches for it and the CSS keyframe system, which is
genuinely well-built here, rots.

---

## 8. What we are deliberately NOT doing

The judge panel killed these by name, and the discipline of not building them is the mark of the
direction:

- **Device-tilt parallax and the hidden spirit level.** Gyroscope parallax is the most-demoed web
  effect of the last decade and would paste into any app unchanged. On iOS the permission is one-shot
  and a declined prompt cannot be re-requested without reinstalling — one mistimed ask permanently
  burns the feature on the owner's only phone.
- **Scroll parallax on every card.** It shipped with a runtime perf governor that disables the
  headline feature if the first 30 frames average <52fps. A design that needs a kill-switch for
  itself should ship in its disabled state. The static half — shadow, scale, saturation keyed to
  ownership and urgency — carries 100% of the information at 0% of the frame cost, and *is* adopted.
- **The 900ms boot sequence.** The proposal convicts itself: "boot sequences are delightful twice."
  On iOS, "once per session" means almost every launch. At four opens a day for two years that is
  ~45 minutes watching an app introduce itself to someone who lives in it. Keep only the genuinely
  valuable part: extract `AuthLoadingScreen` into `BootScreen.tsx` and use it in the three places
  that currently hand-roll `border-t-teal-500` rings as the app's cold-start first impression.
- **Presence room labels** (`SARA IS AT THE VERDICT DESK`). Broadcasting which screen your partner is
  on is ambient surveillance inside a house, and a `presence_enabled` column defaulting ON in a
  two-person install makes switching it off a visible social act rather than a preference. It also
  undercuts the fiction: a bounty board's power is that it is *asynchronous*. Keep LIT/EMBER/COLD,
  which the proposal itself concedes is 80% of the feeling.
- **THE COLD RELAY punishing absence.** An app that visibly deteriorates when a family goes on
  holiday is applying pressure it has not earned. Warmth may return; it may not decay into sulking.
- **The weekly recap card.** A dismissible interstitial 52 times a year, arriving unpredictably, in
  front of someone who opened the app to check one thing while holding a toddler. Its own mitigation
  — "a second dismissal within 4 seconds turns it off forever" — is an admission that its best
  outcome is being disabled. Ship the 6px week rail, which has the tightest information-per-pixel
  ratio in the whole corpus. Never build the card.
- **The Balance of Care bar.** Two people who share a home, handed a persistent always-visible
  scoreboard of who has done more, as default chrome. A number you went looking for is curiosity; a
  number pinned to the header is an accusation. The identical data survives as a long-press toy.
- **Press-and-hold for a "heavier" verdict.** Hold-latency ambiguity on the highest-stakes button in
  the product, undiscoverably, for a cosmetic payoff. A thumb that rests 200ms too long gets a
  different animation and cannot tell why.
- **A second pull-to-refresh detent.** Pull-to-refresh is performed reflexively, daily, while
  distracted. A hidden second threshold guarantees accidental triggers and teaches nothing. The
  lifetime stats belong on the Guild Card, which is a place you deliberately go.
- **Route slide transitions.** The most generic idea in the corpus; it says nothing about bounty
  hunting. The bottom thumb rail buried inside that proposal is extracted and shipped; the pan is not.
- **Nine rank bands.** Collapsed to five. Nine is the meta-game demanding its own explanation screen,
  which violates the direction's own best rule: *if any of these needs its own screen to be
  understood, it is wrong.*
- **Wholesale diegetic renaming of the plumbing.** Rename the verbs of the loop — accept, transmit,
  stamp, seal, pay — because those *are* the fiction. Leave invite, settings, sign out and remove
  alone. A person adding their partner at 11pm should not have to decode "SEND A WRIT." Costume on
  the ritual, plain language on the plumbing.
- **Three separate long-press-the-coin gimmicks.** At most one survives, and only the version whose
  reverse face carries information you cannot read anywhere else.

---

## 9. Sequencing

Each wave is independently shippable and leaves the app better if the next one never happens.

**Wave 0 — The floor (nothing else can land on today's stage).**
None of the wow survives shipping onto a tree that remounts itself on every realtime event. All five
directions independently identified this floor.

| Item | Effort |
|---|---|
| Remove `bg-indigo-950` from `Layout.tsx:171`; restore the CSS starfield | S |
| `--accent-blue: var(--mode-accent)` + the `--mode-accent-ink` token | S |
| The two typography one-liners (`.text-display` tracking, `font-bold`) + `@layer components` wrap | S |
| **Stale-while-revalidate across 6 hooks** — `hasLoaded` ref, gate `setLoading`, expose `isRefreshing`, change consumers to `if (loading && items.length === 0)`. **Law: nothing in this app may ever unmount a populated list to show a spinner.** | M |
| Lift `selectedMissionId` to the page in `IssuedPage` (one dossier, not two `.map()`s) | M |
| Kill the four perpetual loops; kill `backdrop-filter` on cards | S |
| Split haptics from sound; default sound OFF / haptics ON | S |
| Fix the invisible-balance a11y bug; fix onboarding contrast; fix `rejected → overdue` | S |
| Delete 5 dead deps; type `SoundKey`; register the missing `click1e` | S |

**Wave 1 — The verbs.** ACCEPT CONTRACT · the Seal component + seal layer · the Anti-ceremony ·
EvidencePanel (render `proof_description`, inline proof) · the in-world copy pass. *Effort: M–L.*
This is the wave where the app stops being a form.

**Wave 2 — Standing.** `total_earned` in the select · `standing.domain.ts` + tests · the sigil, rank
word and bar in the rail · rank-up ceremony · THE NAMED · the creed bound to bands. *Effort: M.*
Zero migration — degrades gracefully without one.

**Wave 3 — The economy.** Guild Rate + tiers · the create-form anchor · price denominated in work ·
THE DROP with correct addressing (`usePayoutWatcher` in the chassis) · swipe-to-verdict. *Effort: L.*

**Wave 4 — The chassis and the room.** The persistent casing with the **bottom thumb rail** (100% of
mobile navigation currently lives in the hardest-to-reach corner of a 6.7" phone; a parent cooking
one-handed cannot reach a top-right hamburger) · Archive → THE REGISTER with LEDGER/CASE · the Guild
Card · WEAR · CALLSIGN · Quiet Hours. *Effort: L–XL.*

**Wave 5 — Warmth.** Presence beacon (LIT/EMBER/COLD only) · THE HANDSHAKE · the oath ceremony on
invite accept. *Effort: M.*

**Needs a DB migration (exactly one, and everything degrades without it):** an
`INSERT INTO credit_transactions` inside `approve_task`, wrapped in `EXCEPTION WHEN OTHERS THEN NULL`
so the ledger may be lossy but a payout can never fail. That function is the most safety-critical in
the app and has already been revised three times; this goes through `db/proposals/` with a backup and
review per `CLAUDE.md`. Standing falls back to raw `total_earned` without it.

**Needs new art (exactly two things):** one `seal.mp3` — a struck metal note, ~120ms attack, mono,
<8 kb. And optionally a 24-frame coin turntable webp strip. Everything else reuses what is already in
`src/assets/generated/`, including `emblem-credit.webp` (a purpose-drawn gold coin-pouch medallion,
26 kb, imported by nothing).

---

## 10. Open questions for Michael

1. **Standing thresholds.** Five bands at 120 / 600 / 2,000 / 8,000 assumes a guild rate around 20.
   What do you actually pay for a typical contract? That number sets the whole ladder, and getting it
   wrong makes THE NAMED either unreachable or trivial.
2. **The one migration.** Do you want the `credit_transactions` insert in `approve_task` now, or
   should Wave 2 ship on raw `total_earned` and defer the ledger until there is a reason to read it?
3. **Family and couple modes.** `PUBLIC_THEME_IDS = ['guild']` gates them out of V1. Is that
   permanent? Several decisions here — the noun system, the diegetic verbs, the standing rank
   words — are cheaper to design once if guild is the only mode that ships.
4. **The iOS floor.** The Podfile says 14.0 and Vite compiles for Safari 16. That mismatch is a
   white-screen waiting to happen. Recommend raising to 16.4 — is any device in your household older?
5. **Sound.** One new asset (`seal.mp3`) is worth commissioning. Do you want to generate it, or should
   the seal ship silent-but-haptic until you have one? *(Related: the 844 kb audio re-encode should
   land in the same release either way — the app must not get louder and slower at once.)*
6. **The Mandalore glyph check.** The whole type thesis assumes the face has full uppercase Latin plus
   digits legible at 10–11px, and there is no specimen in the repo. Before Wave 1, render
   `0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ ÄÖÜß` at 10/11/22px and look at it. If the digits are weak,
   the coin stays Poppins tabular (which is the right answer at 10px anyway) and rank words fall back
   to Poppins 700 at 0.16em with a hairline stroke. Nothing else depends on it.

---

*Research artifacts: 7 recon inventories, 7 critiques, 5 full direction documents, 1 stack
assessment, 3 judgments — `wf_4294ddcc-7ce`. All code claims in this document were re-verified
against the working tree on 2026-07-24, including five that the source agents got wrong or
overstated.*
