# Bounty Hunter board — 2026-09-07

| Workstream | Completed | Next | Status |
| --- | --- | --- | --- |
| main / visual | Source b89bfe8: actual shared 0–9 metal artwork inside solid A/B/C tokens; equal form choices and preview Claim/Used/Undo remain | User tries sample preview 6078 | Pushed; Vercel deployment completed |
| main / security | Source 138f2f4: tested client/service changes and SQL 016/017/018 | Verified backup, explicit SQL review/go, ordered hosted checks | Backend staged, not applied |
| main / release | Native/www auth callbacks configured; service inventory and hosting checked | Operator/support/Apple inputs; privacy/abuse/push engineering, Mac/iPhone/TestFlight | Not release-ready |

Current UI gates: 415 tests / 34 files; app TypeScript/build pass; lint 0 errors / 3 existing warnings; no preview code in production JS. Round-06 browser desktop/360px A/B/C, German 12.500, accessible amount, keyboard selection and collection verified. Source b89bfe8 Vercel deployment completed; hosted /login HTTP200/CSP/DENY and script match checked.

Earlier security pass: 149 isolated PostgreSQL checks, Deno and audit passed. They do not establish live protection. Account deletion remains hidden until verified backend rollout. Details/owner prerequisites: ../docs/release/RELEASE_STATUS.md. Current handoff: NEXT_STEP.md.
