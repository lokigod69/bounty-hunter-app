# Bounty Hunter Documentation Index

This index organizes all project documentation. New docs should go into `docs/` or an appropriate subfolder.

---

## Canonical V1 Docs

These are the authoritative specifications for V1:

| Document | Description |
|----------|-------------|
| [PRODUCT_VISION_V1.md](./PRODUCT_VISION_V1.md) | Core product vision, user personas, and feature priorities |
| [DESIGN_V1_BRIEF.md](./DESIGN_V1_BRIEF.md) | Visual design system, theme modes, and UI patterns |
| [ARCHITECTURE_FRONTEND.md](./ARCHITECTURE_FRONTEND.md) | React/TypeScript architecture, folder structure, patterns |
| [REALITY_SYNC_P1_P6.md](./REALITY_SYNC_P1_P6.md) | Phase 1-6 implementation status vs. vision |
| [V1_TESTING_CHECKLIST.md](./V1_TESTING_CHECKLIST.md) | Manual QA checklist for V1 release |

---

## Supplementary Technical Docs

Reference documentation for the codebase:

| Document | Description |
|----------|-------------|
| [overview.md](./overview.md) | High-level project overview |
| [architecture.md](./architecture.md) | Backend/Supabase architecture |
| [data-model.md](./data-model.md) | Database schema and relationships |
| [api-map.md](./api-map.md) | API endpoints and Supabase functions |
| [state-and-events.md](./state-and-events.md) | Frontend state management and event flow |
| [open-questions.md](./open-questions.md) | Open design questions and decisions |

---

## Runbooks (`docs/runbooks/`)

Operational guides for development and production:

| Document | Description |
|----------|-------------|
| [LOCAL_DEV_RUNBOOK.md](./runbooks/LOCAL_DEV_RUNBOOK.md) | Local development setup |
| [PROD_RUNBOOK_003.md](./runbooks/PROD_RUNBOOK_003.md) | Production deployment v003 |
| [PROD_RUNBOOK_004.md](./runbooks/PROD_RUNBOOK_004.md) | Production deployment v004 |
| [PROD_RUNBOOK_005.md](./runbooks/PROD_RUNBOOK_005.md) | Production deployment v005 |
| [PROD_RUNBOOK_006.md](./runbooks/PROD_RUNBOOK_006.md) | Production deployment v006 |
| [PROD_RUNBOOK_007.md](./runbooks/PROD_RUNBOOK_007.md) | Production deployment v007 |
| [PROD_RUNBOOK_008.md](./runbooks/PROD_RUNBOOK_008.md) | Production deployment v008 |

---

## History (`docs/history/`)

Change logs, session summaries, and bug analyses:

| Document | Description |
|----------|-------------|
| [2025-01-20_summary.md](./history/2025-01-20_summary.md) | Session summary |
| [2025-01-20-ui-refinement-summary.md](./history/2025-01-20-ui-refinement-summary.md) | UI refinement session |
| [2025-01-20-macro-ux-polish-summary.md](./history/2025-01-20-macro-ux-polish-summary.md) | UX polish session |
| [MOBILE_MODAL_BUG_ANALYSIS.md](./history/MOBILE_MODAL_BUG_ANALYSIS.md) | Modal z-index/portal bug analysis |
| [MOBILE_HAMBURGER_DEAD_ANALYSIS.md](./history/MOBILE_HAMBURGER_DEAD_ANALYSIS.md) | Mobile menu state bug analysis |
| [PHASE_10_INSTRUMENTATION_SUMMARY.md](./history/PHASE_10_INSTRUMENTATION_SUMMARY.md) | Debug instrumentation summary |

### Historical Planning Docs
| Document | Description |
|----------|-------------|
| [INSTRUCTIONS.md](./history/INSTRUCTIONS.md) | Original project instructions |
| [MANUAL_TASKS.md](./history/MANUAL_TASKS.md) | Original setup tasks |
| [TODO.md](./history/TODO.md) | Original implementation checklist |
| [plan.md](./history/plan.md) | Initial planning doc |
| [REAL_IMPLEMENTATION_PLAN.md](./history/REAL_IMPLEMENTATION_PLAN.md) | Implementation plan |
| [UI_UX_improvements_plan.md](./history/UI_UX_improvements_plan.md) | UX improvement plan |
| [bounty_hunter_mobile_modal_fix_ui_polish_plan_v_1.md](./history/bounty_hunter_mobile_modal_fix_ui_polish_plan_v_1.md) | Mobile fix plan |
| [PROPOSAL_003_STATUS.md](./history/PROPOSAL_003_STATUS.md) | Proposal status |
| [PROPOSAL_005_DASHBOARD_CHECKLIST.md](./history/PROPOSAL_005_DASHBOARD_CHECKLIST.md) | Dashboard checklist |
| [SCRIPTS_PATCHED.md](./history/SCRIPTS_PATCHED.md) | Script patches |
| [HOTFIX_COMPLETE.md](./history/HOTFIX_COMPLETE.md) | Hotfix summary |

---

## Status & Test Results

Current status tracking:

| Document | Description |
|----------|-------------|
| [V1_STATUS_ROSE_2025-12-02.md](./V1_STATUS_ROSE_2025-12-02.md) | Implementation status snapshot |
| [V1_TESTING_RESULTS_2025-12-02.md](./V1_TESTING_RESULTS_2025-12-02.md) | V1 checklist test results |

---

## Other Subfolders

- `docs/sql-inventory/` - Database schema validation and ERD docs
- `docs/proposals/` - Feature proposals
- `docs/backlog/` - Future feature ideas
- `docs/ios/` - iOS/Capacitor setup guides
- `docs/test-runs/` - Historical test run logs

---

## Adding New Docs

- **Canonical specs** → `docs/` root (keep it minimal)
- **Session summaries, bug analyses** → `docs/history/`
- **Runbooks and ops guides** → `docs/runbooks/`
- **Test results** → `docs/` root with dated filename
