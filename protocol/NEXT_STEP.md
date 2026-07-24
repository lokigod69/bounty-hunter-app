# NEXT STEP — Bounty Hunter/main — updated 2026-07-24 (Design V2 Wave B implemented; browser smoke + commit next)

## FOR YOU
1. **Browser/device smoke Wave B as two users:** pending assignee sees Accept contract → In progress; then submit text-only and file proofs; issuer sees image/video/PDF inline plus Hunter's report; send back and confirm the issuer's Sent back section retains the mission; archive from either side and confirm no Overdue alarm.
2. **Modal/refresh smoke:** open a dossier while triggering a realtime or pull refresh (it must stay open); open a nested confirmation/lightbox and press Escape once (only the top dialog closes); Tab stays inside and focus returns on close.
3. If that passes, commit the intentionally uncommitted Wave B tree. Proposal 012 branch remains deploy-locked until its SQL rollout; the older dashboard/templates/realtime/Mac tasks remain listed on BOARD.

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md, memory/INDEX.md, memory/STATE.md.
Verify state: main at 46454d3 plus an uncommitted Design V2 Wave B tree; preserve the pre-existing untracked `docs/design-v2/` register and Wave A memory entry. Protected Phase-B regions remain untouched. Run `git diff --check`, `npx tsc -p tsconfig.app.json --noEmit`, `npm test`, `npm run lint`, and `npm run build`.
DONE 2026-07-24: sent-back truth + issuer section; Accept contract → existing set_task_status path; inline/text EvidencePanel using private signed URLs; stale-while-revalidate lists; modal ARIA/focus trap/LIFO Escape/material; issued+assigned archive ordered by approved_at; archived alarm removed; Dashboard StatsRow removed; reward debit feedback fixed. Evidence: tsc 0; Vitest 16 files/89 tests; lint 0 errors/3 pre-existing warnings; build pass.
NEXT: Michael browser/device smoke, then intentional commit. Do not merge/push `phase-b-client-rpcs` before proposal 012 SQL applies. Mode 2 rules and the Status Block apply.
