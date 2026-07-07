# NEXT STEP — Bounty Hunter/main — updated 2026-07-07 (late night, post Phase 2)

## FOR YOU
1. **Restore Supabase** — login is dead until you do. Follow `docs/runbooks/SUPABASE_RESTORE_CHECKLIST.md`: Step 0 = download the dashboard backup FIRST (the base schema exists only inside the paused project); then "Restore project" (Option A). After restore, apply the two new migrations in the SQL editor (they're small and additive): `supabase/migrations/20260707220000_add_rejection_reason.sql` and `20260707221000_allow_pdf_proofs.sql` (proposals 009/010). The app works without them (graceful fallback) but reject-reasons and PDF proofs need them.
2. After restore: browser pass of everything shipped while you were locked out — glass-card modals (Phase 1), nav badges + History tab, the new reject-with-reason dialog, resubmit flow, per-mode nouns in all three modes, and German copy (agents flagged: de contracts/taskForm use Sie-form while rewards.empty is now du-form — say if you want one register app-wide).
Otherwise nothing: paste the block below into a fresh chat to continue.

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md (this file), memory/INDEX.md, memory/STATE.md, and docs/premium-v1/ROADMAP.md.
Verify state: `git log --oneline -4` — expect a "Phase 2 UX coherence" commit on top of fc6ee3b; `npm run build` green and `npm test` green (41 tests).
DONE: Phases 0–1, and Phase 2 items 1–4 + proof types (noun system Mission/Chore/Request, tasks realtime + nav action badges, History nav, rejection loop w/ reason, PDF proofs). Decisions recorded in memory/DECISIONS.md.
Supabase is PAUSED (restore checklist: docs/runbooks/SUPABASE_RESTORE_CHECKLIST.md); migrations 20260707220000 + 20260707221000 are written but NOT applied — never apply prod SQL without backup + Michael's go.
Then: remaining Phase 2 (invite links — needs live Supabase; mode/onboarding persistence — prod SQL; orphan surfaces /profile/edit; collected-rewards "mark redeemed") or Phase 3 assets (credit emblem, mode art, empty states, store placeholders, icon/splash), per BOARD.md. Spawn Opus/Sonnet sub-agents for execution; orchestrator reviews every diff.
Mode 2 rules apply. Update NEXT_STEP.md after every completed step. End every turn with the Status Block.
