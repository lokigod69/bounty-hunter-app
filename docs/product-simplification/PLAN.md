# One product, one workflow

Date: 2026-09-07. Baseline: `14c92a0` on main; clean tree; TypeScript clean and 355 tests pass.

## Outcome

A new user understands how to share a mission with someone they know, complete it, approve it, and receive the agreed reward. A spouse, relative, or friend is a person, not a separate account mode. Existing mission data, proof privacy, approval rules, and credit accounting stay compatible.

Michael delegated product/design decisions, implementation, verification, and pushing to main in this session. This pass uses protocol mode 1 within workstream main; the usual design selection checkpoint is waived by that direction. No production SQL is included in this pass.

## Evidence and decisions

- Three themes rename the same domain. Couple theme additionally hides the ordinary people list and locks reward recipients to `partner_user_id`. Delete that behavioral split. Offer the existing palettes as optional appearance settings, with the same mission/reward/credit vocabulary and people in every style.
- The initial wizard has a one-option mode step, duplicated invitation search, and a tutorial before the useful board. Replace it with one short explanation and an optional invite action; invitees should be connected before being asked to invite someone else.
- Five destinations are hidden behind a full-screen mobile menu. Use three persistent destinations: Missions, Rewards, People. Missions has For you / Sent by you views and a History link. Profile stays behind the avatar.
- Empty boards repeat three empty-state illustrations plus statistics and cross-promotions. Keep one useful empty state and hide empty secondary sections. Put review work first on the sent board. Keep completion history and existing celebration feedback.
- Mission creation makes description, deadline, and proof rules equally prominent with the task and recipient. Put optional details behind an expandable section. Keep both direct rewards and credits, explaining their different outcomes.
- Native invitations use `window.location.origin`, which becomes the private Capacitor origin. Build share links from the public HTTPS app URL. Preserve failed invitations and offer retry instead of deleting the token before success.
- No group/household permission model exists. Do not add group dashboards, relationship tags, or child-account promises without demonstrated need. The V1 model remains private exchanges between connected accounts. No AI image generation, new automation, or observability provider is necessary to simplify this workflow.

## Phases and acceptance

1. Preserve a visual contract using the current dark adventure identity with quieter hierarchy. Record implementation deltas; no full rebrand.
2. Simplify navigation, people, appearance, onboarding, boards, and mission form. Verify new-user and established-user states in the browser, at phone and desktop widths, including keyboard navigation and a non-English locale.
3. Fix invite correctness, review regressions, run TypeScript, tests, lint, build, and production dependency audit. Fixture-based UI verification is explicitly distinguished from live two-account Supabase verification.
4. Record code-proven release gaps and the smallest human-owned setup steps. Save memory/protocol, commit cohesive changes with rollback boundaries, and push main. Do not call an unsigned, untested native app release-ready.

## Reversibility

Keep the starting commit and use ordinary additive commits with the cohesive workflow implementation separate from its review/handoff documentation. No schema/data migrations or data deletion. Revert the relevant commit(s) to undo the new UX; stored themes, friendships, missions, rewards, and partner metadata remain readable.

## Acceptance — 2026-09-07

Phases 1–3 completed and checked. Evidence and release limits: RELEASE_REVIEW.md. Phase 4 handoff is recorded in memory and protocol; implementation and documentation commits preserve the baseline for rollback.
