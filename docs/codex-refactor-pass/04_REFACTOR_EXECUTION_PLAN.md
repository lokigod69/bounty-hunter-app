# Refactor Execution Plan

## Tier A - Safe / High Confidence

Completed or targeted in this pass:

- Fix lint errors from unused imports/locals.
- Add `.env.example`.
- Create current refactor-pass docs.
- Update root README/Saya/Codex docs.
- Stop browser-side `user_credits` upsert initialization.
- Add non-destructive migration to remove direct client credit writes and allow collected-reward reads.
- Document assigned frontend port `6075`.
- Clear production dependency audit with `npm audit fix`.

Still Tier A:

- Fix build warning for unresolved `/img/C1.jpg` after confirming whether the asset is intended.
- Remove obvious stale imports/comments only where touched.

## Tier B - Medium Refactor

Safe next work with focused verification:

- Replace task direct status updates with named RPCs for submit/reject/archive.
- Align proof file support across UI, domain validation, and DB constraints.
- Regenerate Supabase DB types after confirming intended migration state.
- Consolidate reward hooks around `src/domain/rewards.ts`.
- Add focused tests for pure domain rules.
- Create storage bucket/policy migration after deciding public/private proof behavior.
- Require auth and server-side lookup in notification Edge Functions or undeploy unused functions.
- Batch profile lookups in friends/rewards hooks.

## Tier C - Heavy Refactor

Document for future Saya review:

- Full mission service/repository extraction.
- Reworking task RLS with column-level safety and RPC-only lifecycle.
- Data model changes for audit logs, redemption history, recurring missions, and onboarding state.
- Public launch payments/subscriptions.
- iOS/PWA production polish.
- Large UI rewrite or route-level code splitting.

## Decision

This pass implements Tier A and limited Tier B where risk is controlled. Tier C is deferred.
