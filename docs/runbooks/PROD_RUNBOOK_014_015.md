# PROD Runbook 014 + 015 — Two pieces of live-database drift

**Date**: WRITTEN 2026-07-30 — **NEITHER APPLIED. Both need Michael's explicit go.**
**Found by**: the first session with production DB access, by inspecting the live
database rather than the repo. Neither defect is visible in `supabase/migrations/`,
which is why neither was caught before.

> **CORRECTED 2026-08-03, before applying** (caught by the LaunchOS external review):
> the first draft of 015 published four tables, including `profiles`, because its
> subscription inventory said `usePartnerState.ts` watches `profiles`. It watches
> `friendships` (`usePartnerState.ts:149`) and derives the entire partner state
> machine from friendships rows; its `profiles` read is a plain fetch, not a
> subscription. Nothing subscribes to `profiles`, so 015 now publishes **three**
> tables. The four-table version was never applied.

| | 014 | 015 |
|---|---|---|
| What | `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY` | Add 3 tables to the `supabase_realtime` publication |
| Class | 🔴 **Security** | 🟡 Functionality |
| Risk of applying | 🟢 Low | 🟢 Low |
| Reversible | Yes, one line | Yes, one line |
| Downtime | None | None |
| Client deploy needed | No | No |

**Apply 014 before 015.** Since the correction, 015 no longer publishes `profiles`,
so the original hard dependency (publishing an RLS-off table broadcasts it to every
connected client) is gone — but keep the order: 014 is the security fix, and the
rule it enforces (never publish a table whose RLS is off) is the same rule 015's
validation checks.

---

## 014 — `profiles` has four RLS policies and RLS switched off

`public.profiles` carries four policies. RLS is **disabled**, so none of them apply.
`anon` and `authenticated` both hold `DELETE, INSERT, SELECT, TRUNCATE, UPDATE`.

The anon key is public by design — it ships inside the deployed JS bundle. So as
things stand, **anyone who reads that key out of the bundle can update, delete or
truncate every row in `profiles`.**

It reads as an oversight rather than a decision, because every neighbour is correct:

| table | RLS | policies |
|---|---|---|
| tasks | ON | 3 |
| friendships | ON | 4 |
| user_credits | ON | 1 (write grants also revoked) |
| **profiles** | **OFF** | **4** |

No migration in the repo ever enabled it.

### Why turning it on is safe

The four policies already describe the intended rules, and every write path in the
client was checked against them before this was written:

| call site | operation | targets |
|---|---|---|
| `ThemeContext.tsx:42` | update | `.eq('id', user.id)` |
| `AuthContext.tsx:242` (`setPartner`) | update | `.eq('id', user.id)` |
| `ftxGate.ts:110` | update | own row |
| `profileBootstrap.ts:61` | insert | `id` = the authenticated user |
| `ProfileEditModal.tsx:160` | upsert | own row — needs the INSERT **and** UPDATE policies; both exist for `authenticated` |

There is **no DELETE call site anywhere in `src/`**, and no DELETE policy — so after
014, profile deletion is denied to app clients. That is intended: the wipe script
connects as `postgres`, which bypasses RLS.

Profile *readability* does not change. The SELECT policy is `USING (true)` and stays
that way; this is a friends app and public profiles are deliberate. 014 stops
anonymous **writes**, nothing else.

### Run it

```powershell
$env:PROD_CONFIRM = "YES"
psql "<conn>" -f db\proposals\014_validation.sql        # BEFORE — expect profiles rls_enabled = f
scripts\prod\backup_schema.ps1
scripts\prod\apply_sql.ps1 -Sql db\proposals\014_profiles_rls.up.sql
psql "<conn>" -f db\proposals\014_validation.sql        # AFTER — profiles rls_enabled = t, #4 row count unchanged
```

Rollback: `scripts\prod\apply_sql.ps1 -Sql db\proposals\014_profiles_rls.down.sql` —
but note that reopens the hole. If 014 blocks a real path, the right fix is nearly
always to **add the missing policy**, not to disable RLS again.

### Browser test after applying

Sign in and: change your theme, change your language, edit your display name and
avatar, set a partner in couple mode, and complete onboarding on a fresh account.
All five are `profiles` writes and all five must still work.

---

## 015 — nothing is published, so no realtime subscription receives anything

`supabase_realtime` exists, has `puballtables = false`, and contains **zero tables**.
Postgres emits no change events, so all five `postgres_changes` subscriptions in the
client connect, subscribe, and receive nothing:

| file | table | what silently does not update |
|---|---|---|
| `src/hooks/useTasksRealtime.ts` | tasks | assigned/issued lists, action counts |
| `src/hooks/useTasks.ts` | tasks | second, older subscription |
| `src/components/UserCredits.tsx` | user_credits | the header balance |
| `src/hooks/useFriends.ts` | friendships | the nav badge |
| `src/hooks/usePartnerState.ts` | friendships | couple-mode partner state (derived from friendships rows) |

No error is raised — which is why it survived. The symptom is "the other browser
didn't update", which reads like a caching or refetch bug.

**This is the answer to the long-parked open question** "is `friendships` in the
realtime publication?" It is not, and neither is anything else. Almost certainly
fallout from the 2026-07-08 project migration, alongside the auth Site URL and the
edge functions that also did not transfer.

The SQL is idempotent — each `ADD TABLE` is guarded, so re-running is a no-op.
`REPLICA IDENTITY` is left at default on purpose; the reasoning is in the up.sql.

### Run it (after 014)

```powershell
$env:PROD_CONFIRM = "YES"
psql "<conn>" -f db\proposals\015_validation.sql        # BEFORE — #2 zero rows; #3 all three t
scripts\prod\apply_sql.ps1 -Sql db\proposals\015_realtime_publication.up.sql
psql "<conn>" -f db\proposals\015_validation.sql        # AFTER — #2 lists the three tables
```

### Browser test after applying

Two browsers, two accounts. Create a contract in A → it appears in B without a
refresh. Approve it in A → B's credit balance moves on its own. Send a friend
request in A → B's nav badge increments. This is the first time any of that can
have worked on this project.

---

## Connection string

Session pooler, `aws-1-ap-south-1.pooler.supabase.com:5432`, user
`postgres.mvbmpcmexkgfairnthux`, db `postgres`. All scripts default to it.
