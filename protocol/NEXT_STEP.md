# NEXT STEP — Bounty Hunter/main — updated 2026-08-03 (Phase A live; 015 corrected; applies blocked on the password)

## FOR YOU

1. **🔑 Paste the current Supabase DB password into the session** (dashboard → Project Settings →
   Database if you've lost it). That is the only thing blocking A1+A2 — your go is already recorded,
   the runbook is staged, and 015 was corrected first (it published `profiles`, which nothing
   subscribes to; the live partner-state listener watches `friendships` — verified in code). The
   session will then run: backup → validate → apply 014 → re-validate → apply 015 → re-validate,
   with run records into `docs/runbooks/PROD_RUNBOOK_014_015.md`.
2. **After both apply: rotate the DB password yourself (A3, ~2 min)** — dashboard → Project
   Settings → Database → Reset password. Never paste the new one anywhere. Rotating BEFORE the
   applies would strand them, so order matters.
3. **Then the two-browser realtime test** (first time it can ever have worked here): create a
   contract in A → appears in B without refresh; approve in A → B's balance moves; friend request
   in A → B's nav badge increments. Plus the 014 write test: change theme/language/name/avatar,
   set partner, onboard a fresh account.
4. **A4/A5 are the Mac leg** — `docs/runbooks/IOS_SHIP_RUNBOOK.md` (iOS floor line now correctly
   15.0). Fresh `npm run build` + `npx cap sync ios` on the Mac first (embedded payload is stale),
   DEVELOPMENT_TEAM/signing, device smoke, then TestFlight **internal only** (team members; external
   testers are gated by Phase B compliance).
5. **Still open from before:** real-device mobile check (ten fixes, none seen on a device), delete
   one auth user for the signup re-test, paste the branded email templates.

## PASTE THIS

Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md, memory/INDEX.md, memory/STATE.md.
Verify state: main at `687697c` or later, `git log origin/main..HEAD` empty, clean tree. Gates (all green 2026-08-03): tsc 0, 355 tests/24 files, lint 0 errors/3 known warnings, build warning-free, bundle ~401.5 kB.
DONE 2026-08-03: Phase A of the LaunchOS launch-critical path (D-022) opened. **Proposal 015 CORRECTED before applying** — the draft published four tables incl. `profiles` on a wrong claim that `usePartnerState` watches it; the hook watches `friendships` (`usePartnerState.ts:149`), nothing subscribes to `profiles`, so 015 now publishes tasks/user_credits/friendships. up/down/validation/runbook all fixed; four-table version never applied; 014-before-015 order kept. Three stale doc lines fixed (STATE:105 + DECISIONS:91 said 013 unapplied though applied 2026-07-30; IOS runbook said floor 14.0, is 15.0). Password rotation REOPENED as A3 per the 2026-07-29 closure's own take-real-users condition.
NEXT: **If Michael's message contains the DB password: run A1+A2 immediately** per `docs/runbooks/PROD_RUNBOOK_014_015.md` (backup first, scratchpad PGPASSFILE, never store or commit the password; append run records to the runbook, update STATE/BOARD, remind him to rotate = A3). If not, ask for it — nothing else in Phase A is executable from Windows. After the applies: his two-browser realtime + 014 write tests, then the Mac leg (A4/A5). Build backlog unchanged behind Phase A: CLDR plural gate in `languages.test.ts` first, then remaining formatter call sites, then the newly-catalogued hard-coded surfaces (Dashboard ~38, useTasks ~35, ProofModal), then the UTC streak-day bug. Mode 2 rules and the Status Block apply.
