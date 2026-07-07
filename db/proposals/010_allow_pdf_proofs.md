# Proposal 010: Allow PDF proofs in the bounty-proofs storage bucket

**Status**: 🟢 Ready — awaiting backup + Michael's go (Supabase currently PAUSED)
**Priority**: P2 (feature: PDF/text/private proofs allowed per Michael's decision)
**Estimated Time**: 2 minutes
**Risk Level**: Very Low (widens an allowlist; no data touched, no table changes)

---

## Context

Michael decided: **PDF proofs, text-only proofs, and private proofs are allowed.**
Recon found the three proof-type layers disagreed:

1. **Client dropzone** ([src/lib/proofConfig.ts](../../src/lib/proofConfig.ts)) already
   offered `.pdf` in `PROOF_ALLOWED_FILE_TYPES` and said "PNG, JPG, or PDF" —
   but did not offer the video types the bucket allows.
2. **Domain validation** ([src/domain/missions.ts](../../src/domain/missions.ts)
   `uploadProof`) only accepted `file.type` starting with `image/` or `video/`,
   so a PDF selected in the dropzone was rejected here anyway.
3. **Storage bucket** (`bounty-proofs`, set in
   [20260611120000_storage_buckets_and_policies.sql](../../supabase/migrations/20260611120000_storage_buckets_and_policies.sql))
   only allowed `image/jpeg|jpg|png|gif|webp` and `video/mp4|quicktime|webm` —
   **no `application/pdf`** — so even if the domain check were fixed, Supabase
   Storage would still reject the upload.

Text-only proofs already work end-to-end (`proof_type = 'text'`,
`proof_description` column) — no schema change needed for those. Private
proofs need no schema change either: `bounty-proofs` objects are already
readable only by the task's `assigned_to` / `created_by` users via the
existing `storage.objects` RLS policies (see the same migration) — see "Open
question" below on what "private proof" would add beyond that.

This proposal only closes the storage-layer gap for PDFs.

### Change

```sql
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf'
]
where id = 'bounty-proofs';
```

Migration file: [supabase/migrations/20260707221000_allow_pdf_proofs.sql](../../supabase/migrations/20260707221000_allow_pdf_proofs.sql)

The `file_size_limit` (10 MB) is unchanged — it already matches
`PROOF_MAX_FILE_SIZE` in `src/lib/proofConfig.ts`.

---

## App-side changes landing alongside this (same PR, no SQL involved)

- `src/lib/proofConfig.ts`: dropzone now also accepts `video/mp4`,
  `video/quicktime`, `video/webm` (matching what the bucket already allowed
  but the dropzone never offered), plus a shared `PROOF_ACCEPTED_TYPES_LABEL`
  used in `ProofModal.tsx`'s helper text and error message.
- `src/types/custom.ts`: `ProofType` widened to
  `'text' | 'url' | 'image' | 'video' | 'document'` to represent what
  `uploadProof()` actually writes to `tasks.proof_type` today (it already
  produces `'video'`; a PDF should produce `'document'`).
- **Not yet landed** (owned by a parallel agent editing `src/domain/missions.ts`):
  `uploadProof`'s file-type check needs to allow `application/pdf` and map it
  to `proof_type: 'document'`. See the orchestrator note for the exact diff.
  Proof review UI needs no change — `TaskCard.tsx`'s `renderProofLink` already
  renders any `proof_url` as a plain "View Submitted Proof" link regardless of
  MIME type (no inline `<img>`/`<video>` preview exists today), so a PDF link
  opens correctly in a new tab as-is.

---

## Risk Analysis

- **Blast radius**: `storage.buckets` row for `bounty-proofs` only; no table
  schema, no RLS policy change (the existing `storage.objects` policies for
  `bounty-proofs` already gate by `assigned_to` / `created_by`, independent of
  MIME type).
- **Data loss risk**: None — this only widens an allowlist used at upload
  time; it does not touch existing rows or objects.
- **Idempotent**: The `UPDATE` re-sets the full array each time; re-running it
  is a no-op after the first apply.
- **Rollback**: Trivial — re-run the same `UPDATE` with `application/pdf`
  removed from the array (see SQL DOWN below).

---

## Deploy ordering & graceful degradation

Supabase is **PAUSED**. This SQL must be applied during/after the restore
(see [docs/runbooks/SUPABASE_RESTORE_CHECKLIST.md](../../docs/runbooks/SUPABASE_RESTORE_CHECKLIST.md)),
with a backup taken first.

Because the storage-bucket change and the Vercel code deploy are decoupled:

- If the app code (dropzone + domain check) ships **before** this migration
  is applied, a user selecting a PDF will pass client-side validation and the
  (to-be-updated) domain check, then get a Supabase Storage error on actual
  upload (`mime type application/pdf is not supported`) — a clear, surfaced
  error, not silent data corruption.
- If this migration is applied **before** the code ships, nothing changes
  user-visibly yet, since the dropzone/domain layers still reject PDFs until
  their code lands.

Either order is safe; applying this migration first is preferred so PDFs work
immediately once the code deploy lands.

---

## SQL DOWN (rollback)

```sql
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm'
]
where id = 'bounty-proofs';
```

---

## Open question for the board: "private proof"

Michael's decision also lists "private proofs" as allowed, but the semantics
are undefined. Two different things could be meant:

1. **Already true today**: proof files/URLs in `bounty-proofs` are only
   readable by the task's assignee and creator (never public, never other
   users) — this is already enforced by the `storage.objects` RLS policies in
   `20260611120000_storage_buckets_and_policies.sql`. If this is what "private
   proof" means, no further work is needed.
2. **A new capability**: e.g. a proof visible only to the creator and
   deliberately hidden from other assignees on a shared/recurring task, or a
   proof that's exempt from some future "public proof gallery" feature, or a
   toggle the assignee controls at submission time. None of this exists today
   and there's no `is_private` / visibility column on `tasks` proof fields.

Recommend putting this on the board as a product-definition question before
any schema/code work is scoped for it.

---

## Approval Checklist

- [ ] Backup taken (per `docs/runbooks/`)
- [ ] Applied during/after Supabase restore
- [ ] `src/domain/missions.ts` `uploadProof` PDF/`'document'` change landed
      (see orchestrator note — owned by a parallel agent)

**Created**: 2026-07-07
**Author**: Proof-type congruence agent
**Review Status**: Pending Michael's go
