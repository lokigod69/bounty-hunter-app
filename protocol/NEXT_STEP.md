# NEXT STEP — Bounty Hunter/main — updated 2026-07-29 (all three decisions shipped; mobile blocker closed; onboarding i18n'd; everything pushed)

## FOR YOU

1. **Two prod runs are waiting on you, and only on you.** I have no production DB access — the
   password isn't in this environment or the repo, and both routes to find it were blocked. Both are
   written as one-command runbooks with the gates already proven to block:
   - `docs/runbooks/PROD_RUNBOOK_WIPE_TEST_DATA.md` — **read the scope table first.** "Wipe
     everything" has two readings and only one is recoverable. Scope A (the default) clears every
     contract, reward, credit, friendship and invite but keeps accounts. Scope B also deletes
     profiles and auth users, which forces everyone to sign up again — and that depends on Supabase
     dashboard config that was wrong as recently as 2026-07-11. I defaulted to A. Say the word if
     you want B.
   - `docs/runbooks/PROD_RUNBOOK_013.md` — the SQL half of 013. Run the wipe first and 013's
     validation queries come back empty.
2. **Browser-test the mobile pass on a real phone, in landscape as well as portrait.** This is the
   one thing I could not verify. Specifically: the hamburger appears in landscape (it didn't
   before), a modal's submit button stays reachable with the keyboard up, focusing an input doesn't
   zoom the page, and the German Friends tab bar can reach its first tab.
3. **Try the onboarding flow in a non-English language** — restart it from Profile → Einführung neu
   starten. It was 100% hard-coded English until today; it is now translated in all twelve.
4. **Still outstanding from before:** browser-test one create + one edit mission (the last
   unverified piece of 012); paste the branded email templates; check the realtime publication.

## PASTE THIS

Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md, memory/INDEX.md, memory/STATE.md.
Verify state: main at `d5dedb8` or later, and this time everything IS pushed — `git log origin/main..HEAD` should be empty. Run `git diff --check`, `npx tsc -p tsconfig.app.json --noEmit`, `npm test`, `npm run lint`, `npm run build` (expect: 0 errors, 240 tests/20 files, 0 lint errors/3 known warnings, build pass and warning-free).
DONE 2026-07-29 (second session, 5 commits, all pushed): **Michael answered all three parked decisions at once and they are all shipped.** (a) **Rank ladder recalibrated 0/120/600/2000/8000 → 0/30/150/600/2000** — the old table assumed ~20 credits/contract in its own comment while the form offers 1/2/3/5/10, so band 4 needed ~2,667 contracts; THE_REGISTER's table and open question #1 both updated, and a test pins the top band as reachable. (b) **Proposal 013 APPROVED, client half shipped, SQL still gated.** Open point E answered from the code: no path in the current tree can create a self-assigned contract (dropdown is friends-only, both friendship writers refuse a self-pair, `create_task` doesn't default a null assignee to the caller, onboarding step 4 creates nothing) — the live row predates 012 making creation RPC-authoritative on 2026-07-28. New `TaskLifecycleRpcError` carries the RPC code so one rule can be localized without the domain layer importing i18next; `approveMission` returns `{credited, creditSkippedReason}`; **a pre-013 server omits `credited` and absence is read as PAID**, because the old server always paid and the opposite default would tell every user their credits vanished. (c) **German is informal now** — and it was 29 strings, not the ~410 I estimated; the file was already ~93% "du". Converted by exact-match replacement, never a regex over "Sie" (lowercase "sie" is she/they); the register guard was probed against 21 cases before being trusted. **Mobile BLOCKER + six MAJORs closed (eed7cc0):** `md:` is width-only and a landscape iPhone is 844×390, so it took the desktop header — new `nav` screen at `(min-width:768px) and (min-height:500px)`. The same width-only mistake was causing three more bugs; input sizing is now on `(pointer: coarse)`. Modal heights are `vh` → `dvh` → `min(dvh, --visual-vh*n)` because **dvh alone does not fix the iOS keyboard** — iOS leaves the layout viewport unchanged, so only `window.visualViewport` sees it. `.safe-top` was silently REPLACING `pt-16` (unlayered CSS beats `@layer utilities`); it's additive now. Doubled page gutters removed. TabBar's first tab was unreachable because `justify-center` on a scroll container pushes overflow past the start edge where `scrollLeft` can't go. 9 guards, each probed against the pre-fix shape. **Onboarding extracted + translated into all twelve locales (d5dedb8, 51 keys × 12)** — atomic because the parity gate rejects English-only keys; mode nouns are passed as interpolation values, not concatenated, which is what makes the translations grammatical. **Two prod runbooks written and gated but NOT RUN — no DB access from this agent.**
NEXT: Michael's two prod runs (wipe, then 013) and a real-device mobile check. Then finish the extraction — EmojiPicker, FriendCard, FriendSelector, the reward modals, Layout aria-labels, `themes.ts` mode label/description, and the RPC error table — followed by the 13 locale-unaware formatters and 5 concatenated pluralisations, which extraction alone does not fix. Then the three remaining mobile MAJORs (portrait header logo overlap, FriendCard action rows, German daily-task card titles). Mode 2 rules and the Status Block apply.
