# Proposal 009: Add rejection_reason to tasks

**Status**: 🟢 Ready — awaiting backup + Michael's go (Supabase currently PAUSED)
**Priority**: P2 (feature: Phase 2.3 rejection loop)
**Estimated Time**: 2 minutes
**Risk Level**: Very Low (additive nullable column, no default, no constraint)

---

## Context

### Current State
- **Table**: `public.tasks`
- **Behavior today**: Rejecting a submitted proof (`rejectMission` in
  [src/domain/missions.ts](../../src/domain/missions.ts)) sets `status = 'pending'`
  and clears `proof_url` / `proof_type`. The assignee sees the task flip back to
  "Open" with no reason and no visible "rejected" state.
- **Roadmap**: Phase 2.3 (see [docs/premium-v1/ROADMAP.md](../../docs/premium-v1/ROADMAP.md#phase-2))
  asks for a reason field + a "Rejected — resubmit" state on the assignee card.

### Change
Add one nullable column so the app can persist an optional rejection reason:

```sql
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
```

`status` is already a plain `text` column (no enum), so persisting `'rejected'`
needs **no** schema change — only this reason column is new.

Migration file: [supabase/migrations/20260707220000_add_rejection_reason.sql](../../supabase/migrations/20260707220000_add_rejection_reason.sql)

---

## Risk Analysis

- **Blast radius**: `tasks` table only; single new nullable column.
- **Data loss risk**: None — no data is modified, no default backfill.
- **Existing reads/writes**: Unaffected — `SELECT *` simply returns an extra
  `null` column; existing inserts/updates never reference it.
- **Rollback**: Trivial (`ALTER TABLE ... DROP COLUMN rejection_reason`).

---

## Deploy ordering & graceful degradation

Supabase is **PAUSED**. This SQL must be applied during/after the restore,
ideally **before** the Phase 2.3 code deploys via Vercel from `main`.

Because the two events are decoupled (Vercel deploy vs. manual SQL apply), the
app code is written to **tolerate the column being absent**:

- `rejectMission` attempts the update including `rejection_reason`. If Postgres
  returns error code `42703` (undefined column), it retries the identical update
  **without** `rejection_reason` (so `status = 'rejected'` still lands) and
  `console.warn`s once.
- `uploadProof` (resubmit path) clears `rejection_reason` with the same
  42703-tolerant retry.

So: if the code ships first, rejection still works (just no stored reason);
once this column exists, reasons persist with no code change.

---

## SQL DOWN (rollback)

```sql
ALTER TABLE public.tasks
DROP COLUMN IF EXISTS rejection_reason;
```

---

## Approval Checklist

- [ ] Backup taken (per `docs/runbooks/`)
- [ ] Applied during/after Supabase restore
- [ ] `src/types/database.ts` regenerated (a `rejection_reason` entry was added
      manually to unblock TS; regeneration is already a tracked pending item)

**Created**: 2026-07-07
**Author**: Phase 2.3 implementation agent
**Review Status**: Pending Michael's go
