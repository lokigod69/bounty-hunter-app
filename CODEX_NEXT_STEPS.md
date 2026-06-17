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

3. Align proof types across UI, domain validation, and DB constraints.
   - Effort: medium
   - Risk: medium
   - AI unsupervised: yes with tests
   - Saya review: product decision needed for PDF/text/private proof

4. Move task lifecycle writes into server RPCs.
   - Effort: high
   - Risk: high
   - AI unsupervised: no
   - Saya review: required

5. Regenerate Supabase database types.
   - Effort: low
   - Risk: medium
   - AI unsupervised: yes after DB source is confirmed
   - Saya review: if production schema differs

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

8. Fix remaining build warnings: unresolved `/img/C1.jpg`, large bundle, and mixed reward-domain import.
   - Effort: low-medium
   - Risk: low
   - AI unsupervised: yes
   - Saya review: optional
