# Bounty Hunter board — 2026-09-07

## Owner involvement
No action needed for the completed UX changes. Release requires access to Apple/Mac/iPhone, Supabase/hosting, chosen public origin/support contact, and email sender domain. Do not paste credentials into chat.

| Workstream | Completed | Next | Status |
|---|---|---|---|
| main | One workflow; 3 destinations; optional appearance/details; people shortcuts; invite/proof/native auth fixes; 340 tests pass; browser evidence | Release/security implementation and live/device verification | UX complete; public iOS release blocked |

Engineering still owes account deletion, privacy/support/report/block flows, actual push and native invite handoff. These are not merely environment variables. Current live 014/015 state is unverified; July findings need reconciliation and the reviewed backup/runbook process. Mac signing and a real-device pass are still required. See docs/product-simplification/RELEASE_REVIEW.md for evidence and responsibilities.

No production data or SQL changed. Baseline 14c92a0 is preserved for rollback. Previous August release plan and detailed milestones remain in protocol/LOG.md and memory/LOG.md; current action source is NEXT_STEP.md.
