# Codex Next Steps

1. Verify Supabase clean reset and migration order.
   - Effort: medium
   - Risk: high
   - AI unsupervised: local only
   - Saya review: required before production

2. Add storage bucket/policy migration for `avatars`, `bounty-proofs`, and `reward-images`.
   - Effort: medium
   - Risk: high
   - AI unsupervised: draft only
   - Saya review: required

3. ✅ DONE 2026-07-10. Align proof types across UI, domain validation, and DB constraints.
   - Product decision 2026-07-07: PDF/text/private all allowed. Proposal 011 set `tasks_proof_type_check` to image/video/document/text; domain validation fixed 2026-07-08 (fcb830d).

4. ✅ MOSTLY DONE 2026-07-10 (proposal 011 applied to prod). Move task lifecycle writes into server RPCs.
   - submit/reject/start-stop/archive/delete are RPC-authoritative. REMAINING: Phase B — create_task/update_task RPCs to drop the last creator-side client write policy.

5. ✅ DONE 2026-07-08 + regenerated post-011 2026-07-10. Regenerate Supabase database types.

6. Add focused automated tests for domain rules and reward purchase response mapping.
   - Effort: medium
   - Risk: low
   - AI unsupervised: yes
   - Saya review: optional

7. Harden or undeploy legacy Gmail notification Edge Functions.
   - Effort: medium
   - Risk: medium
   - AI unsupervised: draft yes, deploy no
   - Saya review: required

8. ✅ DONE 2026-07-14 (commit fa0d3bf). Fix remaining build warnings: unresolved `/img/C1.jpg`, large bundle, and mixed reward-domain import.
   - C1.jpg reference had already been removed in an earlier pass; bundle split via vite manualChunks (main chunk 722→388 kB); mixed import fixed by making useRewardsStore's dynamic imports static. Build is now warning-free.
