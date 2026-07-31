# NEXT STEP — Bounty Hunter/main — updated 2026-07-30 (both prod runs DONE; two new DB findings, one a security hole)

## FOR YOU

1. **🔴 Two new proposals need your go — one is a security hole.** Both found by inspecting the live
   database, neither visible in the repo. Runbook: `docs/runbooks/PROD_RUNBOOK_014_015.md`. **014 before 015.**
   - **014** — `public.profiles` has four RLS policies and **RLS switched off**, so all four are inert,
     while `anon` and `authenticated` hold DELETE/INSERT/UPDATE/TRUNCATE. The anon key ships in your
     deployed JS bundle, so anyone who reads it out can rewrite or truncate every profile row. `tasks`,
     `friendships` and `user_credits` all have RLS on — profiles is the only one that doesn't, and no
     migration ever enabled it. Fix is one line; every client write path was checked against the
     existing policies first, and profile *readability* does not change.
   - **015** — `supabase_realtime` contains **zero tables**, so all five `postgres_changes`
     subscriptions in the app receive nothing. Live updates have never worked on this project. This is
     the real answer to the parked "is `friendships` in the publication" question.
2. **Browser-test on a real phone — now the single biggest gap.** Ten mobile fixes across two batches,
   none seen on a device. Portrait: the wordmark is **deliberately gone below 640px** (it needs a 507px
   viewport; it was overlapping the sigil and credits, not fitting) — the logo mark must not overlap
   anything, FriendCard action rows must wrap, and a German daily-task card must show its title.
   Landscape: hamburger appears, a modal's submit stays reachable with the keyboard up, focusing an
   input doesn't zoom, the German Friends tab bar reaches its first tab.
3. **Delete ONE auth user in the dashboard when you want the signup + onboarding re-test** (three exist).
   That was the alternative to scope B: same test, and two working accounts left as a way back in if
   confirmation email is misconfigured. Try onboarding in a non-English language while you're there.
4. **Nothing to do for storage** — all three buckets were already empty, so the wipe runbook's manual
   step 3 is a no-op.
5. **Still outstanding from before:** browser-test one create + one edit mission (the last unverified
   piece of 012 — the wipe gave you an empty board to do it on), paste the branded email templates.

## PASTE THIS

Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md, memory/INDEX.md, memory/STATE.md.
Verify state: main at `f9f2165` or later and everything pushed — `git log origin/main..HEAD` empty. Run `git diff --check`, `npx tsc -p tsconfig.app.json --noEmit`, `npm test`, `npm run lint`, `npm run build` (expect: 0 errors, 355 tests/24 files, 0 lint errors/3 known warnings, build pass and warning-free, main bundle ~401 kB).
DONE 2026-07-30 (7 commits, all pushed): **Michael pasted the DB password, so both gated prod runs finally executed.** (a) **013 APPLIED** — guards live on create/update/approve, all three body md5s moved (`approve_task` cfc5d58d→2e093f81), grants intact, `increment_user_credits` still unreachable from anon/authenticated. (b) **Wipe RUN, scope A** — tasks 2→0, friendships 2→0, invites 1→0, one stale `partner_user_id` nulled, profiles + auth.users kept at 3. Scope B was **declined in favour of a third option**: scope A plus Michael deleting one auth user by hand, which gets the signup re-test without the one-way door. (c) **⚠️ `backup_data.ps1` was producing backups that protected nothing** — `--schema=public --table=auth.users` to ONE pg_dump means `--table` narrows and `--schema` does not add public back, so the dump held `auth.users` and nothing else; the "≥1 INSERT" guard passed on its three rows and printed green. It would have authorised the irreversible wipe against a backup containing none of the rows at risk. Now two dumps concatenated at byte level, and the guard asserts **per-table counts against the live DB** (11/11 verified). **Any data_backup_*.sql before 2026-07-30 may hold auth.users only.** (d) **Correction: `tesatmynutes` was never self-assigned** (`created_by` ≠ `assigned_to`, reward `text`) — the self-assign hole was real as a capability but never exercised. (e) **Extraction FINISHED: 93 keys × 12** (466→559 leaves) — EmojiPicker, FriendCard, FriendSelector, reward image field, Layout aria-labels, `themes.ts` (label/description **removed from `ThemeDefinition`** so they can't be re-hardcoded, and they now follow a language switch), RPC error table → UI-layer `taskLifecycleErrors.ts` with the domain layer still refusing i18next. (f) **Last three mobile MAJORs closed**, 15 guards, 10 confirmed failing pre-fix. The header bug was **an unshrinkable child overflowing a `min-w-0` parent**; the German title vanished because `line-clamp-2` is `overflow:hidden` so a zero-width box renders *nothing*; and it was sized to the **desktop** `lg:grid-cols-3` card at 264px — the narrowest card in the app is not on the narrowest viewport. (g) **New `src/i18n/format.ts` + `useFormatters()`**, locale-as-first-argument so plain modules stay pure. `dateUtils.ts` **deleted** (Sunday-first, zero importers). **CLDR does not abbreviate thousands in German or Italian at all** — 12000 is "12.000", abbreviation starts at millions; pinned by a test. (h) **Real mojibake in `RewardsStorePage.tsx`** — users were reading "Lifetime earned Â· 1,234"; tree-wide scan found only that and one comment. (i) **Codex review found one MAJOR the gates could not**: six lifecycle-error paths rendered the generic fallback instead of the mapped sentence — a regression in English too. Fixed, plus two unreachable dead keys fixed at the source (`rewardImageUpload.ts` now returns codes). New guard brace-matches every try/catch and fails any that can receive a lifecycle refusal without translating; verified to fail on the real defect. (j) **Two new DB findings written as proposals 014/015, NOT applied** — see FOR YOU.
NEXT: Michael's 014/015 go, the real-device mobile check, and one deleted account for the signup test. Then: (1) teach `languages.test.ts` about CLDR plural categories — it **blocks** the 5 concatenated pluralisations and nothing else can proceed past it; (2) the remaining formatter call sites (credit badge compact, the two duplicated countdowns, Coin, ProofModal percent); (3) newly-catalogued hard-coded surfaces — **Dashboard.tsx has ~38 English strings and exactly one `t()` call**, plus useTasks (~35), ProofModal; (4) the UTC day-boundary bug in streaks (`toISOString().split('T')[0]` rolls the day at 08:00 at UTC+8). Mode 2 rules and the Status Block apply.
