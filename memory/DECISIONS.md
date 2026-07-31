# Decisions
Newest first. Never delete a decision — mark it `⚠️ superseded → [[#the newer one]]` instead.
Wrong turns are part of the memory.

Entries below dated before 2026-07-07 are ⚠️ reconstructed from git history, migrations, and docs — decision visible, rationale partly inferred.

## 2026-07-30 — A backup guard must be checked against the live database, not against itself
**Status:** active (bdabeee)
**Decision:** `backup_data.ps1` now takes live row counts *before* dumping and asserts, per table, that the dump contains exactly that many INSERT statements. It refuses to report success on any mismatch. The dump is two `pg_dump` runs (public schema, then `auth.users`) concatenated at the byte level.
**Why:** The old script passed `--schema=public --table=auth.users` to a single `pg_dump`. `--table` narrows the selection and `--schema` does not add the public tables back, so the dump contained `auth.users` and nothing else. The guard asked only for "at least one INSERT" — `auth.users` supplied three — so it printed success in green while holding none of the rows a wipe was about to destroy. A self-referential guard cannot catch a dump of the wrong scope; only the live database can.
**Consequence:** Any `data_backup_*.sql` from **before 2026-07-30 may contain `auth.users` only** — check before trusting one. Byte-level concatenation is deliberate: `Get-Content`/`Set-Content` would round-trip the dump through PowerShell 5.1's encoding layer, see [[bounty-hunter-powershell-utf8]]. Related: the 2026-07-28 finding that every prod script reported success unconditionally — same family, and the reason the exit-code checks alone were not enough.

## 2026-07-30 — Scope A plus one hand-deleted account, instead of scope B
**Status:** active
**Decision:** The production wipe ran as scope A (app data cleared, accounts kept). Michael deletes a single `auth.users` row in the dashboard when he wants to exercise signup.
**Why:** He asked for both a clean board and a look at the registration/onboarding flow, and named scope A and scope B in the same breath. Scope B delivers both but is one-way: a public-schema restore cannot bring auth accounts back, and re-registration depends on dashboard auth config that was wrong as recently as 2026-07-11. Deleting one account of three gets the same test while leaving two working ways back in.
**Consequence:** The signup re-test is now Michael-paced rather than forced. Data at risk was trivial anyway — 2 test contracts, 2 friendships, 1 invite, zero credits.

## 2026-07-30 — Formatting takes locale as an argument; it never reads the active language
**Status:** active (0826cfb)
**Decision:** `src/i18n/format.ts` exposes pure functions whose **first parameter is the locale**. `useFormatters()` is a thin hook that binds them to `i18n.language` for components. Plain modules are *given* a locale by their caller and never import the i18next singleton.
**Why:** The same rule `src/domain/missions.ts` set when it refused to import i18next and carried a `.code` instead. Importing the singleton into `utils/` would make pure helpers stateful, untestable without booting i18next, and would invert the dependency direction. The hook depends on `useTranslation()` specifically because that subscription is what re-renders on `languageChanged` — reading `i18n.language` directly formats correctly on first paint and then goes stale, which is the subtler version of the bug being fixed.
**Consequence:** Twelve-locale tests need no i18next boot. Intl instances are memoized by locale+options because countdown timers re-render every card every 60s.

## 2026-07-30 — Dead code with a locale bug gets deleted, not fixed
**Status:** active (0826cfb)
**Decision:** `src/utils/dateUtils.ts` was deleted rather than made locale-aware.
**Why:** Its `getStartOfWeek` hard-coded Sunday-first, citing "typical US calendar", while eleven of the twelve locales are ISO Monday-first. The correct fix needs `Intl.Locale.getWeekInfo()`, which WebKit does not have — and this app ships to iOS through Capacitor, so it would have needed a hand-maintained fallback table. A grep showed **zero importers** anywhere in `src`. Building a WebKit fallback for code nobody calls is cost with no benefit, and leaving it invites someone to use a US-centric week helper by accident.
**Consequence:** Two of the thirteen catalogued formatter defects closed by deletion. If weekly aggregates are ever needed, add them to `format.ts` with locale as the first argument.

## 2026-07-29 (later) — German switches to informal "du"
**Status:** active (d1d243b) — ⚠️ supersedes the last clause of [[#2026-07-29 — Twelve languages, endonym picker, informal register for the new ten]]
**Decision:** German now addresses the user informally, matching the other eleven locales. Pinned by a register guard in `languages.test.ts`.
**Why:** Michael's call. Mixed register inside one language is worse than either choice applied consistently, and the mixture is exactly what nobody notices in review.
**Consequence:** The estimate of "~410 strings" was wrong — the file was already ~93% informal and only **29** strings were formal. Converted by exact-match replacement, never a regex over "Sie": lowercase "sie" is she/they and a sweep would have produced nonsense ("Erledige eine Aufgabe und sie wird hier gespeichert"). The guard's detector was probed against 21 cases before being trusted.

## 2026-07-29 (later) — The rank ladder is calibrated to the rate the app actually offers
**Status:** active (d223535)
**Decision:** `STANDING_THRESHOLDS` 0/120/600/2000/8000 → **0/30/150/600/2000**. Closes THE REGISTER's open question #1.
**Why:** The old table said in its own comment that it assumed ~20 credits per contract, but `TaskForm` offers 1/2/3/5/10 and calls 2 a "small chore". At a realistic ~3 credits the old band 3 needed ~667 contracts and band 4 ~2,667 — exactly the "THE NAMED is unreachable" failure the question warned about. New bands land near 10/50/200/667.
**Consequence:** Standing is monotonic, so this **promotes** existing ranks and demotes nobody — which is why it was Michael's call rather than a silent fix. A test asserts the top band stays reachable (≤700 contracts at ~3 credits) so the table cannot drift back.

## 2026-07-29 (later) — Breakpoints that decide "phone or desktop" must ask about height too
**Status:** active (eed7cc0)
**Decision:** A custom `nav` screen — `(min-width: 768px) and (min-height: 500px)` — decides desktop header vs hamburger. Touch-target and font-size floors are guarded on `(pointer: coarse)`, not on a width breakpoint. A new `xs: 420px` screen exists for the small-phone/large-phone split that `sm: 640px` cannot express.
**Why:** Tailwind's breakpoints are width-only, and a landscape phone is wide — 844×390, 932×430. Every width-only "this is a desktop" test was therefore wrong on landscape phones, and it was making four separate bugs at once (desktop header with no hamburger, 14px inputs causing iOS focus zoom, sub-44px targets, and a reward grid that clipped its actions). `body{overflow-x:hidden}` hid the evidence.
**Consequence:** Width alone never again decides desktop-vs-mobile in this codebase. `mobileLayout.test.ts` enforces it, including that the height threshold stays above every phone-landscape height (~430px) and below iPad landscape (768px).

## 2026-07-29 (later) — Viewport height is three declarations, not one
**Status:** active (eed7cc0)
**Decision:** Every modal/app height is `vh` → `dvh` → `min(dvh, calc(var(--visual-vh) * n))`, in that order, as named classes in `index.css` rather than Tailwind arbitrary values. `useVisualViewport()` publishes `--visual-vh`.
**Why:** Each line fixes a different thing and none is redundant. Plain `vh` is the floor because the build targets iOS 15.0 and `dvh` only landed in Safari 15.4. `dvh` handles the collapsing URL bar. **Neither handles the software keyboard** — iOS leaves the layout viewport unchanged when it opens, so a `90dvh` modal keeps full height and the keys cover the submit button, which was the actual reported bug. Only `window.visualViewport.height` reflects it.
**Consequence:** Do not "simplify" these to a single `dvh` value. `mobileLayout.test.ts` asserts the first declaration in each rule is plain `vh`.

## 2026-07-29 (later) — RPC errors carry a code; the UI localizes, the domain layer does not
**Status:** active (d223535)
**Decision:** `TaskLifecycleRpcError` extends `Error` with `.code` and `.operation`. The English message stays as the fallback, so anything reading only `.message` is unchanged. Callers that have a translator localize from `.code`.
**Why:** Proposal 013's refusal needed to be a real sentence in twelve languages, but `src/domain/missions.ts` is pure and should not import i18next. Passing the code up lets the UI decide. `IssuedPage` had to stop rebuilding the error into a new `Error`, which discarded the code before `TaskForm` could see it.
**Consequence:** The rest of `getTaskLifecycleRpcErrorMessage` is still English-only — this is the mechanism for moving it, not the move itself.

## 2026-07-29 (later) — A missing `credited` key means PAID, not skipped
**Status:** active (d223535)
**Decision:** `approveMission` treats `credited === undefined` as a successful payout.
**Why:** 013's `approve_task` V4 adds `credited`, but the client ships before the SQL does. A pre-013 server always paid, so defaulting absence to "skipped" would tell every user their credits had vanished for the entire window between deploy and apply. The safe default is the one that matches the old server's actual behaviour, not the one that looks more cautious.
**Consequence:** Pinned by a test named for the pre-013 case. It also means the client is correct whether or not the SQL is ever applied.

## 2026-07-29 (later) — "Wipe everything" ships as two scopes, defaulting to the recoverable one
**Status:** active (2412cb0) — written, NOT run
**Decision:** Scope A (default) clears app data and keeps accounts and profiles. Scope B additionally deletes profiles and `auth.users`. Three gates: `PROD_CONFIRM`, `WIPE_CONFIRM` set to the project ref, and a data backup from today over 1 KB.
**Why:** The instruction had two readings and only one is recoverable. Scope B forces everyone to re-register, and re-registration depends on Supabase dashboard auth config that is not in this repo and was wrong on this project as recently as 2026-07-11 (Site URL still `localhost:3000`). A public-schema data restore does not bring auth accounts back. Scope A produces the same clean board with none of that exposure, so it is the default and B is opt-in.
**Consequence:** A `backup_data.ps1` had to be written: `backup_schema.ps1` is `--schema-only`, and before a data wipe that is worse than no backup because it succeeds, looks like a backup, and authorises the run while containing none of the rows at risk.

## 2026-07-29 — Twelve languages, endonym picker, informal register for the new ten
**Status:** active (9620413)
**Decision:** Ship en + de plus ten more: the full Romance core (es, pt, it, fr, ro) — Michael's stated priority — then the next-largest European app markets (nl, pl, sv, da, cs). The picker names each language by its **endonym** (Deutsch, Polski, Español), never translated. The ten new locales use the **informal** second person; the existing German keeps formal "Sie" for now.
**Why:** Michael asked for "at least 10", Romance first, and delegated the rest of the choice. Endonyms because you scan a language picker for the word you recognise, and that word must not change depending on which language the app currently displays — it also means adding a locale needs no new translation keys. Informal address because the product is used between partners and family members; German's "Sie" is a shipped inconsistency, flagged for Michael rather than silently changed (changing it touches ~410 existing strings).
**Consequence:** `src/i18n/languages.ts` is the single registry. `SUPPORTED_LANGUAGES` is the *intent*; `AVAILABLE_LANGUAGE_CODES` is derived from the filesystem glob and is what the picker offers, so a declared-but-unwritten language can never appear and silently render English.

## 2026-07-29 — Locales are lazy chunks; we resolve the startup language ourselves
**Status:** active (9620413)
**Decision:** Only English is bundled eagerly. Every other locale is a lazy chunk via `import.meta.glob`. `i18next-browser-languagedetector` is **removed**; `src/i18n/index.ts` reads the same `i18nextLng` localStorage key the detector used, clamps it to a shipped locale, and awaits that chunk before `init`. `main.tsx` awaits `i18nReady` before mounting, and mounts anyway on failure.
**Why:** Twelve static locales would add ~300 kB of translations nobody reads to the main bundle (German alone moving out dropped it 407.8 → 390.5 kB). The detector had to go because it hands i18next a language whose chunk has not been fetched, which produces a visible English-then-swap first paint. A locale chunk that 404s (the stale-Vercel-deploy case) must leave the user in English, never on a blank page or raw key paths — hence the swallowed error and the `catch(mount)`.
**Relation:** This is the narrow exception to [[#2026-07-14 — Route-level lazy loading rejected]]-style caution about stale chunks on Vercel: the payoff is ~300 kB rather than ~40 kB, and the failure mode degrades to English instead of a 404 white screen.

## 2026-07-29 — One scrim token for every modal backdrop, at 0.82
**Status:** active (7831ff9)
**Decision:** `--modal-scrim` (0.82 black) and `--modal-scrim-heavy` (0.94, lightbox only) replace five independently hard-coded backdrop values (`black/70` ×3, `/90`, `/60`). Fully opaque under `prefers-reduced-transparency`.
**Why:** Michael reported he could still see the board through modal backdrops. He was right twice over: 0.70 left the starfield competing with the modal for attention, and the same gesture dimmed the page by a different amount depending on which modal opened. Under reduced transparency the blur is gone, so the scrim is the only separation and has to carry the job alone.

## 2026-07-29 — Standing self-assign hole: close it in approve_task, not only at creation
**Status:** proposed (24a7613, DRAFT — unapplied, Michael-gated)
**Decision:** Proposal 013 closes the hole in **three** places but treats only one as the guarantee: `create_task`/`update_task` refuse a credit reward on a self-assigned contract (product layer, so the app never makes a promise it will not keep), while `approve_task` V4 refuses to *credit* when `assigned_to = created_by` (security layer). Self-assigned contracts still **complete**; they just pay nothing. Non-credit self-assigned contracts are untouched.
**Why:** `approve_task` is the only function that can reach `increment_user_credits`, so it is the only place a rule cannot be walked around — including by rows that already exist and by future code paths nobody remembered to guard. Completing rather than refusing because stranding a contract in `review` with no way to clear it is worse than a silent non-payment. `update_task` checks the *effective post-patch* values, otherwise "create for a friend, then re-point the assignee to self" walks straight through.
**Explicitly NOT fixed:** two accounts controlled by one person can still issue each other contracts and inflate both standings; no server-side rule distinguishes that from a real household. Named in the proposal as open point D so it is not mistaken for closed.

## 2026-07-24 (later) — Sound and haptics are independent channels; fresh installs are silent-but-haptic
**Status:** active (46454d3) — supersedes the haptics-behind-sound-toggle clause of [[#2026-07-08 — Feedback layer: one semantic API, haptics behind the sound toggle, Capacitor plugins lazy-imported]] (its other two clauses — one semantic API, lazy-imported Capacitor plugins — stay active)
**Decision:** `feedback` haptics gate on their own `hapticsEnabled` pref (default ON, own profile toggle); sound keeps `soundEnabled` (default now OFF for fresh installs; existing devices keep their stored value). The sound registry is typed (`SoundKey`) so unregistered keys are compile errors, and audio elements are created lazily on the first user gesture with a muted in-gesture play to satisfy Safari's unlock policy.
**Why:** Muting a family app in a quiet room previously removed every vibration — on the platform where haptics are the only silent channel (feedback.error() was haptic-ONLY, so muting silenced failures entirely). Both the design doc and the independent Codex review called the split the highest-leverage feel change; quiet-by-default is the right posture for living-room use, and one tap re-enables sound. The old "mute = no buzzing" rationale is preserved by giving haptics their own visible toggle instead of a hidden coupling.

## 2026-07-28 — Wave 2 standing ships client-derived on raw total_earned; prod may break between client merge and SQL apply
**Status:** active — partially supersedes [[#2026-07-24 (later) — Standing ships as raw lifetime-earned; rank bands and guild-rate tiers are DEFERRED, not designed around]] (its rank-band deferral clause; the guild-rate-tier deferral and self-assign-hole findings remain active)
**Decision:** (1) Rank bands ship NOW as pure client derivation over monotonic `total_earned` with THE REGISTER's default ladder (120/600/2000/8000) kept in one table (`standing.domain.ts`) pending Michael's guild-rate answer. (2) THE NAMED applies to the user's own name only until a migration exposes others' standing. (3) `phase-b-client-rpcs` merged to main BEFORE the 012 SQL applies — deployed create/edit knowingly breaks until Michael runs the rollout scripts. (4) Rank-up detection is device-local and baseline-first (localStorage per user), same never-replay discipline as the payout watcher.
**Why:** Michael's explicit instruction 2026-07-28: no users exist, push everything, breakage during development is acceptable, build the deferred items. The old deferral's "can demote" objection doesn't apply to raw `total_earned` (strictly monotonic → standing never drops); the calibration objection is real but there is exactly one household using it, and the thresholds are a one-table recalibration. The self-assign minting hole stays OPEN (012 keeps no-friendship-check parity by its own recorded recommendation) — a real cross-household ladder still needs that closed server-side first.

## 2026-07-24 (later) — Standing ships as raw lifetime-earned; rank bands and guild-rate tiers are DEFERRED, not designed around
**Status:** active
**Decision:** The UI shows `total_earned` as a quiet "Lifetime earned" line only. No rank bands, no rank-up ceremony, no sigil, no guild-rate contract tiers in this pass. If ranks come later they must be server-snapshotted monotonic points normalized at approval time (an owner-gated migration), not client-derived thresholds. Also recorded: iOS floor raised to 15.0 (Capacitor 8's podspec minimum — Podfile said 14.0, which fails at the pod layer; the doc's Safari-16/Vite claim was false, installed Vite targets Safari 14); the starfield is static by the pass's own motion law; react-router's 2 moderate advisories need a v7 major and are deferred.
**Why:** Credits are arbitrary per-household play-money (Michael: there is no "typical payment"), so THE_REGISTER's absolute 120/600/2000/8000 ladder is meaningless across households, and a rate-relative ladder can demote (violating "standing cannot be lost") without stored snapshots. Codex also proved the integrity premise overstated: task creation never checks the assignee relationship, so self-created self-assigned tasks can mint standing — a real ladder needs that closed server-side first. Shipping the honest number now costs nothing and loses nothing.

## 2026-07-24 — Commitment seals are local; payday belongs only to the hunter
**Status:** active (Design V2 Wave C implemented, uncommitted)
**Decision:** Accept, transmit, and approval use one anchored strike seal; sent-back uses the same instrument inverted as an orange lift with no shock or warning haptic. Seals are silent except for `feedback.press()` at a true landing. The payout sound/haptic and coin drop fire only from a persistent hunter-side watcher when a previously baselined credit task moves `review → completed`; issuer approval never calls payday. First fetch/login is baseline-only, hidden tabs do not emit, and credit readers revalidate through `bh:credits-changed`. All ceremony motion is transform/opacity-only with explicit reduced-motion paths; the requested rejection blur is approximated by a fading/scaling ghost ring rather than animating `filter`.
**Why:** A commitment should feel consistent without turning rejection into punishment, while reward feedback must reach the person who earned it. Baseline diffing prevents old completed work replaying at login. The ghost-ring substitution preserves the lift's visual softening without violating Wave C's hard motion-performance rule.

## 2026-07-24 — Returned work is "Sent back"; evidence and populated lists remain visible
**Status:** active (Design V2 Wave B implemented, uncommitted)
**Decision:** `rejected` is a distinct orange state (`#f97316`), never an overdue/red failure; issuers retain a dedicated sent-back section. Assignees must accept pending contracts before submitting proof. Evidence means either `proof_description` or `proof_url` and is visible to both parties through review/completed/rejected; private files are signed at render without changing persisted URLs. Populated contract/friend lists use stale-while-revalidate and must never unmount for a refresh spinner. Archive is shared history: rows created by or assigned to the user, ordered by approval.
**Why:** A returned contract is handed back for another pass, not missed or destroyed. The accept verb makes `in_progress` truthful. Text-only proof and issuer-authored history were previously unreachable, while realtime refetches tore open dossiers out of the DOM.

## 2026-07-15 — Proposal 012 design: jsonb-patch update_task with a column whitelist; all client write policies on tasks dropped; client refactor parked on a branch
**Status:** ✅ APPLIED 2026-07-28 (client merged 7b7414e; SQL applied + types regenerated e68d618; backup `supabase/schema_backup_20260728_232501.sql`). Open points A/B/C all shipped as recommended: edit-gating parity kept, DELETE policy dropped, no friendship check on `assigned_to`.
**Decision:** (1) `update_task(task_id, jsonb patch)` instead of a fixed-arg signature — both call sites keep their exact partial/full-form semantics, and the key whitelist (title/description/assigned_to/deadline/reward_type/reward_text/proof_required/is_daily) makes lifecycle columns unreachable by construction; unknown keys are a hard `invalid_field` error, empty patch is idempotent success. (2) `create_task` server-sets `created_by`/`status` — the client can no longer choose either. (3) The up.sql also drops `"Users can delete own tasks"` (DELETE policy) — dead weight since delete_task shipped in 011 but still usable by hand-crafted requests. (4) The Phase B client refactor lives on branch `phase-b-client-rpcs`, NOT unpushed-on-main like 011 did — main stays deployable while the SQL waits for Michael. Recommendations recorded in the proposal for his call: keep edit-gating parity, keep no-friendship-check parity.
**Why:** Fixed-arg update RPCs either force full-replace semantics (breaking useTasks' partial edits) or need presence-sentinels; jsonb presence checks are the native fit. The branch strategy fixes the 011 pain where an unpushed commit froze main. Whitelist-not-blacklist because the threat is column reach, not values — table CHECKs stay authoritative for values.

## 2026-07-15 — Capacitor plugin configs must be backed by installed packages
**Status:** active (fixed in 23ca5ec)
**Decision:** `capacitor.config.ts` had StatusBar/SplashScreen/Keyboard config blocks while none of the three packages were installed — Capacitor silently ignores config for absent plugins, so the intended native status-bar/splash/keyboard behavior never existed. Installed all three; rule going forward: any `plugins:` entry in capacitor.config.ts must correspond to a package in package.json (cap sync's plugin list is the check).
**Why:** Silent no-op config is a trap for device testing — the app would have shipped to TestFlight with a white status bar and default splash and the config would have looked correct in review.

## 2026-07-14 (later) — Private proofs are signed at render time; cleanup failures preserve task rows
**Status:** active (commit 4dc0ab7)
**Decision:** Stored proof_url values keep the public-URL shape for compatibility (cleanup code extracts the path by splitting on '/bounty-proofs/'; the RPC doesn't validate format), but rendering validates and exchanges the path for a one-hour `createSignedUrl` anchor (`ProofLink` in TaskCard). Storage-object lifecycle rules: delete cleanup stays BEFORE `delete_task` (RLS delete policy joins the tasks row) and now ABORTS the deletion when object removal fails; failed submit and successful reject clean their proof objects best-effort — a rejection must still stand when stale-proof cleanup fails.
**Why:** The bucket is private, so its public-style URL is never servable — signing at render is the only client-side fix that needs no data migration and no format change. Aborting delete on failed cleanup prevents permanently orphaned private objects (post-delete cleanup is impossible under the RLS join); best-effort ordering everywhere else keeps the user-visible lifecycle action authoritative over housekeeping.

## 2026-07-14 — Bundle strategy: vendor manualChunks yes, route-level lazy loading no
**Status:** active
**Decision:** vite `manualChunks` splits react-vendor/supabase/i18n into stable cacheable chunks (main chunk 722→388 kB, commit fa0d3bf). Route-level `React.lazy` code-splitting was assessed and deliberately rejected for now.
**Why:** The vendor split delivers the durable win (app-code redeploys no longer bust the whole JS cache). Route-chunking a frequently-redeployed Vercel SPA adds the "stale chunk 404 / Failed to fetch dynamically imported module" failure mode after every deploy, which needs reload-on-chunk-error plumbing to be safe — bad trade for ~40 kB gzip on first load. Revisit only if initial-load metrics become a real complaint (e.g. slow-network mobile).

## 2026-07-11 — Theme resolution: profile is authoritative, device storage is only a cache, public surfaces are guild-only
**Status:** active
**Decision:** `profiles.theme` is the authority for a logged-in user's theme; `localStorage.bounty_theme` is a cache. Logged-out pages and accounts with `theme=null` can only render `PUBLIC_THEME_IDS` (V1: guild — single source of truth in `src/theme/themes.ts`, consumed by onboarding, ProfileEditModal, and ThemeProvider; guarded by tests in themes.test.ts + launchQuickFixes.test.ts). Logout/account-switch clears the cache; a fresh account gets normalized to guild (cache + profile write); onboarding Next and Skip both persist explicitly. The per-device onboarding flag (`bounty_onboarding_completed`) stores the completing user's id, not `'true'`.
**Why:** Michael's live two-browser test surfaced the leak: stale `family` localStorage from an earlier session painted the login page yellow for an invite recipient and leaked family strings into a brand-new account (which also skipped onboarding via the stale flag). Internal family/couple testing stays possible via profile.theme on dev accounts.

## 2026-07-10 (later) — Password handling for prod-SQL runbooks when Michael pastes the credential in chat
**Status:** active
**Decision:** Michael pasted the live DB password directly into chat to authorize running the 011 runbook. Accepted as explicit go (Iron Rule satisfied: backup taken, review checkpoint enforced by the permission gate between backup and apply), but flagged clearly that the plaintext password now lives in the conversation transcript regardless of in-session handling, and recommended rotation afterward. In-session handling: set only via `$env:PGPASSWORD` for the duration of each script call, cleared immediately after, never echoed/written to a file/logged.
**Why:** The runbook scripts (`Read-Host -AsSecureString`) exist specifically to keep the password out of scrollback — pasting it in chat defeats that, so the safest recovery is transparency (tell Michael it's exposed) + minimal blast radius (narrow the env var's lifetime) rather than silently proceeding as if nothing happened. [[reference-prod-sql-process]]

## 2026-07-10 — Task lifecycle is RPC-authoritative; proposal-011 APPLIED live
**Status:** ✅ active — applied to production 2026-07-10 by Michael via the runbook scripts; client refactor pushed (610773a, 2f8436f); types regenerated, temporary overlay removed
**Decision:** The proposal-011 SQL is the contract for submit/reject/start-stop/archive/delete: JSON logical errors are mapped client-side, idempotent flags are success, rejection canonically lands in `rejected`, submit always lands in `review`, and Storage proof cleanup happens BEFORE `delete_task` (the bounty-proofs delete policy joins the tasks row — post-delete removal always fails RLS; caught in central review of the codex diff). The only remaining direct `tasks.update` calls are the two deliberate creator-edit paths reserved for Phase B. Deployment order is strict: backup + explicit go → apply/validate RPCs and policies → regenerate DB types/remove temporary overlay → runtime-test → deploy client.
**Why:** Moving lifecycle authorization/status preconditions into SECURITY DEFINER functions closes broad assignee-update authority without breaking creator editing. DB-first ordering prevents a deployed client from calling functions that do not exist yet.

## 2026-07-10 — Apple-design skill adopted as the motion/interaction reference; restraint clauses recorded
**Status:** active
**Decision:** The global `apple-design` skill is the house reference for motion, press response, and accessibility fallbacks. Applied 2026-07-10 (see `docs/premium-v1/APPLE_DESIGN_AUDIT.md`). Standing rules distilled from it: (1) press feedback must land within ~1 frame of pointer-down — `:active` transitions are 0.08s even where base transitions are 300ms; (2) every tappable surface gets `touch-action: manipulation` and a press state (`motion-safe:active:scale-*` for Tailwind components); (3) modal enter/exit use the shared `--ease-enter`/`--ease-exit` tokens (mirrored curves, same spatial path); (4) reduced motion = opacity cross-fades, never `animation:none`-freeze, and decorative loops (coin spins, scan-lines, trails) fully off; (5) glass surfaces must read material from the `--modal-*` tokens so `prefers-reduced-transparency` reaches them. **Deliberate non-adoptions:** haptics/sound stay on commit (click), not pointer-down; brand typography (Mandalore wide tracking, Poppins 500) overrides Apple type defaults; no spring library until something is actually gesture-driven (candidate: draggable mobile sheet — parked).
**Why:** The audit found all real gaps in one place — response latency and missing press states on the most-touched elements — and fixed them CSS-only, zero dependencies, zero risk to the tsc-clean baseline. The restraint clauses keep future passes from blanket-applying Apple defaults over the app's identity.

## 2026-07-08 — database.ts is regenerated + UTF-8; custom.ts overlays only for NOT-yet-migrated columns
**Status:** active — supersedes [[#2026-07-08 — DB type additions go through custom.ts overlay, not the UTF-16 database.ts]]
**Decision:** `src/types/database.ts` is now regenerated from the live project (`npx supabase gen types typescript --project-id mvbmpcmexkgfairnthux` — use `--project-id`, NOT `--linked` which demands a DB password) and stored as **UTF-8 no-BOM** (was UTF-16LE; git treated it as binary). After any applied migration, regen the file instead of extending `custom.ts`; overlays in custom.ts are only for columns that exist in code but not yet in the DB. The regen dropped the legacy marketplace_bounties/collected_bounties types — the schema and types now agree.
**Why:** The overlay rule existed to avoid hand-editing a UTF-16 file; with the file UTF-8 and the regen path proven, overlays would just drift. The regen also caught a real runtime bug (PDF/video proof validation) that the overlay approach had hidden — types that match the DB are a bug-finding tool.

## 2026-07-08 — Feedback layer: one semantic API, haptics behind the sound toggle, Capacitor plugins lazy-imported
**Status:** ⚠️ haptics-coupling clause superseded → [[#2026-07-24 (later) — Sound and haptics are independent channels; fresh installs are silent-but-haptic]]; one-API and lazy-import clauses still active
**Decision:** All user feedback goes through `src/utils/feedback.ts` (`tap`/`success`/`payday`/`warning`/`error`) — call sites state the event, the module owns the sound+haptic pairing. Haptics obey the existing single sound toggle (no separate haptics setting for V1). AppButton/Fab fire the tap impact centrally, so individual buttons never wire haptics. **Capacitor plugins must be dynamically `import()`ed from web code, never statically imported**: a static `import '@capacitor/haptics'` broke the vite DEV server (optimizer mixed chunk generations → two React copies → app-wide "Invalid hook call" white screen; production build unaffected; survived cache purges). New sounds: `payday` key for credit-award moments (aliases coin.mp3 until a distinct sound is auditioned); approve plays approveProof+payday instead of the old success×2+coin stack; per-sound volumes replace the Android blanket override.
**Why:** One API keeps sound/haptic pairings consistent and future settings (separate haptics toggle, intensity) one-file changes. Toggle unification matches user expectation ("mute the app" = no buzzing). The lazy-import rule is load-bearing: it is the difference between a working and a white-screened dev server, and it keeps @capacitor/* off the web critical path.
**Rejected:** Separate haptics toggle (settings sprawl for V1); haptic on every sound automatically (nav clicks with notification-style haptics feel wrong); pinning/deopting the vite optimizer instead of lazy import (fights the tool; lazy import is strictly better).

## 2026-07-08 — Phase-3 asset design system: gold-medallion emblems, per-mode materials, type-based accents
**Status:** active
**Decision:** The app's generated-art language is **sculpted gold game-medallion**: circular gold ring + four compass gems for emblems (gift emblems in mode materials — guild teal, family honey #F5D76E-ish, couple rose #FF6FAE-ish; coin/credits always gold), painterly dark key-art heroes with mode-accent rim light, thin gold-linework empty-states on #090A0F with radially faded edges, dark still-life reward placeholders. Mission-card accents are now **reward-TYPE-based** (`getTypeAccentVariant`: credit→gold to match the coin, gift→mode primary) instead of the random per-id hash; the hash variant stays on store RewardCards for shelf variety. Reward placeholders replace only the DEFAULT 🎁/broken images — a user-picked emoji always wins. The credit-pouch emblem was generated but deliberately NOT wired (coin already carries credit identity everywhere a value shows).
**Why:** Roadmap Phase 3 item 2 prescribed emblem + per-type accent; one material language keeps 16 disparate images reading as one product. Type-based accent turns card color into information (what kind of reward) instead of noise.

## 2026-07-08 — Codex image generation: verify every output, serialize regenerations
**Status:** active
**Decision:** Parallel `codex:codex-rescue` image tasks are allowed for FIRST-pass batches, but every returned image must be visually verified before use, and any regeneration runs ONE AT A TIME. Rose/pink art keys on GREEN #00FF00; everything else on #FF00FF magenta (defringe: clamp B≤G for magenta, G≤max(R,B) for green).
**Why:** 3 of 15 parallel runs copied another task's newest PNG from the shared Codex output pool (wrong image, right filename) — silent and only catchable by eyeballing. Serial regens can't race; green key needed because magenta collides with rose subjects.

## 2026-07-08 — 9-migration batch applied to the new test DB (Michael's explicit go)
**Status:** active
**Decision:** On "apply the migration and all else," applied the queued 6 hardening migrations PLUS 3 new Phase-2 migrations to `mvbmpcmexkgfairnthux` via the session pooler + psql (NOT `supabase db push` — the remote tracker held only `20231117000000`, so a push would have replayed every intermediate migration against the already-restored schema). Backups taken before each batch; all 9 recorded in `supabase_migrations.schema_migrations`. New schema: `profiles.theme`/`onboarding_completed`, `collected_rewards.redeemed_at` + `mark_reward_redeemed` RPC, `invites` table + `get_or_create_invite`/`redeem_invite` RPCs.
**Why:** Zero-data test DB + fresh backups made the risk nil; direct psql of the specific files kept the tracker honest where a push could not.

## 2026-07-08 — Invite links: reusable per-user token, redeem = accepted friendship
**Status:** active
**Decision:** Shareable friend invites use an `invites` table (owner-only RLS) with a reusable random token per user; the recipient opens `/invite/<token>` (a PUBLIC route), and `redeem_invite()` (SECURITY DEFINER) creates/promotes an **ACCEPTED** friendship between the token owner and the caller — no extra approval step. Logged-out recipients get the token stashed in `localStorage` and redeemed post-login by `useRedeemPendingInvite()` (mounted in the authenticated Layout). No edge-function/email path (relies on the existing magic-link login).
**Why:** A two-player app must recruit player 2 who has no account yet; the existing add-friend surfaces only found existing accounts. Auto-accept is correct because the inviter consented by sharing. Token table (vs. embedding a raw user id) keeps it revocable and non-enumerable. **Consequence:** a brand-new signup's redemption fires only after onboarding (Layout is behind FTXGate) — token persists until then; acceptable for V1.

## 2026-07-08 — DB type additions go through custom.ts overlay, not the UTF-16 database.ts
**Status:** ⚠️ superseded → [[#2026-07-08 — database.ts is regenerated + UTF-8; custom.ts overlays only for NOT-yet-migrated columns]]
**Decision:** New columns/tables (`theme`, `onboarding_completed`, `redeemed_at`, `invites`) were typed by extending `src/types/custom.ts`, leaving the auto-generated UTF-16 `src/types/database.ts` untouched; RPCs not in the generated types are called with the `('name' as never, args as never)` loose-cast already used in the codebase. Persistence writes are fire-and-forget with localStorage as the immediate source of truth.
**Why:** Hand-editing the UTF-16 file risks encoding corruption, and this is the codebase's established precedent (`partner_user_id`). NB: `npm run build` does NOT typecheck pages (root tsconfig `files: []`) — always run `tsc -p tsconfig.app.json --noEmit` to catch type regressions in pages/hooks (it surfaced 7 masked errors this session).

## 2026-07-08 — Fresh Supabase project restored from Jan-2026 backup; data wiped for testing
**Status:** active
**Decision:** Michael abandoned unpausing the old project (`bounty`, ref tsnjpylkgsovjujoczll, us-east-2) and created a new one (`bounty-hunter-app`, ref mvbmpcmexkgfairnthux, **ap-south-1 Mumbai**). The 28-01-2026 cluster backup was restored into it via psql, then ALL data rows were wiped on his explicit instruction (public tables truncated, 9 auth.users deleted, storage.objects empty; the 3 buckets kept) — the new project is a clean test environment. `.env.local` and `supabase link` now point at it.
**Why:** Faster path back to a working login than the paused-project restore flow; old data not needed for the current testing phase. **Consequences:** (1) the restored schema is the pre-April-2026 state — the credit-write lockdown (20260412*) and storage-policy codification (20260611*) are NOT in it and must be re-applied along with 20260707* (Michael's go still required); (2) real user data, if ever wanted, exists only in the old paused project; (3) direct DB host is IPv6-only — use the session pooler `aws-1-ap-south-1.pooler.supabase.com:5432`, user `postgres.mvbmpcmexkgfairnthux`; (4) Mumbai region means noticeable latency from Europe — acceptable for testing, revisit before real launch.

## 2026-07-07 — Canonical noun system: Mission / Chore / Request per mode
**Status:** active
**Decision:** Michael approved the recommended noun set. The task object is named by mode via the existing `theme.<mode>.*` i18n mechanism: **Mission** (guild), **Chore** (family), **Request** (couple). Store items are plain **Rewards** everywhere ("Bounty" no longer names store items, including guild's `rewardSingular`). **"Bounty" is reserved for the credit pot attached to a mission.** The hardcoded Contract/Mission/Task mixing in `contracts.*`, `taskForm.*`, `navigation.*` and component-level English (e.g. TaskCard status chips) gets purged and routed through theme strings.
**Why:** Five names for one entity ("Contract, Mission, Task, Chore, Bounty Contract") plus "bounty" double-booked (store item AND task type) made the app feel random — Phase 2.1 of docs/premium-v1/ROADMAP.md.

## 2026-07-07 — Proof types: PDF, text-only, and private proof are allowed
**Status:** active
**Decision:** Michael approved allowing PDF proofs, text-only proofs, and private proofs. Implementation reality (recon 2026-07-07): text-only already works end-to-end; PDF is allowed by the ProofModal dropzone but blocked by the storage bucket mime allowlist and by `uploadProof` in src/domain/missions.ts (which conversely allows video the dropzone doesn't offer); private proof has no schema/UI support yet. Alignment work: fix the domain validator, add PDF to the bucket allowlist via migration (applied when Supabase is restored — prod-SQL rule still applies), and schedule private-proof (visibility column + UI) as its own item.
**Why:** Pre-existing product decision parked since the codex pass (CODEX_NEXT_STEPS #3); private-group trust model makes permissive proof types low-risk.

## 2026-06 — Codex refactor pass docs are the current source of truth
**Status:** active
**Decision:** `docs/codex-refactor-pass/` (index at `00_REFACTOR_PASS_INDEX.md`) supersedes the older 2025-10 docs (`docs/overview.md`, `docs/open-questions.md`, etc.) as the authoritative project state; `CODEX_NEXT_STEPS.md` is the backlog, `SAYA_USAGE.md` the user guide.
**Why:** The October 2025 deep-dive went stale after the security proposals and 2026 work; the June 2026 pass re-audited everything and wrote a fresh handoff.

## 2026-06 — No production SQL without backup + Saya review
**Status:** active
**Decision:** All production database changes go through written proposals (`db/proposals/`) with up/down SQL and runbooks (`docs/runbooks/PROD_RUNBOOK_*.md`); nothing is applied to prod without a backup and explicit human (Saya) review.
**Why:** Real user data in prod; earlier schema drift incidents (migrations vs live schema) made unattended SQL too risky.

## 2026-04..06 — Lock down client credit writes; codify storage buckets in migrations
**Status:** active
**Decision:** Credits can no longer be initialized or written directly from the browser (`20260412100300_lock_down_credit_table_writes.sql` and related); storage buckets/policies were codified in `20260611120000_storage_buckets_and_policies.sql`.
**Why:** `increment_user_credits` being callable by any authenticated user let clients self-award credits — the top security risk in the 2025 audit.

## 2026-06 — Extract pure domain logic into src/core + src/domain with vitest tests
**Status:** active
**Decision:** Business rules (contracts, credits, proofs, rewards, streaks) live as pure modules under `src/core/` and `src/domain/`, covered by vitest; `src/security/` holds policy regression tests.
**Why:** Hooks mixed Supabase I/O with rules, making the credit/reward logic untestable; the refactor pass needed a safety net before touching lifecycle code.

## 2025-11..2026-01 — Keep rewards_store/collected_rewards; drop marketplace_bounties
**Status:** active
**Decision:** The app's reward system is `rewards_store` + `collected_rewards` (personal, assigned rewards). The duplicate `marketplace_bounties`/`collected_bounties` tables are legacy — proposal `db/proposals/001_drop_marketplace_bounties.md` removes them.
**Why:** App code only ever queried `rewards_store`/`collected_rewards`; the duplicate tables were dead weight from an abandoned public-marketplace idea.

## ~2025 — Magic link (email OTP) auth instead of Google OAuth
**Status:** active ⚠️ rationale unverified
**Decision:** Auth is Supabase magic-link/OTP only, despite original requirements mentioning Google OAuth. Later hardened via proposal 005 (auth OTP hardening).
**Why:** Not documented; presumably simpler setup for a private-group app. Revisit only if login friction becomes a complaint.

## ~2025 — Recurring tasks feature parked
**Status:** active ⚠️ unverified
**Decision:** Backend tables/RPCs for recurring task templates/instances exist but the frontend feature was never built; it is parked, not planned.
**Why:** Not documented — inferred from absence of UI and the 2025 audit flagging it as orphaned.
