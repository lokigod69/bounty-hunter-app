# NEXT STEP — Bounty Hunter/main — updated 2026-07-08 (9 migrations APPLIED; Phase 2 COMPLETE; awaiting dashboard auth config + commit go)

## FOR YOU
1. ✅ DONE 2026-07-08: all 9 migrations APPLIED + verified (6-batch hardening + 3 new Phase-2 migrations). Credit-mint RPC + `user_credits` writes revoked from anon/authenticated; `rejection_reason` + PDF proofs live; 12 storage policies; `profiles.theme`/`onboarding_completed`, `collected_rewards.redeemed_at` + `mark_reward_redeemed`, `invites` table + `get_or_create_invite`/`redeem_invite` all live; tracker has 10 rows. See memory/LOG.md + DECISIONS.md.
2. ✅ DONE 2026-07-08: remaining Phase 2 shipped — invite links, mode/onboarding persistence, orphan `/profile/edit` removed (Restart Onboarding folded into the profile modal), collected-rewards mark-redeemed. Build ✓ / lint 0 errors / test 44 ✓ / 0 net-new type errors. **Working tree is NOT committed — say the word and I'll commit.**
3. **Supabase dashboard → Authentication → URL Configuration** for `bounty-hunter-app`: set Site URL + redirect URLs for `http://localhost:6075` and your Vercel domain — magic-link login (and the invite round-trip) won't work until then.
4. Then log in and eyeball: glass-card modals, badges + History tab, reject/resubmit, per-mode nouns + German, **Share invite link** (Friends + onboarding), **Restart Onboarding** (profile modal), **collected-reward "Mark as redeemed"**, and that mode/onboarding now persist across a fresh device.
5. FYI: Mumbai region latency from Europe (fine for testing); real user data still only in the old paused `bounty` project.

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md (this file), memory/INDEX.md, memory/STATE.md, and docs/premium-v1/ROADMAP.md.
Verify state: `git log --oneline -4` — expect f8b25cf "Phase 2 UX coherence" on top (Phase-2-leftovers tree is UNCOMMITTED unless I committed it — check `git status`); `npm run build` + `npm test` green (44 tests); `tsc -p tsconfig.app.json --noEmit` = 15 pre-existing errors (build does NOT typecheck pages). Supabase LIVE on mvbmpcmexkgfairnthux (ap-south-1), DB via session pooler aws-1-ap-south-1.pooler.supabase.com:5432 user postgres.mvbmpcmexkgfairnthux; .env.local points at it. All 9 migrations applied (tracker 10 rows).
DONE: Phases 0–1; Phase 2 COMPLETE (items 1–8); 2026-07-08 restore+wipe, then 9-migration apply + Phase-2 leftovers (see LOG + DECISIONS).
PENDING MY GO: (a) commit the uncommitted Phase-2 working tree; (b) dashboard auth config; (c) any further prod SQL — never apply SQL without my explicit go.
Then: Phase 3 generated assets (credit emblem, mode art, empty states, reward-store placeholders, app icon/splash) per docs/premium-v1/ROADMAP.md, or task-lifecycle RPCs / DB-types regen per CODEX_NEXT_STEPS.md. Spawn sub-agents for execution; orchestrator reviews every diff.
Mode 2 rules apply. Update NEXT_STEP.md after every completed step. End every turn with the Status Block.
