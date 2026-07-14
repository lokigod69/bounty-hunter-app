# NEXT STEP — Bounty Hunter/main — updated 2026-07-15 (deferred bugs fixed + pushed; Phase B fully staged; iOS Windows prep done)

## FOR YOU
1. **Two-user lifecycle test on prod** (Vercel is deploying c7da370/23ca5ec now): create mission with proof required → submit a PHOTO proof → **"View Submitted Proof" must open on BOTH sides** → reject with reason → resubmit → approve (credits once) → archive → delete. Also eyeball modal hero headers + empty bounty board (Jul-11 art), and the login page now speaks German if you switch language.
2. **Proposal 012 review (Phase B — closes the LAST client writes on tasks):** read `db/proposals/012_create_update_task_rpcs.md` (open points A–C have my recommendations). Rollout when you're ready: `validate_012.ps1` (pre-flight) → `backup_schema.ps1` → `apply_012_up.ps1` → merge+push branch `phase-b-client-rpcs` → post-validate → types regen. ~10 min, same shape as 011. Until then do NOT merge that branch.
3. **Email templates** — Dashboard → Authentication → Emails → **Templates tab**: "Confirm signup" ← `supabase/templates/confirm-signup.html`, "Magic Link" ← `supabase/templates/magic-link.html`; one fresh signup after to confirm the styled mail.
4. **Realtime publication** — Dashboard → Database → Publications → `supabase_realtime`: toggle `friendships` on (add `tasks` too).
5. **Phase 5 needs your Mac**: follow `docs/runbooks/IOS_SHIP_RUNBOOK.md` (build → cap sync → pod install → Xcode signing → TestFlight; device smoke checklist inside).
6. Parked: sound audition; rotate the DB password (pasted in chat 2026-07-10); taste-call on remaining empty-state art.

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md (this file), memory/INDEX.md, memory/STATE.md.
Verify state: `git log --oneline -3` on main — expect bookkeeping commit on top of 23ca5ec "Proposal 012 draft..." on top of c7da370 "Deferred bug-hunt fixes...". Branch `phase-b-client-rpcs` exists locally (f3927cb, DO NOT merge/push before 012 SQL applies). `npx tsc -p tsconfig.app.json --noEmit` = 0 (protect; build does NOT typecheck pages); `npm run build` green; `npm test` green (15 files / 85 tests on main; 90 on the branch). Supabase LIVE on mvbmpcmexkgfairnthux (ap-south-1).
DONE 2026-07-15: (a) deferred bug-hunt fixes SHIPPED c7da370 (offline existing user no longer routed to onboarding — profileBootstrap {profile,error} + profileError + FTXGate/checkFTXGate fail closed; ftxGate stale-request cancellation; Login fully i18n en/de); (b) proposal 012 DRAFTED + committed 23ca5ec (create_task/update_task SECURITY DEFINER RPCs, jsonb-patch column whitelist, drops last 3 client write policies incl. dead DELETE policy) — Michael-gated; (c) Phase B client refactor DONE on branch phase-b-client-rpcs (RPC routing + temp type overlay, 90 tests) — deploy-locked behind the SQL; (d) Phase 5 Windows prep: 3 missing Capacitor plugins installed (StatusBar/SplashScreen/Keyboard config was silently ignored), cap sync ios, IOS_SHIP_RUNBOOK.md; (e) npm audit fix → 0 prod vulns. All executor work via codex, centrally verified.
PENDING MICHAEL: see FOR YOU (lifecycle test, 012 review/rollout, templates, realtime, Mac leg).
NEXT BUILD ITEM (nothing queued; candidates): legacy Gmail notification edge functions hardening/undeploy (Known problems) · empty-state art refresh (taste-gated) · anything from Michael's test findings.
Mode 2 rules apply. One LOG line per step; checkpoint per Iron Rule 3; end checkpoints with the Status Block.
