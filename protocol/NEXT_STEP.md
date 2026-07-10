# NEXT STEP — Bounty Hunter/main — updated 2026-07-11 (test-findings batch shipped)

## FOR YOU
1. **Paste the email templates into Supabase**: Dashboard → Authentication → Emails → "Confirm signup" gets `supabase/templates/confirm-signup.html`, "Magic Link" gets `supabase/templates/magic-link.html` (subjects suggested in each file's header comment).
2. **Check realtime publication**: Dashboard → Database → Publications → is `friendships` (ideally also `tasks`) in `supabase_realtime`? If not, add it — cross-client badge/list updates depend on it (same-client updates are fixed in code now).
3. **Re-test in the browser after the deploy** (fixes are pushed; confirm Vercel picked up the new commit): onboarding step 1 art + step 3 hover-reveal on desktop, signup → "Check your email" screen, invite empty-state button, requests badge clearing after accept, mission card with no description. Login page should now ALWAYS be guild teal when logged out — the yellow was stale device state, fixed.
4. **Finish the post-011 core loop test** (the part not yet done): submit proof → reject with reason → resubmit → approve (credits land once) → archive → delete, as two users.
5. Design directions wanted (not blocking): (a) mission-detail modal redesign — say what you want changed beyond the empty-box fix (candidate: mode hero art in the header); (b) empty-state artwork replacements (sword → bounty-board feel) via the image pipeline.
6. Still parked: sound audition; rotate the DB password (pasted in chat 2026-07-10).

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md (this file), memory/INDEX.md, memory/STATE.md.
Verify state: `git log --oneline -3` — expect on top of 55350c5: the 2026-07-11 commit "Live-test findings batch: theme-leak hardening + invite/onboarding/login UX fixes". `npx tsc -p tsconfig.app.json --noEmit` = 0 (protect; build does NOT typecheck pages); `npm run build` green; `npm test` green (14 files / 82 tests). Supabase LIVE on mvbmpcmexkgfairnthux (ap-south-1).
DONE 2026-07-11: Michael's first live 2-browser test findings all triaged and shipped. Theme-leak root-caused (codex): stale localStorage `bounty_theme='family'`, NOT the invite link — hardened via PUBLIC_THEME_IDS policy (themes.ts), ThemeProvider rewrite (profile authoritative, logout clears cache, fresh accounts normalized to guild), onboarding Next/Skip now persist, per-user onboarding flag (ftxGate stores user id). UX: Invite-someone button → share flow; friendships-changed window event fixes stale nav badge; onboarding column max-w-2xl + responsive hero; step-3 explainer redesigned workflow-first (hover/tap step reveals its fields); post-signup "Check your email" view; MissionModalShell empty-description fix; email templates in supabase/templates/ (dashboard paste pending).
PENDING MICHAEL: see FOR YOU above (email templates, realtime publication check, browser re-test, finish lifecycle test, modal/artwork design direction, sound audition, password rotation).
NEXT BUILD ITEM (either, no blocker): Phase B (create_task/update_task RPCs — drops the remaining creator-side client write policy) or Phase 5 ship vehicle (cap sync ios, device safe-areas, TestFlight — needs a Mac). If Michael gave modal/artwork direction, that design work can slot in first.
Mode 2 rules apply. One LOG line per step; checkpoint per Iron Rule 3; end checkpoints with the Status Block.
