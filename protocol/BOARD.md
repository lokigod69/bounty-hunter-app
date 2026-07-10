# BOARD — Bounty Hunter — updated 2026-07-10

## ⚠️ WAITING ON YOU
- **Run the 011 rollout (needs YOUR DB password — I can't run it)**: 5 commands, copy-paste from `docs/runbooks/PROD_RUNBOOK_011.md` → validate (pre-flight) → backup → apply → `git push` → validate. The refactored client is committed but UNPUSHED on purpose: pushing before the SQL applies would deploy an app calling functions that don't exist yet.
- **Finish the Vercel redeploy you started** (env vars are in ✅ per your message) — redeploy the CURRENT deployed commit, and it's safe until you run the 011 apply; then the `git push` in the runbook ships the new build.
- **Eyeball on your phone at bountyhunter.xyz**: Phases 1–4 (art, invite/reject/redeem flows, sound volumes, PDF/video proof) PLUS the apple-design pass — buttons/cards instantly "grabby" on press, modals glide like iOS sheets.
- Sound audition (upload/toggle/payday placeholder sounds) — still open, not blocking.

## Workstreams
| Workstream | Phase/Gate | Last done | Next | State |
|---|---|---|---|---|
| main | Premium V1 polish — Phases 0–4 COMPLETE; 011 APPROVED + client refactor committed (unpushed) | Jul 10: 011 finalized (A–D decided, constraint fix, scripts+runbook READY); codex refactor reviewed (1 bug fixed), tsc/build/79 tests green | YOU run the 011 runbook (password-gated); then I regen types + Phase B or Phase 5 | 🟢 active |

## Standing decisions parked for you (not blocking yet)
- ~~Proposal 011 open points A–D~~ DECIDED 2026-07-10 (you: PDF yes, B–D delegated; recorded in the proposal .md). Apply order stays DB first, client deploy second.
- Prod SQL go/no-go whenever a runbook comes up — backup + your review required, always.
- ~~Noun system~~ DECIDED 2026-07-07: Mission/Chore/Request; store items = Rewards; "Bounty" = mission credit pot.
- ~~Proof types~~ DECIDED 2026-07-07: PDF/text/private all allowed.

## Recently finished (last 5)
- 2026-07-10 (later) **Proposal 011 APPROVED + finalized + client refactor committed (ZERO SQL applied)**: A–D decided; up.sql gains proof_type constraint normalization (never widened by any migration — latent text/PDF hazard); scripts apply/validate/rollback_011 + retargeted backup script; runbook READY (5-command sequence); codex-executed refactor centrally reviewed — delete-flow storage cleanup reordered BEFORE the RPC (bucket delete policy joins the tasks row; post-delete cleanup always fails RLS); tsc 0 / build / 79 tests
- 2026-07-10 **Apple-design pass applied** (docs/premium-v1/APPLE_DESIGN_AUDIT.md): instant press response (0.08s :active), touch-action:manipulation everywhere tappable, press states added to TaskCard/Fab/RewardCard (had none), mirrored modal easing tokens (--ease-enter/--ease-exit, iOS sheet curve), reduced-motion coverage completed (cross-fade modals, decorative loops off), new prefers-reduced-transparency fallback, MissionModalShell material tokenized, tailwind duplicate animation key fixed; build/tsc/lint/59 tests green
- 2026-07-10 **Task-lifecycle RPCs drafted — proposal 011, ZERO SQL applied**: submit_proof/reject_task/set_task_status/archive_task/delete_task (SECURITY DEFINER, approve_task-v3 pattern), drops legacy double-credit trigger + broad assignee UPDATE policies; up/down/validation SQL + draft runbook; built from a full map of both client write paths (useTasks.ts and missions.ts/IssuedPage.tsx)
- 2026-07-08 (late night s2) **DB types regen + typecheck clean (fcb830d)**: database.ts regenerated (UTF-8), tsc 15→0 errors; found + fixed PDF/video proof-validation bug; 59 tests
- 2026-07-08 (late night) **Phase 4 sound & haptics (70bdff3)**: feedback.ts semantic API, tap haptics on AppButton/Fab, approve/reject/delete/claim wired, volume pass
- 2026-07-08 (night) **Phase 3 visual identity (37b3a4b)**: 16 masters → 17 WebP wired (coin, emblems, type accents, heroes, empty states, placeholders, iOS icon/splash)
