# Bounty Hunter board — 2026-09-07

**Owner gates:** secure production backup (double-click backup-release.bat), named Saya review + explicit SQL go; public support email/operator name; Apple enrollment/Mac/iPhone. No passwords in chat. Backend protection is staged, not live; the app is not release-ready.

| Workstream | Completed | Next | Status |
| --- | --- | --- | --- |
| main / visual | 95b2e83: hammered Forged and faceted Astral rims, unchanged shared numeral art/Starlight | Try sample preview 6078 | Pushed; web delivery verified |
| main / security | fa34d0d: private profile projections, account-switch isolation, block/report UI+019, guarded schema/ACL backup and real restore tests | Backup/review; ordered 016 → 017 → 018 → 019 hosted acceptance | Backend staged; both feature flags off |
| main / release | Native/www callbacks configured earlier, service inventory and hosting verified | Operator/support pages and report process; SMTP, actual push, Mac/iPhone/TestFlight | Requires engineering and owner access |

Current gates: 428 tests/38 files, app types/build, lint 0 errors/3 existing warnings, production audit 0; 111+81 local PostgreSQL assertions plus backup restore/negative cases and races; notification Deno check. Browser verifies local report receipt, block/balance, unblock without reconnect and 360px scrollable safety. Fixture/production bundle isolation passes.

Vercel source fa34d0d deployment 69zXVkBvAkmQ98NmSHAFfxWoyXZJ completed; hosted /login HTTP200/response policy and index-DUrEiTNB.js match. No SQL/Edge rollout, successful live block/report/deletion/mail action or iPhone test occurred. Details: ../docs/release/RELEASE_STATUS.md. Current handoff: NEXT_STEP.md.
