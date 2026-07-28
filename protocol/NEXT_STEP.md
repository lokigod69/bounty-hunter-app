# NEXT STEP — Bounty Hunter/main — updated 2026-07-28 (Phase B merged, edge hardening, Wave 2 Standing shipped; 012 SQL is YOUR gate)

## FOR YOU
1. **Run the 012 SQL rollout — prod create/edit is broken until you do** (knowingly accepted; no users). In PowerShell at the repo root:
   `$env:PROD_CONFIRM='YES'` → `.\scripts\prod\validate_012.ps1` → `.\scripts\prod\backup_schema.ps1` → `.\scripts\prod\apply_012_up.ps1` → `.\scripts\prod\validate_012.ps1` → `supabase gen types --project-id mvbmpcmexkgfairnthux > src/types/database.ts` → commit the regen → browser-test one create + one edit. Rollback: `.\scripts\prod\rollback_012.ps1`.
2. **Whenever convenient, browser smoke:** Waves 0/B/C checklist (previous NEXT_STEP) plus new Wave 2: hexagon sigil + rank word in the header, tooltip shows progress, creed line at the board foot, and (if you cross a band by earning) the rank-up ceremony fires once and never replays on reload.
3. Open design questions that would unblock more: your typical contract payout (sets the rank ladder — currently 120/600/2000/8000 in `standing.domain.ts`), and whether to close the self-assign standing hole via a 013 proposal.

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md, memory/INDEX.md, memory/STATE.md.
Verify state: main at `80a7d77` (or later) pushed; working tree may carry session bookkeeping. Run `git diff --check`, `npx tsc -p tsconfig.app.json --noEmit`, `npm test`, `npm run lint`, `npm run build` (expect: 0 errors, 110 tests/18 files, 0 lint errors/3 warnings, build pass).
DONE 2026-07-28: phase-b-client-rpcs rebased+merged (7b7414e — prod create/edit broken until 012 SQL, accepted); edge functions hardened (4803957 — zero deployed on live, escapeHtml, dead cron stub); Design V2 Wave 2 Standing shipped (208687a, 80a7d77 — sigil/rank/ceremony/creed-by-band/THE NAMED own-name, bilingual, 110 tests).
IN FLIGHT at handoff: Codex adversarial review of eb98b2c..HEAD (task-ms5amb42-hz99r3) — fetch result (`node C:/Users/micha/.claude/plugins/cache/openai-codex/codex/1.0.5/scripts/codex-companion.mjs result task-ms5amb42-hz99r3`), arbitrate findings, fix batch, re-run gates, push.
NEXT after that: Michael's 012 rollout is the gate for prod create/edit; then deferred waves 3/4/5 or a 013 proposal closing the self-assign standing hole. Mode 2 rules and the Status Block apply.
