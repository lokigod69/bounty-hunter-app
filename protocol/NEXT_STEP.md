# NEXT STEP — Bounty Hunter/main — updated 2026-07-14 (bug-hunt batch shipped: proof links were dead, now signed)

## FOR YOU
1. **Email templates** — Dashboard → Authentication → Emails → **Templates tab**: "Confirm signup" ← paste `supabase/templates/confirm-signup.html` (subject: "Confirm your email — Bounty Hunter"), "Magic Link" ← `supabase/templates/magic-link.html` (subject: "Your sign-in link — Bounty Hunter"). Since your domain is verified: do one fresh signup after and check the styled mail arrives from it. (If the verified domain was the app/Vercel domain instead: Authentication → URL Configuration → Site URL + Redirect URLs must list it.)
2. **Realtime publication** — Dashboard → Database → Publications → `supabase_realtime`: toggle `friendships` on (add `tasks` too) so cross-browser badge updates work.
3. **Two-user lifecycle test on prod** (after Vercel deploys 4dc0ab7): create mission with proof required → submit a PHOTO proof → **"View Submitted Proof" must open it on BOTH sides** (it was broken until today — private bucket, links are now signed) → reject with reason → resubmit → approve (credits land once) → archive → delete. Also eyeball the Jul-11 art (modal hero headers, empty bounty board).
4. Parked: sound audition; rotate the DB password (pasted in chat 2026-07-10); taste-call on refreshing the remaining empty-state art (chest/pedestal/horn).

## PASTE THIS
Resume Bounty Hunter, workstream main, under protocol-os.
Read protocol/PROTOCOL.md, protocol/NEXT_STEP.md (this file), memory/INDEX.md, memory/STATE.md.
Verify state: `git log --oneline -3` — expect "Session bookkeeping" on top of 4dc0ab7 "Bug-fix batch from codex hunt" on top of ef569f4. `npx tsc -p tsconfig.app.json --noEmit` = 0 (protect; build does NOT typecheck pages); `npm run build` green 0 warnings; `npm test` green (14 files / 82 tests). Supabase LIVE on mvbmpcmexkgfairnthux (ap-south-1).
DONE 2026-07-14: build hygiene (fa0d3bf: vite vendor manualChunks, main chunk 722→388 kB, all build warnings zeroed; route-lazy-loading deliberately skipped — see DECISIONS) + codex bug-hunt (15 findings) → 11 verified + fixed (4dc0ab7). Headline: bounty-proofs is a private bucket but proofs stored getPublicUrl links — every file proof was unviewable; ProofLink in TaskCard now signs the path for 1h at render (stored URL format unchanged). Also fixed: false-success create/edit/archive (form/modal closed on failure), delete aborts when proof cleanup fails, failed submit + successful reject clean their storage objects, logout local-scope fallback, native-link {error} checks, i18n keys (loadingContracts en/de, imageUrlError/Placeholder en/de, languageSwitcher de).
DEFERRED bug-hunt findings (build-item candidate): profileBootstrap error-swallowing (offline existing user → onboarding), ftxGate stale-request/session-switch races, Login-flow i18n bypass — details in memory/LOG 2026-07-14 (later).
PENDING MICHAEL: see FOR YOU above (templates, realtime publication, two-user lifecycle test incl. proof links).
NEXT BUILD ITEM (any, no blocker): deferred bug-hunt findings above · Phase B (create_task/update_task RPCs — drops the last creator-side client write policy) · Phase 5 ship vehicle (cap sync ios, device safe-areas, TestFlight — needs a Mac).
Mode 2 rules apply. One LOG line per step; checkpoint per Iron Rule 3; end checkpoints with the Status Block.
