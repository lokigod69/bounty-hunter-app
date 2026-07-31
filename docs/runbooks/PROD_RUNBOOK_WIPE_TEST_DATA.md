# PROD Runbook — Wipe test data

**Date**: WRITTEN 2026-07-29 — **SCOPE A RUN AGAINST PRODUCTION 2026-07-30** ✅
**Priority**: P3 (housekeeping) | **Risk**: 🔴 High, and unlike a migration there is no
rollback — only a restore from the backup you take in step 1 | **Downtime**: none

## Run record — 2026-07-30, scope A

Michael chose scope A plus a manual single-account deletion (below) over scope B, so the
clean board and the signup re-test are both available without the one-way door.

| | BEFORE | AFTER |
|---|---|---|
| tasks | 2 | 0 |
| friendships | 2 | 0 |
| invites | 1 | 0 |
| rewards_store, collected_rewards, user_credits, credit_transactions, daily_mission_streaks | 0 | 0 |
| profiles (KEPT) | 3 | 3 |
| auth.users (KEPT) | 3 | 3 |

`UPDATE 1` — one stale `partner_user_id` was nulled. Backup used:
`supabase/data_backup_20260730_185223.sql` (9,717 bytes, 11 verified INSERTs).

### ⚠️ A bug in `backup_data.ps1` was found and fixed during this run — read this

The first backup reported success with **3 INSERT statements and not one row of the
`public` schema**. Cause: the script passed `--schema=public --table=auth.users` to a
single `pg_dump`. In pg_dump, `--table` *narrows* the selection and `--schema` does not add
the public tables back, so the dump contained only `auth.users`. The old guard — "at least
one INSERT" — passed, because `auth.users` supplied three.

That is exactly the failure this file warns about one section down, and it would have
authorised a wipe against a backup holding none of the rows being destroyed.

Fixed in the same session: the dump is now **two `pg_dump` invocations** (public schema,
then `auth.users`) concatenated at the byte level, and the guard now queries live row
counts first and asserts **per table** that the dump contains exactly that many INSERTs. It
refuses to report success on any mismatch. The verified run printed:

```
public.tasks       live=2 dumped=2 ok      public.profiles  live=3 dumped=3 ok
public.friendships live=2 dumped=2 ok      auth.users       live=3 dumped=3 ok
public.invites     live=1 dumped=1 ok      (+5 empty tables ok)
```

**If you ever restore from a `data_backup_*.sql` taken before 2026-07-30, check what is
actually in it first.** Any such file may contain `auth.users` only.

### Still to do by hand

- **Storage buckets** (step 3 below) — not covered by the SQL, still holds test proof files.
- **The signup/onboarding re-test**: delete ONE auth user in the Supabase dashboard
  (Authentication → Users) and register again with that address. If the confirmation email
  is misconfigured, the other two accounts still get you in — which is the whole reason
  scope B was declined.

## Pick a scope first

|  | Scope A — **recommended** | Scope B |
|---|---|---|
| Command | `scripts\prod\wipe_test_data.ps1` | `scripts\prod\wipe_test_data.ps1 -IncludeAccounts` |
| Clears | contracts, rewards, collected rewards, credits, credit transactions, streaks, friendships, invites, partner links | all of that **plus every profile and every auth account** |
| Keeps | accounts, display names, avatars, themes, languages | nothing |
| After it | app looks brand new; nobody signs up again | everyone signs up again and re-confirms email |

**Scope A is the recommendation** for one concrete reason: re-registration depends on
Supabase dashboard auth config (Site URL, redirect allow-list, email templates) that is
not in this repo and that has been wrong on this project before — on 2026-07-11 the Site
URL was still `localhost:3000`. If it is wrong when you run scope B, nobody can get back
in, and a public-schema data restore does not bring auth accounts back. Scope A gets you
the same clean board with none of that exposure.

Take scope B only if re-testing the signup flow is the actual point.

## The whole sequence (PowerShell, repo root)

```powershell
$env:PROD_CONFIRM = "YES"
$env:WIPE_CONFIRM = "mvbmpcmexkgfairnthux"   # name the project out loud

scripts\prod\backup_data.ps1        # Step 1: DATA backup. Mandatory, and enforced.
scripts\prod\wipe_test_data.ps1     # Step 2: wipe (add -IncludeAccounts for scope B)
```

Then step 3, storage, by hand — see below.

## Step 1: Data backup (not the schema backup)

`scripts\prod\backup_schema.ps1` is `--schema-only`. Before a data wipe it is worse than
no backup: it succeeds, it looks like a backup, and it contains none of the rows about to
be destroyed. `backup_data.ps1` dumps `public` plus `auth.users` with `--column-inserts`,
then refuses to report success unless pg_dump exited clean, the file exists, and it is
over 1 KB. It also counts the `INSERT` statements and warns if there are none.

Output: `supabase\data_backup_<timestamp>.sql`.

## Step 2: Wipe

Three gates, all of which must pass before a single row is touched:

1. `PROD_CONFIRM=YES` — the same gate every prod script in this folder uses.
2. `WIPE_CONFIRM` must equal the project ref `mvbmpcmexkgfairnthux`. Running against the
   wrong database now requires typing the right database's name by mistake.
3. A `data_backup_<today>*.sql` over 1 KB must exist. A schema backup does not satisfy it.

The SQL itself runs in one transaction with `ON_ERROR_STOP=1`, so a failure part-way
leaves the database exactly as it was. It prints row counts BEFORE and AFTER — keep that
output, it is the record that the wipe did what it said.

It uses `TRUNCATE` over an FK-closed set of tables rather than `TRUNCATE ... CASCADE`.
Every table that references another table in the list is itself in the list, so Postgres
can verify the set; `CASCADE` would have silently followed foreign keys into tables nobody
listed.

Scope A also nulls `profiles.partner_user_id`, which points at `profiles` and therefore
survives the truncate. Left alone it would leave couple mode wired to a relationship with
nothing behind it.

## Step 3: Storage (manual, not in the SQL)

Proof files and reward images live in Supabase Storage. Their rows are in the `storage`
schema and the bytes are in S3 — deleting the rows from SQL would orphan the bytes, so the
SQL deliberately does not touch them. Empty them from the dashboard (Storage → select
bucket → select all → delete) or the CLI:

- `bounty-proofs` — every submitted proof. Private bucket; all of it is test data.
- The reward-image bucket, if reward images were uploaded rather than linked.

Not doing this is harmless to correctness — nothing references the files after the wipe —
it just leaves storage bytes you are paying for.

## Step 4: Verify in the browser

1. Sign in. Board is empty, credits read 0, standing is back to band 0 (UNSWORN in guild
   mode) — the rank ladder was recalibrated on 2026-07-29, so band 1 is now 30 earned.
2. Friends list is empty. Both users must re-invite each other, which is a free re-test of
   the invite flow.
3. Create a contract → complete → approve → credits land. This is also the outstanding
   browser confirmation for proposal 012's create/edit RPC path.
4. Scope B only: sign up from scratch and confirm the email actually arrives and its link
   lands back on the deployed site, not localhost.

## Restore, if you need it

```powershell
psql "host=... user=... dbname=postgres" -v ON_ERROR_STOP=1 -f supabase\data_backup_<ts>.sql
```

**`profiles` has a circular foreign key** (`partner_user_id` points back at `profiles`), and
pg_dump says so on every data-only dump:

> `warning: there are circular foreign-key constraints on this table: profiles`
> `hint: You might not be able to restore the dump without using --disable-triggers`

A plain replay can therefore fail on ordering. If it does, restore that portion with
constraints deferred — `psql -c "SET session_replication_role = replica"` around the load,
or re-dump with `--disable-triggers`. Both need superuser-ish rights; on Supabase the
`postgres` role has them. Worth knowing **before** you need the restore, not during it.

The dump is data-only, so the schema must already be in place — which it is, since the
wipe does not touch it. **Scope B caveat:** the dump includes `auth.users` rows, but
restoring auth state this way is not something Supabase supports cleanly, and sessions,
identities and password hashes will not simply come back to life. Treat scope B as
one-way.

## Relationship to proposal 013

013's open point C asked whether already-minted self-assigned standing should be clawed
back. The answer was no — standing is monotonic and a downward write would be the first
thing ever to break that. This wipe makes the question moot: the one known self-assigned
contract (`tesatmynutes`) and its credits go with everything else. Run the wipe first and
013's validation queries #5–#7 should come back empty.
