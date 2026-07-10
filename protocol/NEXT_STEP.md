# NEXT STEP — Bounty Hunter/main — updated 2026-07-10 (011 approved; refactor committed, unpushed)

## FOR YOU
1. **Run the proposal-011 rollout — only you can (scripts prompt for the DB password, which is deliberately not on this machine).** PowerShell, repo root:
   ```powershell
   $env:PROD_CONFIRM = "YES"
   scripts\prod\validate_011.ps1     # pre-flight, read-only — check #4 policy names match, #5b returns 0 rows
   scripts\prod\backup_schema.ps1    # backup — confirm the dump file appears in supabase\
   scripts\prod\apply_011_up.ps1     # the apply (one transaction, aborts whole on any error)
   git push                          # ships the RPC client build to Vercel
   scripts\prod\validate_011.ps1     # post-check — the two assignee UPDATE policies must be GONE
   ```
   Details/expected outputs: `docs/runbooks/PROD_RUNBOOK_011.md`. If anything looks wrong: `scripts\prod\rollback_011.ps1` + redeploy the previous Vercel build.
2. **Finish the Vercel redeploy you started** (env vars ✅). Safe any time BEFORE the apply above — it redeploys the old build. After the apply, the `git push` in step 1 ships the new one.
3. **Eyeball on your phone** (bountyhunter.xyz): Phases 1–4 (art, invite/reject/redeem, sounds, PDF/video proof) + apple-design pass (instant press response, iOS-sheet modals). After the 011 apply, also run the core loop: create → start → submit (file/text/no-proof) → reject with reason → resubmit → approve (credits land ONCE) → archive → delete.
4. Sound audition still open (upload/toggle/payday placeholders).

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md (this file), memory/INDEX.md, memory/STATE.md.
Verify state: `git log --oneline -3` — expect two new commits on top of 47a024d: (1) proposal-011 finalized (A–D decided + proof_type constraint normalization in up.sql) + client RPC refactor + scripts/runbook, (2) session bookkeeping. `npx tsc -p tsconfig.app.json --noEmit` = 0 (protect; build does NOT typecheck pages); `npm run build` + `npm test` green (14 files / 79 tests). Supabase LIVE on mvbmpcmexkgfairnthux (ap-south-1), pooler aws-1-ap-south-1.pooler.supabase.com:5432 user postgres.mvbmpcmexkgfairnthux.
DONE: 011 APPROVED 2026-07-10 (Michael: PDF yes, B–D delegated; decisions in db/proposals/011_*.md); client refactor to the 5 RPCs committed (codex-executed, centrally reviewed — delete-flow storage cleanup runs BEFORE delete_task because the bucket delete policy joins the tasks row); scripts/prod/{validate,apply,rollback}_011*.ps1 + retargeted backup_schema.ps1; runbook READY.
CRITICAL ORDERING: the refactor commit is LOCAL-ONLY. Do NOT `git push` until Michael has applied 011 via the runbook (RPCs don't exist on live yet; equally, once policies drop the OLD build can't submit/reject/archive/delete — push immediately after apply).
PENDING MICHAEL: (a) run the runbook 5-command sequence (needs his DB password); (b) finish Vercel redeploy of the old build (env vars in); (c) browser eyeball Phases 1–4 + apple-design + post-011 core loop; (d) sound audition.
AFTER 011 IS LIVE: regen types (`supabase gen types --project-id mvbmpcmexkgfairnthux` → database.ts, then REMOVE the temporary RPC overlay in src/types/custom.ts), tsc/build/test, commit; then Phase B (create/update_task RPCs, drop remaining client write policies) or Phase 5 ship vehicle (cap sync ios, TestFlight — needs a Mac).
Mode 2 rules apply. One LOG line per step; checkpoint per Iron Rule 3; end checkpoints with the Status Block.
