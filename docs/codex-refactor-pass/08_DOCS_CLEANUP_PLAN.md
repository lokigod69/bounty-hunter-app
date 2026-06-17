# Docs Cleanup Plan

## Do Not Delete Yet

- `docs/history/*`
- `docs/gpt55-handoff/*`
- `docs/runbooks/PROD_RUNBOOK_*`
- `docs/sql-inventory/*`
- `_archive/*`

These may contain useful archaeology. They are not current truth.

## Preferred Structure

- Current entry points:
  - `SAYA_USAGE.md`
  - `README.md`
  - `docs/codex-refactor-pass/00_REFACTOR_PASS_INDEX.md`
- Current implementation/runbooks:
  - `docs/codex-refactor-pass/*`
  - `docs/runbooks/*` after refresh
- Historical reports:
  - Keep under `docs/history`
  - Keep GPT-5.5 handoff under `docs/gpt55-handoff`
- SQL proposals:
  - Keep under `db/proposals`
  - Promote only reviewed SQL into `supabase/migrations`

## Next Cleanup Steps

1. Update `docs/INDEX.md` to put `docs/codex-refactor-pass` at the top.
2. Mark old V1 status reports as historical snapshots.
3. Refresh `docs/runbooks/LOCAL_DEV_RUNBOOK.md` to use port `6075` and current migration notes.
4. Add a small `docs/history/README.md` explaining that reports there are not current truth.
5. Do not move code/config/migration files as part of documentation cleanup.
