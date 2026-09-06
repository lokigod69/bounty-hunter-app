# Bounty Hunter board — 2026-09-07

## Ready to try

**All three skins are implemented.** Preview: http://127.0.0.1:6077/ (sample data), avatar → Appearance. B — Forged is open; A — Starlight and C — Astral are immediately selectable. No setup needed.

| Workstream | Completed | Next | Status |
|---|---|---|---|
| main | A/B/C skins, readable credit values, aligned panels/actions and short rim glints (59c29e2); browser/gates pass | User tries skins, then release/security/iPhone work | Visual milestone ready |

Source 59c29e2 is independently reversible; selecting A keeps the shared readability/layout fixes. Two new frame assets total 49,958 bytes. 345 tests/29 files, clean types/build, 0 lint errors/3 existing warnings. Evidence: design/rounds/round-03/verification/README.md.

Release backlog: docs/product-simplification/RELEASE_REVIEW.md. Live migration reconciliation, account deletion/privacy/abuse controls, actual push/native invitations, auth/email verification and Mac/iPhone/TestFlight work remain. No database or service configuration changed in this pass.
