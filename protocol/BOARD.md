# Bounty Hunter board — 2026-09-07

| Workstream | Completed | Next | Status |
| --- | --- | --- | --- |
| main / visual | A/B/C panel, control and circular portrait coverage; mobile/German/browser proof; source cdc1570 | User tries sample preview 6078 | Complete and deployed |
| main / security | Source 138f2f4: client/header/dependency/email fixes; tested 016/017/018 access and deletion proposals | Verified backup, explicit SQL review/go, ordered hosted smoke checks | Backend staged, not applied |
| main / release | Auth callback allowlist repaired; public native invitation origin; Resend/SMTP/function inventory; hosted build checked | Operator/support/Apple inputs, remaining privacy/abuse/push engineering and Mac/iPhone/TestFlight | Not release-ready |

407 tests/33 files, app TypeScript/build, Deno and zero-vulnerability audit pass; lint 0 errors/3 existing warnings. 149 real local PostgreSQL checks. Vercel production deployment dpl_HKWzvFctDtABwGwopsLqRVUZ29xF is Ready. Source and staged backend must not be confused with live protection.

Current handoff: NEXT_STEP.md. Detailed evidence/owner actions: ../docs/release/RELEASE_STATUS.md. Artwork can be reverted independently; SQL review/backup gates remain. Account-deletion UI is hidden until verified backend rollout.
