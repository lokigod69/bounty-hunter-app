# BOARD — Bounty Hunter — updated 2026-07-10

## ⚠️ WAITING ON YOU
- **Confirm the live Vercel deployment is on the new commit** (2f8436f/HEAD, pushed after proposal 011 applied) — if it's still serving a build from before the push, the old code calling the now-dropped UPDATE policies will error on submit/reject/archive/delete.
- **Run the post-011 core loop as two real users** on bountyhunter.xyz: create → start → submit (file/text/no-proof) → reject with reason → resubmit → approve (credits land ONCE) → archive → delete. This is the first real runtime test of the new RPCs — tsc/build/vitest only prove the code compiles and passes unit tests, not that it works end-to-end.
- **Eyeball Phases 1–4 + apple-design pass** while you're in there (art, invite/reject/redeem, sounds, PDF/video proof, instant press response, iOS-sheet modals).
- Sound audition (upload/toggle/payday placeholder sounds) — still open, not blocking.
- Consider rotating the Supabase DB password — it was pasted in plaintext in chat to run the 011 rollout scripts; not urgent, just hygiene.

## Workstreams
| Workstream | Phase/Gate | Last done | Next | State |
|---|---|---|---|---|
| main | Premium V1 polish — Phases 0–4 COMPLETE; proposal 011 APPLIED + shipped | Jul 10: 011 approved, applied live by Michael (backup+apply+push+validate), types regenerated, tsc/build/79 tests green | YOU confirm deploy + run core loop; then Phase B (create/update_task RPCs) or Phase 5 ship vehicle | 🟢 active |

## Standing decisions parked for you (not blocking yet)
- ~~Proposal 011 open points A–D~~ DECIDED 2026-07-10 (you: PDF yes, B–D delegated; recorded in the proposal .md). ~~Apply~~ DONE 2026-07-10.
- Prod SQL go/no-go whenever a runbook comes up — backup + your review required, always.
- ~~Noun system~~ DECIDED 2026-07-07: Mission/Chore/Request; store items = Rewards; "Bounty" = mission credit pot.
- ~~Proof types~~ DECIDED 2026-07-07: PDF/text/private all allowed.

## Recently finished (last 5)
- 2026-07-10 (latest) **Proposal 011 APPLIED to production + shipped**: you ran the runbook live (pre-flight clean, backup taken and verified, apply succeeded, pushed to origin, post-validate confirmed); 5 RPCs live, broad assignee UPDATE policies dropped, proof_type constraint widened; `database.ts` regenerated, temporary type overlay removed, tsc 0/build/79 tests green throughout
- 2026-07-10 (later) **Proposal 011 approved + finalized + client refactor committed**: A–D decided; up.sql gained proof_type constraint normalization (never widened by any migration — latent text/PDF hazard); codex-executed refactor centrally reviewed — delete-flow storage cleanup reordered BEFORE the RPC (bucket delete policy joins the tasks row)
- 2026-07-10 **Apple-design pass applied** (docs/premium-v1/APPLE_DESIGN_AUDIT.md): instant press response (0.08s :active), touch-action:manipulation everywhere tappable, press states added to TaskCard/Fab/RewardCard (had none), mirrored modal easing tokens, reduced-motion + reduced-transparency coverage, tailwind duplicate animation key fixed
- 2026-07-08 (late night s2) **DB types regen + typecheck clean (fcb830d)**: database.ts regenerated (UTF-8), tsc 15→0 errors; found + fixed PDF/video proof-validation bug; 59 tests
- 2026-07-08 (late night) **Phase 4 sound & haptics (70bdff3)**: feedback.ts semantic API, tap haptics on AppButton/Fab, approve/reject/delete/claim wired, volume pass
