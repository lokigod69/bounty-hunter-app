# BOARD — Bounty Hunter — updated 2026-08-03 (Phase A of the LaunchOS launch path)

## ⚠️ WAITING ON YOU
- **🔑 Paste the DB password** — the single blocker for applying 014 (profiles RLS ON) and the
  corrected 015 (realtime publication). Your go is recorded; everything is staged;
  runbook: `docs/runbooks/PROD_RUNBOOK_014_015.md`.
- **After the applies: rotate the DB password (A3, ~2 min, dashboard)** — reopened by the launch
  decision; never paste the new one anywhere.
- **Then two-browser realtime test** — first time live updates can ever have worked on this
  project — plus the five profile-write checks for 014 (theme, language, name/avatar, partner,
  fresh-account onboarding).
- **Mac leg (A4/A5)**: `IOS_SHIP_RUNBOOK.md` — fresh build + `cap sync ios` there (embedded payload
  stale), signing, device smoke, TestFlight **internal only** (external testers gated by Phase B).
- **Real-device mobile check** — ten fixes across two batches, still none seen on a phone.
- **Delete ONE auth user** when you want the signup/onboarding re-test (three exist).
- **Paste the branded email templates** — Dashboard → Authentication → Emails → Templates tab.

## Workstreams
| Workstream | Phase/Gate | Last done | Next | State |
|---|---|---|---|---|
| main | Phase A (launch-critical path, D-022): A1/A2 staged, blocked on password | Aug 3: 015 corrected before applying (profiles was never subscribed; now 3 tables), 3 stale doc lines fixed (013-shown-unapplied ×2, iOS floor 14.0→15.0), all pushed (687697c); gates green: tsc 0 / 355 tests, 24 files / lint 0 err / build clean | Password → apply 014 then 015 → Michael rotates (A3) → realtime + profile-write tests → Mac leg (A4/A5) | 🟢 active |

## Standing decisions parked for you (not blocking yet)
- Prod SQL go/no-go always needs backup + your review. 014/015: **go GIVEN 2026-08-03**, password missing.
- ~~Password rotation cancelled 2026-07-29~~ **reopened as A3** — the closure's own "takes real users" condition fires with TestFlight.
- Residual taste-call: refresh the remaining empty-state art, or keep.
- Wordmark below 640px is deliberately hidden (needs 507px); if you want it on phones, it needs an abbreviated mark.

## Recently finished (last 5)
- 2026-08-03 **Proposal 015 corrected before applying** — draft published `profiles` on a wrong subscription claim; `usePartnerState` watches `friendships`; nothing subscribes to `profiles`; now three tables. Caught by the LaunchOS external sweep, verified against the code here.
- 2026-08-03 **Three stale doc lines fixed** — STATE:105 + DECISIONS:91 (013 shown unapplied though applied 2026-07-30), iOS floor 14.0→15.0 in the ship runbook.
- 2026-07-30 **Both prod runs executed** — 013 applied (all three body hashes moved), wipe scope A (tasks/friendships/invites → 0, accounts kept).
- 2026-07-30 **The data backup that protected nothing** — `backup_data.ps1` dumped only `auth.users` and its guard passed; now two dumps + per-table live-count verification. Pre-2026-07-30 data backups are suspect.
- 2026-07-30 **Extraction finished (93 keys × 12), last three mobile MAJORs closed, locale-aware formatting layer, mojibake fixed in RewardsStorePage** — plus Codex's review catching six error paths that had gone generic in English too.
