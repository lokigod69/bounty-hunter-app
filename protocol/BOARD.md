# BOARD — Bounty Hunter — updated 2026-07-15

## ⚠️ WAITING ON YOU
- **Two-user lifecycle test on prod** (Vercel deploying c7da370/23ca5ec): submit PHOTO proof → view proof BOTH sides → reject → resubmit → approve (credits once) → archive → delete. Plus eyeball: modal hero art, empty bounty board, German login page.
- **Proposal 012 review + rollout go/no-go** — `db/proposals/012_create_update_task_rpcs.md` (open points A–C have recommendations). Client refactor already staged on branch `phase-b-client-rpcs`; do NOT merge it before the SQL applies. Rollout = validate → backup → apply → merge+push → post-validate → types regen.
- **Paste the branded email templates** — Dashboard → Authentication → Emails → **Templates tab**: "Confirm signup" ← `supabase/templates/confirm-signup.html`, "Magic Link" ← `supabase/templates/magic-link.html`; fresh signup after to confirm.
- **Check the realtime publication** (Dashboard → Database → Publications → `supabase_realtime`): `friendships` in it; add `tasks` too.
- **Phase 5 Mac leg**: `docs/runbooks/IOS_SHIP_RUNBOOK.md` end-to-end (Xcode signing → device smoke → TestFlight).
- Sound audition; rotate the DB password (pasted in chat 2026-07-10); taste-call: refresh remaining empty-state art (chest/pedestal/horn) or keep.

## Workstreams
| Workstream | Phase/Gate | Last done | Next | State |
|---|---|---|---|---|
| main | Premium V1 polish — 011 live; Phase B staged behind your go | Jul 15: deferred bug fixes shipped+pushed (offline-onboarding trap, gate races, login i18n); proposal 012 drafted + client refactor on branch; Phase 5 Windows prep + iOS runbook; 0 prod vulns; tsc 0 / 85 tests (90 on branch) / build clean | YOU: lifecycle test, 012 go/no-go, templates, realtime, Mac leg. Build candidates: legacy Gmail edge-function hardening, empty-state art | 🟢 active |

## Standing decisions parked for you (not blocking yet)
- **Proposal 012 open points A–C** (edit-gating parity / drop DELETE policy / no friendship check) — recommendations in the proposal doc; decide or delegate like 011 B–D.
- Prod SQL go/no-go whenever a runbook comes up — backup + your review required, always.
- Residual taste-call: refresh the other empty-state art too, or keep.
- ~~Noun system~~ DECIDED 2026-07-07: Mission/Chore/Request; store items = Rewards; "Bounty" = mission credit pot.
- ~~Proof types~~ DECIDED 2026-07-07: PDF/text/private all allowed.

## Recently finished (last 5)
- 2026-07-15 **Deferred bug fixes (c7da370) + Phase B staged (23ca5ec + branch f3927cb) + iOS prep**: offline existing users no longer dumped into onboarding (profileBootstrap/FTXGate/checkFTXGate fail closed), FTX gate race guards, Login fully en/de; create/update_task RPC proposal drafted (jsonb-patch whitelist, drops last client write policies) with client refactor deploy-locked on a branch; 3 missing Capacitor plugins installed + IOS_SHIP_RUNBOOK.md; npm audit → 0 prod vulns
- 2026-07-14 **Codex bug-hunt + verified fix batch (4dc0ab7)**: file proofs were unviewable (private bucket vs public URLs), now signed at render; false-success create/edit/archive fixed; proof-object lifecycle cleanup; logout/native-auth error handling; i18n gaps. 11 of 15 findings fixed
- 2026-07-14 **Build hygiene + docs refresh (fa0d3bf, 585591a)**: vite vendor chunk split (main 722→388 kB, warnings zeroed); README/CODEX_NEXT_STEPS de-staled
- 2026-07-11 **Design pass (5098679)**: mode hero art in MissionModalShell headers; empty-missions art regenerated (sword → empty bounty board)
- 2026-07-11 **Live-test findings batch**: theme-leak root-caused + hardened; invite/onboarding/login UX fixes; email templates authored
