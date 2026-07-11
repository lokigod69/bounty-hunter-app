# BOARD — Bounty Hunter — updated 2026-07-11

## ⚠️ WAITING ON YOU
- **Paste the branded email templates** — Dashboard → Authentication → Emails → **Templates tab** (not SMTP Settings): "Confirm signup" ← `supabase/templates/confirm-signup.html`, "Magic Link" ← `supabase/templates/magic-link.html` (subjects in each file's header comment).
- **Check the realtime publication** (Dashboard → Database → Publications → `supabase_realtime`): `friendships` should be in it for cross-client badge updates; add `tasks` too if missing.
- **Browser re-test after Vercel deploys 5098679**: mission modal header now shows mode hero art; empty inbox shows the new bounty board (sword gone). Plus previous batch: onboarding step 1 art + step 3 hover-reveal, "Check your email" view, invite button, requests badge, always-teal logged-out pages.
- **Finish the post-011 core loop** as two users: submit → reject → resubmit → approve (credits once) → archive → delete — the RPC paths are still runtime-untested.
- Sound audition; rotate the DB password (pasted in chat 2026-07-10); taste-call: refresh remaining empty-state art (chest/pedestal/horn) too, or keep.

## Workstreams
| Workstream | Phase/Gate | Last done | Next | State |
|---|---|---|---|---|
| main | Premium V1 polish — 011 live; design pass shipped (5098679) | Jul 11: modal hero headers + bounty-board empty state via codex pipeline; tsc 0 / 82 tests / build green | YOU: templates paste, realtime check, re-test incl. new art, finish core loop; then Phase B RPCs or Phase 5 ship vehicle | 🟢 active |

## Standing decisions parked for you (not blocking yet)
- ~~Mission-detail modal design direction + empty-state artwork~~ SHIPPED 2026-07-11 (5098679): hero-art headers + bounty-board empty state; eyeball pending. Residual taste-call: refresh the other empty-state art too, or keep.
- Prod SQL go/no-go whenever a runbook comes up — backup + your review required, always.
- ~~Noun system~~ DECIDED 2026-07-07: Mission/Chore/Request; store items = Rewards; "Bounty" = mission credit pot.
- ~~Proof types~~ DECIDED 2026-07-07: PDF/text/private all allowed.

## Recently finished (last 5)
- 2026-07-11 **Design pass (5098679)**: mode hero art full-bleed in MissionModalShell headers (scrim + accent wash + shadows, per-mode focal crop); empty-missions art regenerated via codex pipeline (sword → empty bounty board, torn scraps, true alpha); tsc 0 / 82 tests / build green, pushed
- 2026-07-11 **Live-test findings batch**: theme-leak root-caused via codex (stale device localStorage, not the invite link) + hardened (PUBLIC_THEME_IDS policy, ThemeProvider rewrite, per-user onboarding flag); Invite-someone button fixed, stale requests badge fixed, onboarding layout + step-3 workflow-first redesign, post-signup check-your-email view, modal empty-description fix, email templates authored; tsc 0 / 82 tests / build green
- 2026-07-10 **Proposal 011 APPLIED to production + shipped**: Michael ran the runbook live (backup verified, apply clean, pushed, post-validated); 5 RPCs live, broad assignee UPDATE policies dropped, proof_type constraint widened; database.ts regenerated, overlay removed
- 2026-07-10 **Proposal 011 approved + finalized + client refactor committed**: A–D decided; delete-flow storage cleanup reordered BEFORE the RPC (bucket delete policy joins the tasks row)
- 2026-07-10 **Apple-design pass applied** (docs/premium-v1/APPLE_DESIGN_AUDIT.md): instant press response, touch-action everywhere tappable, press states on TaskCard/Fab/RewardCard, mirrored modal easing, reduced-motion/-transparency coverage
