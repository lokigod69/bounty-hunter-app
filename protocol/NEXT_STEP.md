# NEXT STEP — Bounty Hunter/main — updated 2026-07-08 late night (Phase 4 COMMITTED: 70bdff3)

## FOR YOU
1. ✅ DONE 2026-07-08 late night: **Phase 4 sound & haptics committed (70bdff3)** — one `feedback.ts` API fires sound + haptic together (buttons/nav = light tap, approve & reward claim = success buzz + coin "payday", reject/delete = warning buzz), haptics obey your existing sound toggle, per-sound volume pass. Phases 0–4 of the roadmap are now all shipped.
2. **Supabase dashboard → Authentication → URL Configuration** for `bounty-hunter-app`: set Site URL + redirect URLs for `http://localhost:6075` and your Vercel domain — magic-link login won't work until then. This still blocks all browser testing.
3. Then log in and eyeball Phases 1–4: the Phase-3 art (coin sizes, gift emblems, gold-vs-mode card accents, heroes, empty states, store placeholders), Phase-2 flows (invite round-trip, reject/resubmit, mark-redeemed), and now **Phase-4 sounds** — listen for volume balance (clicks quiet, coin loudest) and tell me which placeholder sounds bug you (upload/toggle reuse click files; "payday" reuses the coin sound).
4. FYI: haptics only vibrate on a real phone (needs `npx cap sync ios` — Phase 5). Desktop browser = sounds only.

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md (this file), memory/INDEX.md, memory/STATE.md, and docs/premium-v1/ROADMAP.md.
Verify state: `git log --oneline -3` — expect 70bdff3 "Phase 4 sound & haptics" on top of 7a35284, 37b3a4b; `npm run build` + `npm test` green (49 tests); `tsc -p tsconfig.app.json --noEmit` = 15 pre-existing errors (build does NOT typecheck pages). Supabase LIVE on mvbmpcmexkgfairnthux (ap-south-1), session pooler aws-1-ap-south-1.pooler.supabase.com:5432 user postgres.mvbmpcmexkgfairnthux; all 9 migrations applied (tracker 10 rows).
DONE: Phases 0–4 of docs/premium-v1/ROADMAP.md (Phase 4 = feedback.ts sound+haptics — see memory/LOG.md 2026-07-08 late night; DECISIONS: Capacitor plugins must be lazy-imported from web code, a static import white-screens vite dev).
PENDING MICHAEL: (a) dashboard auth config (Site URL + redirects) — blocks all browser testing; (b) visual/audio eyeball of Phases 1–4; (c) sound audition (upload/toggle/payday alias placeholder files); (d) any prod SQL — never without explicit go.
Then: Phase 5 ship vehicle (cap sync ios, TestFlight prep) per ROADMAP.md, or task-lifecycle RPCs / DB-types regen per CODEX_NEXT_STEPS.md.
Mode 2 rules apply. Update NEXT_STEP.md after every completed step. End every turn with the Status Block.
