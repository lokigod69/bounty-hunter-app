# NEXT STEP — Bounty Hunter/main — updated 2026-07-10 (011 APPLIED + shipped)

## FOR YOU
1. **Confirm the live Vercel deployment is on the new commit** (`5ea9889`/HEAD). If Vercel auto-deploys on push to `main`, this already happened when I pushed after the SQL apply — check the Vercel dashboard's latest deployment commit hash. If it's still on an older commit, redeploy manually.
2. **Run the post-011 core loop as two real users** on bountyhunter.xyz — this is the first actual runtime test of the new RPCs (tsc/build/tests only prove the code compiles, not that it behaves correctly end-to-end): create → start → submit (file/text/no-proof) → reject with reason → resubmit → approve (credits land ONCE) → archive → delete.
3. **Eyeball while you're in there**: Phases 1–4 (art, invite/reject/redeem, sounds, PDF/video proof) + apple-design pass (instant press response, iOS-sheet modals).
4. Sound audition still open (upload/toggle/payday placeholders).
5. Consider rotating the Supabase DB password — it was pasted in plaintext in chat to run the rollout scripts. Not urgent, just hygiene.

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md (this file), memory/INDEX.md, memory/STATE.md.
Verify state: `git log --oneline -4` — expect on top of 47a024d: (1) proposal-011 finalized + client RPC refactor + scripts/runbook, (2) session bookkeeping, (3) post-apply cleanup (types regen + overlay removal). `npx tsc -p tsconfig.app.json --noEmit` = 0 (protect; build does NOT typecheck pages); `npm run build` + `npm test` green (14 files / 79 tests). Supabase LIVE on mvbmpcmexkgfairnthux (ap-south-1), pooler aws-1-ap-south-1.pooler.supabase.com:5432 user postgres.mvbmpcmexkgfairnthux.
DONE 2026-07-10: proposal 011 (task-lifecycle RPCs) fully APPLIED to production and shipped. Michael approved (PDF yes, points B–D delegated), decisions recorded in db/proposals/011_task_lifecycle_rpcs.md; client refactored to the 5 RPCs (codex-executed, centrally reviewed — one bug fixed: Storage proof cleanup must run BEFORE delete_task, not after, since the bucket delete policy joins the tasks row); Michael ran the live rollout himself (backup → apply → push → validate, all clean, backup file supabase/schema_backup_20260710_121149.sql); database.ts regenerated from live, temporary custom.ts overlay removed; all pushed to origin/main.
FINDING (not a defect): `anon` role can technically execute all 5 RPCs — this is Supabase's platform default-privilege grant on new public-schema functions (confirmed identical on approve_task/purchase_reward/mark_reward_redeemed), harmless since every RPC null-checks auth.uid() first.
PENDING MICHAEL: (a) confirm Vercel is serving the new commit; (b) run the post-011 core loop as two users (first real runtime test); (c) browser eyeball Phases 1–4 + apple-design; (d) sound audition; (e) consider rotating the DB password (pasted in chat this session).
NEXT BUILD ITEM (either, no blocker): Phase B (create_task/update_task RPCs — drops the remaining creator-side client write policy) or Phase 5 ship vehicle (cap sync ios, device safe-areas, TestFlight — needs a Mac).
Mode 2 rules apply. One LOG line per step; checkpoint per Iron Rule 3; end checkpoints with the Status Block.
