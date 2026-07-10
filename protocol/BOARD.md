# BOARD — Bounty Hunter — updated 2026-07-11

## ⚠️ WAITING ON YOU
- **Paste the branded email templates** into Supabase Dashboard → Authentication → Emails (files: `supabase/templates/confirm-signup.html`, `magic-link.html`).
- **Check the realtime publication** (Dashboard → Database → Publications): `friendships` should be in `supabase_realtime` for cross-client badge updates; add `tasks` too if missing.
- **Browser re-test the shipped fixes** (after confirming Vercel picked up the new commit): onboarding step 1 art + step 3 hover-reveal, signup "Check your email" screen, invite empty-state button, requests badge clears on accept, empty-description mission modal. Logged-out pages are always guild teal now.
- **Finish the post-011 core loop** as two users: submit → reject → resubmit → approve (credits once) → archive → delete — the RPC paths are still runtime-untested.
- Design direction (not blocking): mission-modal redesign wishes; empty-state artwork replacement go/no-go.
- Sound audition; rotate the DB password (pasted in chat 2026-07-10).

## Workstreams
| Workstream | Phase/Gate | Last done | Next | State |
|---|---|---|---|---|
| main | Premium V1 polish — 011 live; first live-test findings batch shipped | Jul 11: theme-leak hardened, invite/onboarding/login UX fixes, 82 tests green | YOU re-test + finish core loop; then Phase B RPCs or Phase 5 ship vehicle (or modal/artwork design if directed) | 🟢 active |

## Standing decisions parked for you (not blocking yet)
- Mission-detail modal design direction + empty-state artwork taste call (2026-07-11).
- Prod SQL go/no-go whenever a runbook comes up — backup + your review required, always.
- ~~Noun system~~ DECIDED 2026-07-07: Mission/Chore/Request; store items = Rewards; "Bounty" = mission credit pot.
- ~~Proof types~~ DECIDED 2026-07-07: PDF/text/private all allowed.

## Recently finished (last 5)
- 2026-07-11 **Live-test findings batch**: theme-leak root-caused via codex (stale device localStorage, not the invite link) + hardened (PUBLIC_THEME_IDS policy, ThemeProvider rewrite, per-user onboarding flag); Invite-someone button fixed, stale requests badge fixed, onboarding layout + step-3 workflow-first redesign, post-signup check-your-email view, modal empty-description fix, email templates authored; tsc 0 / 82 tests / build green
- 2026-07-10 **Proposal 011 APPLIED to production + shipped**: Michael ran the runbook live (backup verified, apply clean, pushed, post-validated); 5 RPCs live, broad assignee UPDATE policies dropped, proof_type constraint widened; database.ts regenerated, overlay removed
- 2026-07-10 **Proposal 011 approved + finalized + client refactor committed**: A–D decided; delete-flow storage cleanup reordered BEFORE the RPC (bucket delete policy joins the tasks row)
- 2026-07-10 **Apple-design pass applied** (docs/premium-v1/APPLE_DESIGN_AUDIT.md): instant press response, touch-action everywhere tappable, press states on TaskCard/Fab/RewardCard, mirrored modal easing, reduced-motion/-transparency coverage
- 2026-07-08 **DB types regen + typecheck clean (fcb830d)**: database.ts regenerated (UTF-8), tsc 15→0; PDF/video proof-validation bug fixed
