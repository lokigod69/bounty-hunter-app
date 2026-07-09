# BOARD — Bounty Hunter — updated 2026-07-10

## ⚠️ WAITING ON YOU
- **Vercel env vars (the empty-screen fix)**: Vercel dashboard → bounty-hunter-app project → Settings → Environment Variables → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (exact values in protocol/NEXT_STEP.md — anon/publishable key, NEVER the service-role key), all environments → then **Redeploy** (env is baked in at build time). Auth config (Site URL + redirects) you've already done ✅.
- **Then eyeball on your phone at bountyhunter.xyz**: Phases 1–4 (art, invite/reject/redeem flows, sound volumes, PDF/video proof) PLUS the new apple-design pass — buttons/cards should feel instantly "grabby" on press, modals should glide in with an iOS-sheet feel.
- **Review proposal 011 (task-lifecycle RPCs)** — `db/proposals/011_task_lifecycle_rpcs.md`. Draft only, NO SQL applied. 4 open points (A–D) need your call before anything runs.

## Workstreams
| Workstream | Phase/Gate | Last done | Next | State |
|---|---|---|---|---|
| main | Premium V1 polish — Phases 0–4 COMPLETE; apple-design pass applied; RPC proposal drafted | Jul 10: apple-design audit implemented (press response, mirrored modal easing, reduced-motion/transparency) + proposal 011 drafted (5 lifecycle RPCs, zero SQL applied) | Your env vars + eyeball + 011 review; then 011 client refactor or Phase 5 ship vehicle | 🟢 active |

## Standing decisions parked for you (not blocking yet)
- Proposal 011 open points A–D (proof_type whitelist, reject semantics, archive gating, live policy names) — in the proposal .md.
- Prod SQL go/no-go whenever a runbook comes up — backup + your review required, always.
- ~~Noun system~~ DECIDED 2026-07-07: Mission/Chore/Request; store items = Rewards; "Bounty" = mission credit pot.
- ~~Proof types~~ DECIDED 2026-07-07: PDF/text/private all allowed.

## Recently finished (last 5)
- 2026-07-10 **Apple-design pass applied** (docs/premium-v1/APPLE_DESIGN_AUDIT.md): instant press response (0.08s :active), touch-action:manipulation everywhere tappable, press states added to TaskCard/Fab/RewardCard (had none), mirrored modal easing tokens (--ease-enter/--ease-exit, iOS sheet curve), reduced-motion coverage completed (cross-fade modals, decorative loops off), new prefers-reduced-transparency fallback, MissionModalShell material tokenized, tailwind duplicate animation key fixed; build/tsc/lint/59 tests green
- 2026-07-10 **Task-lifecycle RPCs drafted — proposal 011, ZERO SQL applied**: submit_proof/reject_task/set_task_status/archive_task/delete_task (SECURITY DEFINER, approve_task-v3 pattern), drops legacy double-credit trigger + broad assignee UPDATE policies; up/down/validation SQL + draft runbook; built from a full map of both client write paths (useTasks.ts and missions.ts/IssuedPage.tsx)
- 2026-07-08 (late night s2) **DB types regen + typecheck clean (fcb830d)**: database.ts regenerated (UTF-8), tsc 15→0 errors; found + fixed PDF/video proof-validation bug; 59 tests
- 2026-07-08 (late night) **Phase 4 sound & haptics (70bdff3)**: feedback.ts semantic API, tap haptics on AppButton/Fab, approve/reject/delete/claim wired, volume pass
- 2026-07-08 (night) **Phase 3 visual identity (37b3a4b)**: 16 masters → 17 WebP wired (coin, emblems, type accents, heroes, empty states, placeholders, iOS icon/splash)
