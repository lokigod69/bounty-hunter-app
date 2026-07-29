# NEXT STEP — Bounty Hunter/main — updated 2026-07-28 latest (proposal 012 APPLIED; Phase B rollout complete)

## FOR YOU
1. **Rotate the Supabase DB password.** It was pasted into chat on 2026-07-28 to unblock the rollout, so it now lives in a session transcript. Dashboard → Project Settings → Database → Reset password. Nothing in the repo stores it, so rotating breaks nothing.
2. **Browser-test one create + one edit mission.** That is the only part of the 012 path that cannot be verified from here — the RPCs were smoke-tested unauthenticated (correct `not_authenticated` envelope, 0 rows written), but a real `auth.uid()` round-trip needs a logged-in browser. If create/edit works, Phase B is fully closed.
3. Whenever convenient, the Wave 0/B/C + Wave 2 visual smoke: sigil + rank word in the header, creed line at the board foot, seals anchor over the pressed control, only the hunter gets payday.
4. Open design questions that unblock more work: your typical contract payout (sets the rank ladder — currently 120/600/2000/8000 in `standing.domain.ts`), and whether to close the self-assign standing hole via a 013 proposal.

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md, memory/INDEX.md, memory/STATE.md.
Verify state: main at `e68d618` (or later) pushed, tree clean. Run `git diff --check`, `npx tsc -p tsconfig.app.json --noEmit`, `npm test`, `npm run lint`, `npm run build` (expect: 0 errors, 110 tests/18 files, 0 lint errors/3 warnings, build pass).
DONE 2026-07-28: Phase B client merged (7b7414e); edge functions hardened (4803957); Design V2 Wave 2 Standing shipped (208687a, 80a7d77); Codex adversarial review closed 8/8 (8e58cf4); **every prod script fixed to stop reporting success for failed commands** (1096190 — Michael's rollout had printed "Migration applied successfully" having done nothing); **proposal 012 APPLIED to prod, types regenerated, overlay removed** (e68d618, backup `supabase/schema_backup_20260728_232501.sql`).
NEXT: Michael rotates the DB password + browser-tests create/edit. Build picks: deferred waves 3/4/5 (economy anchor, bottom thumb-rail chassis, THE ROSTER, presence), a 013 proposal closing the self-assign standing hole, or provider-level credits dedupe. Mode 2 rules and the Status Block apply.
