# Production runbook 017 — connection consent and reward recipients

**2026-09-07 — prepared and locally tested; NOT APPLIED.** Apply after 016 with
Michael's explicit review/go and a verified current backup. This is a separate,
reviewable change; it does not introduce blocking/reporting or delete any data.

## Confirmed problem and repair

The saved live policies in `docs/release/live-safety-snapshot.json` permit a caller
to insert an already accepted friendship, accept their own request or alter the
relationship endpoints. The existing DELETE policy allows only a sender to cancel
a pending request, so recipient rejection and removing accepted people can silently
match no rows. The live `create_task`/`update_task` definitions in
`docs/release/live-functions.json` do not check accepted recipient connections.

The live SECURITY DEFINER `purchase_reward` also bypasses reward SELECT RLS without
checking its recipient. Knowing a hidden reward's UUID therefore permits an
unassigned collector to purchase it. This includes creator-private rewards retained
after the originally assigned recipient deletes their account.

`017_connection_consent.up.sql` replaces the four friendship policies and narrows
column/table grants. It replaces the two task RPCs and purchase RPC using their
confirmed live definitions with only recipient checks added. Purchase denial happens
before any collection or credit mutation; existing row locks, balance handling and
self-purchase protection remain.

| Action | Allowed after 017 |
|---|---|
| Request a connection | Authenticated requester is an endpoint; status starts pending |
| Accept a request | Other endpoint only; pending becomes accepted |
| Change endpoints, requester, ID or creation timestamp | Never through client writes |
| Cancel/reject pending request | Either endpoint |
| Remove accepted connection | Either endpoint |
| Read a relationship | Its endpoints only |
| Create a mission for someone else | Accepted connection required |
| Change a mission's recipient | Accepted connection to the new recipient required |
| Edit an existing disconnected mission | Existing creator can still edit it |
| Unassigned draft or self text mission | Existing behavior retained |
| Self credit award | Still denied by the existing 013 rule |
| Purchase a reward | Only its assigned recipient; current friendship not required |
| Purchase a creator-private/unassigned reward | Denied, even with its UUID |
| Redeem a valid invitation | Existing trusted token RPC can create/accept connection |

The invitation is an explicit consent mechanism: the inviter creates/shares a
token, and the recipient redeems it. The SECURITY DEFINER invite function deliberately
bypasses direct-client insert/update rules. Its token checks and permissions are
unchanged. Revoking a relationship does not delete existing mission history or
implement a product block; staged 019 adds that separate boundary.

## Review and preflight

1. Read this SQL and confirm the boundary above. Run
   `node tests/security-db/run-016.mjs --include-017`.
2. Confirm 016 is applied/validated or approve the ordered 016→017 batch together.
3. Run `db/proposals/016_preflight.sql` read-only and review policy/ACL drift. Any
   malformed friendship count needs investigation, not blind deletion. 017 rejects
   new malformed requests and refuses to accept a request whose requester is not
   an endpoint; it cannot establish whether an existing accepted row was forged
   under the previous permissive rules. Review existing accepted relationships with
   the owner before relying on them for a public launch.
   Compare fresh function definitions with the reviewed live source before replacement.
   The resulting `public.purchase_reward(uuid,uuid)` definition fingerprint is
   `ef98df3f98f9fd30a879176cd8dc6dbc` using
   `md5(pg_get_functiondef('public.purchase_reward(uuid,uuid)'::regprocedure))`
   on the local PostgreSQL 18 test engine. Proposal 018 pins that audited function
   before deleting files. An unexpected production fingerprint requires review,
   including possible PostgreSQL version formatting differences; do not bypass it.
4. Use the verified schema/ACL backup workflow in `PROD_RUNBOOK_016.md`. No row or
   object bytes change here. Keep credential values and backup contents private.
5. Record Michael's explicit approval. Unknown policies or effective inherited
   column grants abort the atomic transaction; investigate rather than bypassing.

## Apply only after approval

```powershell
$env:PROD_CONFIRM = 'YES'
scripts/prod/apply_sql.ps1 -Sql db/proposals/017_connection_consent.up.sql -BackupManifest $reviewedBackup
psql --host aws-1-ap-south-1.pooler.supabase.com --port 5432 --username postgres.mvbmpcmexkgfairnthux --dbname postgres -X -v ON_ERROR_STOP=1 -f db/proposals/017_validation.sql
```

The script has a transaction, lock/statement timeouts, effective ACL assertions and
schema-cache notification. It can be applied repeatedly. No automatic rollback file
reinstates self-acceptance or arbitrary recipient assignments. A failure before
COMMIT rolls back itself; a later problem requires a narrow forward repair or
maintenance mode with review.

## Verification and limits

The combined disposable PostgreSQL suite passes **111 checks (62 for 016, 49 for
017)**. It covers the original vulnerabilities before
repair, then sender/recipient/outsider/anonymous request operations, immutable columns,
pending and accepted deletion, accepted/unconnected/reversed/self/draft task cases,
no mutation on rejected reassignment, valid/existing/new/invalid/self invitations,
unknown policy rollback, inherited ACL rollback, repeat apply and read-only assertions.
It also reproduces the old known-UUID purchase bypass, then tests assigned purchase,
outsider and unassigned reward denial without charging, collector identity spoofing,
self-purchase and anonymous execution. It executes the actual saved live invite RPC
and actual patched create/update/purchase SQL.

Local PostgreSQL is 18.0; production is 17. Live HTTP/RLS smoke checks remain necessary.
Use designated accounts to send, accept, cancel, reject, remove and redeem an invitation.
Try mission creation to an accepted account, then to a removed account; the latter
must fail with `recipient_not_connected`. Check the UI reports zero affected
friendship mutations as failure. The paired frontend already uses `.select('id').single()`
on deletion so it no longer reports a nonexistent deletion as successful.
Purchase as the actual assigned recipient, then try a known hidden/unassigned reward
from another test account: the latter must return `NOT_RECIPIENT` without a balance
or collection change. A previously assigned promise remains purchasable after
disconnecting; no new friendship requirement was added to purchasing.

This repair does not add invitation expiration, rate limiting, block/report semantics,
notification delivery or an authenticated-directory privacy guarantee. It does not
claim existing accepted relationships have been forensically verified as consensual.
