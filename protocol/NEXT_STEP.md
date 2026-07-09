# NEXT STEP — Bounty Hunter/main — updated 2026-07-08 late night session 2 (DB types regen: fcb830d)

## FOR YOU
1. ✅ DONE 2026-07-08 late night s2: **DB types regenerated + typecheck fully clean (fcb830d)** — `database.ts` now matches the live DB (15 type errors → 0), and this surfaced+fixed a real bug: PDF and video proof uploads were being rejected by validation before they ever reached storage. 59/59 tests.
2. **Supabase dashboard → `bounty-hunter-app` → Authentication → URL Configuration** (blocks ALL login/testing until saved):
   - Site URL: `https://bountyhunter.xyz`  (use your exact Vercel prod domain if different)
   - Redirect URLs (add all three): `http://localhost:6075/**` , `https://bountyhunter.xyz/**` , `bountyhunter://auth/callback`
3. **Test on your phone by opening bountyhunter.xyz in the browser** — NOT Expo Go / NOT TestFlight. This is a Capacitor-wrapped web app; the browser covers everything except haptics (vibration) + push. Add-to-Home-Screen for an app feel. Then eyeball Phases 1–4: Phase-3 art (coin, gift emblems, card accents, heroes, empty states, store placeholders), Phase-2 flows (invite round-trip, reject/resubmit, mark-redeemed), Phase-4 sounds (volume balance; upload/toggle reuse click files, "payday" reuses the coin sound — tell me which to replace), and submit a **PDF or video proof** (path just unblocked).
4. **Decision:** want Claude (Opus) to draft the task-lifecycle-RPC proposal + runbook + migration (DRAFT only, no SQL applied)? It's the credit-award security boundary → needs highest intelligence + your review, NOT a Fable job. Say the word.
5. FYI: haptics only vibrate on a real phone (needs `npx cap sync ios` + Xcode — Phase 5). Browser = sounds only.

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md (this file), memory/INDEX.md, memory/STATE.md, and docs/premium-v1/ROADMAP.md.
Verify state: `git log --oneline -3` — expect fcb830d "Regenerate Supabase DB types" (plus a bookkeeping commit) on top of da3c9af, 70bdff3; `npm run build` + `npm test` green (59 tests); `tsc -p tsconfig.app.json --noEmit` = 0 errors (CLEAN as of fcb830d — protect this; build alone does NOT typecheck pages). Supabase LIVE on mvbmpcmexkgfairnthux (ap-south-1), session pooler aws-1-ap-south-1.pooler.supabase.com:5432 user postgres.mvbmpcmexkgfairnthux; all 9 migrations applied (tracker 10 rows).
DONE: Phases 0–4 of docs/premium-v1/ROADMAP.md + CODEX_NEXT_STEPS #5 (DB-types regen, fcb830d — database.ts is UTF-8 now; regen with `supabase gen types --project-id mvbmpcmexkgfairnthux`, NOT --linked; see memory/LOG.md 2026-07-08 late night s2 — regen exposed+fixed the PDF/video proof-validation bug).
PENDING MICHAEL: (a) dashboard auth config (Site URL + redirects) — blocks all browser testing; (b) visual/audio eyeball of Phases 1–4 + PDF/video proof upload; (c) sound audition (upload/toggle/payday alias placeholder files); (d) any prod SQL — never without explicit go.
Then: Phase 5 ship vehicle (cap sync ios, TestFlight prep — needs a Mac for the native side) per ROADMAP.md, or task-lifecycle RPCs (CODEX #4, high effort, RPC drafts need Michael review before any SQL).
Mode 2 rules apply. Update NEXT_STEP.md after every completed step. End every turn with the Status Block.
