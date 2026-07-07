-- Allow PDF proofs in the 'bounty-proofs' storage bucket.
--
-- Context: Michael decided PDF proofs, text-only proofs, and private proofs
-- are allowed. Text-only proofs already work end-to-end (proof_type 'text').
-- Private proofs need no schema change (proofs are already visible only to
-- the task's creator + assignee via the existing storage.objects policies
-- in 20260611120000_storage_buckets_and_policies.sql).
--
-- PDF proofs, however, were rejected at the storage layer: the bucket's
-- allowed_mime_types list (set in 20260611120000_storage_buckets_and_policies.sql)
-- only included image/* and video/* types, even though the client dropzone
-- (src/lib/proofConfig.ts) already offered ".pdf" as an option. This migration
-- adds 'application/pdf' to the bucket's allowlist so an uploaded PDF is not
-- silently rejected by Supabase Storage.
--
-- This UPDATE is idempotent: it re-sets the full allowed_mime_types array
-- (existing types + application/pdf) rather than appending, so re-running it
-- is a no-op after the first apply.
--
-- NOTE: Supabase is currently PAUSED. This must be applied during/after the
-- project restore (see docs/runbooks/SUPABASE_RESTORE_CHECKLIST.md), with a
-- backup taken first per docs/runbooks/ conventions. See
-- db/proposals/010_allow_pdf_proofs.md for the full proposal.

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
