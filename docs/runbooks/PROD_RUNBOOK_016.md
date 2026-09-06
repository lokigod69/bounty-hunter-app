# Production runbook 016 — profile, task and Storage access repair

**2026-09-07 — prepared and locally tested; NOT APPLIED.** This supersedes the
deployment intent of staged 014/015. Do not apply their rollback files after 016.

Michael must review this exact change and give an explicit go **after a verified
backup exists**. `protocol/PROTOCOL.md`: “production SQL is never applied without a
backup and Michael's explicit go”. The general release request authorized preparing
and testing this repair; it did not waive that project-specific production gate.

## Evidence and impact

The production metadata snapshot in `docs/release/live-safety-snapshot.json` was
read on 2026-09-07 local time, without application records or production writes.
It confirms profiles RLS off; broad anonymous/authenticated profile grants; no
profile triggers; a tasks `Admins full access` policy trusting client-writable
`profiles.role`; broad legacy Storage policies beside narrower policies; and no
members of `supabase_realtime`. These are live findings, not merely old migrations.

`016_profile_storage_repair.up.sql` makes one transaction with no row/file deletion:

- Enable profiles RLS; allow authenticated reads and only self insertion/updates.
  Remove anonymous reads/writes and allow profile writes only to id, email,
  display_name, avatar_url, theme and onboarding_completed. Existing role values
  remain but clients cannot write them. UPDATE(id) supports PostgREST upsert and
  the new row must still belong to the caller. Its email must equal the verified
  access-token email claim, preventing contact-lookup identity spoofing. After an
  Auth email change, refresh the session before saving the new profile email; a
  stale JWT mismatch is denied rather than silently accepting another identity.
- Remove the role-derived tasks admin policy and all client direct task writes.
  Existing authorized SECURITY DEFINER lifecycle RPCs remain usable.
- Drop nine redundant/broad Storage policies and explicitly recreate twelve
  canonical policies: private proof access for mission participants; upload/update
  only for the assignee; public avatars/reward images with owner-scoped writes.
  Proof UUID parsing uses CASE so invalid paths fail authorization instead of
  depending on SQL predicate evaluation order.
- Publish tasks, user_credits and friendships, after checking their RLS state.
  Profiles are not published. Replica identity stays unchanged.

Unknown profile/task/Storage policy names, unexpected publication members, client
RLS bypass roles, inherited forbidden grants or a public proofs bucket abort the
transaction. This is deliberate: do not remove a guard merely to make apply pass.

**Correction to the old 014 runbook:** RLS does not govern TRUNCATE. It is also not
correct to infer a directly callable PostgREST TRUNCATE endpoint from an anonymous
table grant. This repair revokes the underlying privilege explicitly. PostgreSQL
documents both the [RLS boundary](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)
and [privilege revocation](https://www.postgresql.org/docs/17/sql-revoke.html).

## Before review/apply

1. Deploy the paired client change removing `role: null` from profile bootstrap.
   Older clients explicitly inserting role will be denied on first profile creation.
   Existing clients' own profile editing and theme/onboarding updates are compatible.
2. Confirm project **mvbmpcmexkgfairnthux** and read fresh metadata. Compare with the
   saved snapshot, especially policies, grants, buckets and publication membership.
   `db/proposals/016_preflight.sql` also reports counts of profile email mismatches
   and malformed friendships without exposing their values. Investigate nonzero
   counts before launch. An email mismatch can be repaired through the user's own
   profile save using current `user.email` after token refresh; a bulk repair needs
   a separately reviewed data backup/change. Do not use SQL role repair as a
   workaround for CLI access errors.
3. Run `node tests/security-db/run-016.mjs`. It starts a disposable PostgreSQL on
   loopback only and accepts no remote connection argument. `initdb`, `pg_ctl` and
   `psql` must be on PATH. No npm package installation is needed.
4. Take a fresh validated schema backup using the existing protected workflow.
   The standard backup omits ACLs, so also capture a private ACL-preserving dump:

   ```powershell
   $env:PROD_CONFIRM = 'YES'
   scripts/prod/backup_schema.ps1
   # Use a secure pgpass file/password prompt, never a password in a command/chat.
   # A .backup suffix is ignored by Git. Despite its suffix this is plain SQL.
   pg_dump --host aws-1-ap-south-1.pooler.supabase.com --port 5432 --username postgres.mvbmpcmexkgfairnthux --dbname postgres --schema-only --no-owner --schema public --schema storage --file supabase/016_schema_acl_before.backup
   if ($LASTEXITCODE -ne 0) { throw 'ACL backup failed: do not apply' }
   if (!(Test-Path supabase/016_schema_acl_before.backup) -or (Get-Item supabase/016_schema_acl_before.backup).Length -lt 50000) { throw 'ACL backup missing/suspect: do not apply' }
   ```

   Store backups privately and check their contents for table definitions, policies,
   and GRANT/REVOKE statements. A schema dump can contain function bodies and must
   not be published blindly. These files do not back up object bytes; 016 never
   edits bucket visibility or object records/bytes. A wider data change requires
   its own data/object backup plan.
5. Give Michael the exact up.sql, this runbook, current diff, local test evidence and
   verified backup location. Record the explicit go. A same-day file alone is not
   permission to apply.

## Apply after explicit approval

```powershell
$env:PROD_CONFIRM = 'YES'
scripts/prod/apply_sql.ps1 -Sql db/proposals/016_profile_storage_repair.up.sql
psql --host aws-1-ap-south-1.pooler.supabase.com --port 5432 --username postgres.mvbmpcmexkgfairnthux --dbname postgres -X -v ON_ERROR_STOP=1 -f db/proposals/016_validation.sql
```

The apply contains its own transaction, five-second lock timeout, thirty-second
statement timeout and verification assertions before COMMIT. A failed assertion
rolls back the entire change. Record the execution result and a fresh metadata
snapshot; do not call deployment complete merely because the script was prepared.

## Verification

Local evidence: **62 real PostgreSQL 18.0 checks pass**, including reproduction of
the original exposures, then actual anonymous/authenticated SQL denial; bootstrap,
upsert, preferences, real saved live create/update RPCs, Storage access by outsider/
creator/assignee, public artwork, service role, repeat apply and atomic rollback
when unknown policy/inherited ACL drift is injected. Fixtures use live saved policy
and create/update RPC definitions, reduced tables with their relevant columns,
and verified-subject/email function shims. Email impersonation, valid email changes
and stale-token refresh behavior are covered. They do not reproduce Supabase HTTP, signed URLs,
Realtime delivery, every lifecycle function, or every production trigger. Production
uses PostgreSQL 17; its live validation and service smoke checks remain required.

After apply, use two **designated test accounts** (no existing user records):

- Fresh login creates a profile; edit name/avatar, switch palette, finish onboarding.
- Create/accept/submit/approve a mission; balances and the other browser update.
- Creator and assignee can view that mission's newly uploaded image/video/PDF;
  a third account and a signed-out Storage request cannot list or sign its object.
- The assignee can replace proof; the creator can remove it; an outsider cannot.
- Avatar/reward upload and replace work for the owner; another account cannot
  overwrite/delete them. Public artwork remains visible.

Existing signed proof URLs can remain valid until their expiry; changing an RLS
policy does not revoke a bearer URL already issued. Native push is a separate
release task; Realtime publication does not implement notifications through APNs.

## Rollback and residual work

**No automatic down.sql restores these known exposures.** A failure before COMMIT
rolls back itself. After COMMIT, use maintenance mode or a narrowly reviewed forward
repair if a required path breaks. Do not disable profiles RLS, regrant role writes,
restore the old admin bypass, or reinstate broad proof reads as a “rollback”. A
full backup restore must itself be reviewed because the saved baseline was unsafe.
The front-end pairing can be reverted only to a build that still omits role writes.

Authenticated users can still read profiles, including email, to preserve the
current contact email lookup. Restricting that directory needs a dedicated lookup
RPC and client change. This patch is not a complete privacy/security sign-off.
Friendship consent and task recipient authorization are repaired separately in 017;
account deletion, abuse controls, native push, email, credential rotation and device
release verification remain separate milestones.
