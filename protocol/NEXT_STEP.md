# NEXT STEP — Bounty Hunter/main — updated 2026-07-08 night (Phases 2+3 COMMITTED: 47e7eb7, 37b3a4b)

## FOR YOU
1. ✅ DONE 2026-07-08: Phase 2 committed (47e7eb7) and **Phase 3 visual identity committed (37b3a4b)** — raster coin, per-mode gift emblems, type-based card accents (credit=gold / gift=mode color), onboarding hero art, 5 empty-state illustrations, 4 reward-placeholder still-lifes, iOS app icon + splash. Build/lint/test/tsc all green.
2. **Supabase dashboard → Authentication → URL Configuration** for `bounty-hunter-app`: set Site URL + redirect URLs for `http://localhost:6075` and your Vercel domain — magic-link login (and the invite round-trip) won't work until then. This also blocks any browser eyeball.
3. Then log in and eyeball the new art (this is the big visual review): coin at all sizes (header pill, store hero, mission modal, cards — check the value text reads at small sizes), gift emblems on cards + mission modal, gold-vs-mode card accents, onboarding guild hero banner, all 5 empty states, reward-store placeholder art. Plus the Phase-2 list: invite link round-trip, reject/resubmit, mark-redeemed, persistence.
4. FYI parked from Phase 3: credit-pouch emblem generated but unwired (coin covers credits); streak flame + is_daily toggle; heroes in modal headers.

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md (this file), memory/INDEX.md, memory/STATE.md, and docs/premium-v1/ROADMAP.md.
Verify state: `git log --oneline -4` — expect 37b3a4b "Phase 3 visual identity" on top of 47e7eb7 "Finish Phase 2"; `npm run build` + `npm test` green (44 tests); `tsc -p tsconfig.app.json --noEmit` = 15 pre-existing errors (build does NOT typecheck pages). Supabase LIVE on mvbmpcmexkgfairnthux (ap-south-1), session pooler aws-1-ap-south-1.pooler.supabase.com:5432 user postgres.mvbmpcmexkgfairnthux; all 9 migrations applied (tracker 10 rows).
DONE: Phases 0–3 of docs/premium-v1/ROADMAP.md (Phase 3 = generated assets wired: coin/emblems/heroes/empty-states/placeholders/iOS icon+splash — see memory/LOG.md 2026-07-08 night + DECISIONS on the asset design system).
PENDING MICHAEL: (a) dashboard auth config (Site URL + redirects) — blocks all browser testing; (b) visual eyeball of Phases 1–3; (c) any prod SQL — never without explicit go.
Then: Phase 4 sound & haptics per ROADMAP.md, or task-lifecycle RPCs / DB-types regen per CODEX_NEXT_STEPS.md. Codex image pipeline notes: verify every generated image, serialize regens (DECISIONS 2026-07-08).
Mode 2 rules apply. Update NEXT_STEP.md after every completed step. End every turn with the Status Block.
