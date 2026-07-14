# BOARD — Bounty Hunter — updated 2026-07-14

## ⚠️ WAITING ON YOU
- **Paste the branded email templates** — Dashboard → Authentication → Emails → **Templates tab** (not SMTP Settings): "Confirm signup" ← `supabase/templates/confirm-signup.html`, "Magic Link" ← `supabase/templates/magic-link.html` (subjects in each file's header comment). If the "domain verified" was an email-sending domain, do one fresh signup afterward to confirm the styled mail arrives from it.
- **Check the realtime publication** (Dashboard → Database → Publications → `supabase_realtime`): `friendships` should be in it for cross-client badge updates; add `tasks` too if missing.
- **Browser re-test after Vercel deploys 4dc0ab7**: mission modal hero art + new empty bounty board (from 5098679), plus NEW: "View Submitted Proof" must open the file for both creator and assignee (proof links were dead until this batch — private bucket, now signed URLs).
- **Finish the post-011 core loop** as two users: submit proof (file!) → view proof both sides → reject → resubmit → approve (credits once) → archive → delete — first runtime test of the RPC paths AND the signed proof links.
- Sound audition; rotate the DB password (pasted in chat 2026-07-10); taste-call: refresh remaining empty-state art (chest/pedestal/horn) too, or keep.

## Workstreams
| Workstream | Phase/Gate | Last done | Next | State |
|---|---|---|---|---|
| main | Premium V1 polish — 011 live; bug-hunt batch shipped (4dc0ab7) | Jul 14: build hygiene (vendor chunk split, warnings zeroed) + codex bug-hunt → 11 verified fixes incl. dead private proof links; tsc 0 / 82 tests / build clean | YOU: templates paste, realtime check, two-user lifecycle test incl. proof links; then Phase B RPCs, deferred bug-hunt findings, or Phase 5 ship vehicle (needs Mac) | 🟢 active |

## Standing decisions parked for you (not blocking yet)
- ~~Mission-detail modal design direction + empty-state artwork~~ SHIPPED 2026-07-11 (5098679): hero-art headers + bounty-board empty state; eyeball pending. Residual taste-call: refresh the other empty-state art too, or keep.
- Prod SQL go/no-go whenever a runbook comes up — backup + your review required, always.
- ~~Noun system~~ DECIDED 2026-07-07: Mission/Chore/Request; store items = Rewards; "Bounty" = mission credit pot.
- ~~Proof types~~ DECIDED 2026-07-07: PDF/text/private all allowed.

## Recently finished (last 5)
- 2026-07-14 **Codex bug-hunt + verified fix batch (4dc0ab7)**: headline — file proofs were unviewable (private bucket vs public URLs), now signed at render; false-success create/edit/archive paths fixed; proof-object lifecycle cleanup (delete aborts on failed cleanup, submit/reject clean up); logout/native-auth error handling; i18n gaps. 11 of 15 findings fixed, 4 deferred with notes; tsc 0 / 82 tests / build clean
- 2026-07-14 **Build hygiene + docs refresh (fa0d3bf, 585591a)**: vite vendor chunk split (main 722→388 kB, warnings zeroed), mixed rewards-import fixed, css mojibake repaired; README/CODEX_NEXT_STEPS de-staled
- 2026-07-11 **Design pass (5098679)**: mode hero art full-bleed in MissionModalShell headers (scrim + accent wash + shadows, per-mode focal crop); empty-missions art regenerated via codex pipeline (sword → empty bounty board, torn scraps, true alpha); tsc 0 / 82 tests / build green, pushed
- 2026-07-11 **Live-test findings batch**: theme-leak root-caused via codex (stale device localStorage, not the invite link) + hardened (PUBLIC_THEME_IDS policy, ThemeProvider rewrite, per-user onboarding flag); Invite-someone button fixed, stale requests badge fixed, onboarding layout + step-3 workflow-first redesign, post-signup check-your-email view, modal empty-description fix, email templates authored; tsc 0 / 82 tests / build green
- 2026-07-10 **Proposal 011 APPLIED to production + shipped**: Michael ran the runbook live (backup verified, apply clean, pushed, post-validated); 5 RPCs live, broad assignee UPDATE policies dropped, proof_type constraint widened; database.ts regenerated, overlay removed
