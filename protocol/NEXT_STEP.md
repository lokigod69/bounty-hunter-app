# NEXT STEP — Bounty Hunter/main — updated 2026-07-10 (apple-design pass + RPC draft)

## FOR YOU
1. **Fix the empty screen — add the 2 Vercel env vars, then redeploy.** Vercel dashboard → your bounty-hunter project → Settings → Environment Variables → add BOTH, for all environments (Production/Preview/Development):
   - Name: `VITE_SUPABASE_URL`  →  Value: `https://mvbmpcmexkgfairnthux.supabase.co`
   - Name: `VITE_SUPABASE_ANON_KEY`  →  Value: `sb_publishable_hd2zXdd8V6ANi4Pdo0ll1w_dveaqEIe`
   - ⚠️ That's the **anon/publishable** key — do NOT put the service-role key in Vercel env for the frontend; it would ship admin access to every browser. The frontend never needs it.
   - Then Deployments → ⋯ on the latest → **Redeploy** (env vars are baked in at build time; without a redeploy nothing changes).
2. **Then eyeball on your phone** (bountyhunter.xyz in the browser): Phases 1–4 as before (art, invite/reject/redeem, sounds, PDF/video proof) **plus the new apple-design pass** — buttons/cards should respond the instant your finger touches them, modals should glide like iOS sheets. Full audit: `docs/premium-v1/APPLE_DESIGN_AUDIT.md`.
3. **Review proposal 011 — task-lifecycle RPCs** (`db/proposals/011_task_lifecycle_rpcs.md`). DRAFT ONLY, zero SQL applied. Decide the 4 open points (A: proof_type whitelist, B: reject = 'rejected' not 'pending', C: archive gating, D: policy names) and give the go — then I apply + refactor the client to the RPCs.
4. Sound audition still open: upload/toggle reuse click files, payday reuses coin — tell me which to replace.

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md (this file), memory/INDEX.md, memory/STATE.md, and docs/premium-v1/ROADMAP.md.
Verify state: `git log --oneline -4` — expect apple-design pass + proposal-011 draft + bookkeeping commits on top of ef4d31b; `npm run build` + `npm test` green (59 tests); `tsc -p tsconfig.app.json --noEmit` = 0 errors (protect this; build alone does NOT typecheck pages). Supabase LIVE on mvbmpcmexkgfairnthux (ap-south-1), session pooler aws-1-ap-south-1.pooler.supabase.com:5432 user postgres.mvbmpcmexkgfairnthux; all 9 migrations applied (tracker 10 rows).
DONE: Phases 0–4 of docs/premium-v1/ROADMAP.md; DB-types regen (fcb830d); apple-design pass 2026-07-10 (press response, mirrored modal easings, reduced-motion/transparency — docs/premium-v1/APPLE_DESIGN_AUDIT.md; restraint rules in memory/DECISIONS.md); task-lifecycle RPC DRAFT = proposal 011 (db/proposals/011_*, runbook PROD_RUNBOOK_011.md) — NO SQL APPLIED, awaiting Michael's review of 4 open points.
PENDING MICHAEL: (a) Vercel env vars VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY + redeploy (fixes the blank deployed site; values in FOR YOU above / .env.local); (b) browser eyeball Phases 1–4 + apple-design pass + PDF/video proof; (c) sound audition; (d) proposal-011 review; (e) any prod SQL — never without explicit go.
Then: on 011 approval → apply via runbook + client refactor (useTasks.ts, domain/missions.ts, IssuedPage.tsx → RPCs) + types regen; or Phase 5 ship vehicle (cap sync ios, TestFlight — needs a Mac).
Mode 2 rules apply. Update NEXT_STEP.md after every completed step. End every turn with the Status Block.
