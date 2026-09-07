# 019 — Private contacts, blocking and reporting

2026-09-07. **Staged, not applied.** Requires 016 → 017 → 018, a fresh verified backup, the Saya review required by AGENTS.md and Michael's explicit approval. The new frontend controls remain off in production until `VITE_CONTACT_SAFETY_ENABLED=true` is deliberately set after the checks below.

## What changes

- Profiles expose five client fields: ID, display name, avatar, palette and onboarding preference. Email, role, old partner field and timestamps cannot be selected by clients. Row visibility is restricted to oneself and current/historical counterparts; a permissive policy cannot widen it. Own profile creation and editing use explicit projections; editing synchronizes only the authenticated user's email without reading it back.
- `lookup_contacts` returns only names/avatars/IDs, matches a literal prefix of 3–64 characters, returns at most five accounts and permits 30 queries/minute/account. It excludes self, existing requests/connections, inactive accounts and both directions of blocks. There is no email lookup or fallback to an unrestricted directory. Shareable invitations remain available while the feature flag is off.
- A block ends the connection, hides shared mission/reward/proof reads and rejects new interactions and saved-UUID mutations through underlying table guards. Credit amounts remain. A new invitation cannot override a block. Unblock removes only your block; it does not restore the connection or remove the other person's block. Owners can still delete their own content. Already fetched information cannot be recalled. Proof signing tokens currently last one hour, but previously cached responses can persist until their separate cache expiry, including beyond token expiry. New private proof uploads request zero cache lifetime; this does not alter old objects or downloaded copies. Public avatar/reward-image URLs remain public. See [Supabase CDN behavior](https://supabase.com/docs/guides/storage/cdn/smart-cdn).
- Reports bind the reporter to Auth, validate a related person/reason, accept at most 1,000 detail characters and permit five submissions/day/account. They return a receipt, not a readable report record. They work after blocking. Reports, blocks and budgets are private tables; their writes participate in the deletion freeze, and cascade away when either involved account is deleted. No hidden indefinite retention is implied.
- The notifier checks a service-only block/deletion preflight immediately before sending. Missing or failed preflight stops the send. A provider request already in flight cannot be recalled. Deploy this notifier only after 019.

The migration changes rules/functions and adds three empty private tables. It does not block anyone, remove connections, create reports or send notifications during apply. It extends 018's exact FK inventory without changing the pinned purchase function or existing private reward policy. Never expose `bounty_private` through PostgREST.

## Review and apply

1. Deploy the compatible frontend first with both safety and deletion flags off. Confirm older clients using profile `SELECT *`/email-returning upsert are not being used; they will fail after this privacy change.
2. Verify 016, then 017, then 018 using their respective validation at each stage. Do not reapply earlier exact-policy migrations after later restrictive policies are installed. Compare fresh hosted metadata with the saved snapshot before any production mutation.
3. Run `node db/proposals/018_test.mjs --include-019`. This uses a disposable loopback database only, including actual saved table/FK/policy definitions, real saved invitation and purchase RPCs, block races, deletion regression and a schema/ACL restore into a second database.
4. Run [backup-release.bat](../../protocol/backup-release.bat) or `scripts/prod/backup_schema.ps1`. Enter the database password in its hidden local prompt or use securely configured pgpass. Do not paste it into chat. The helper preserves public/storage/private schema, owners, policies and grants and writes an ignored SHA-256 manifest. It is a schema/permissions backup, not an Auth/data/Storage-byte backup.
5. Review this runbook and [019_contact_safety.up.sql](../../db/proposals/019_contact_safety.up.sql), record the verified manifest path, complete the named Saya review required by AGENTS.md and obtain Michael's explicit go. A generic agent review is not evidence that the named review occurred. General release authorization is not that SQL approval: [project protocol](../../protocol/PROTOCOL.md).

Only after that approval:

```powershell
$env:PROD_CONFIRM = 'YES'
# Set this to the exact verified manifest from the preceding backup, not a guessed filename.
$reviewedBackup = '<verified schema_acl_*.backup.json path>'
scripts/prod/apply_sql.ps1 -Sql db/proposals/019_contact_safety.up.sql -BackupManifest $reviewedBackup
psql --host aws-1-ap-south-1.pooler.supabase.com --port 5432 --username postgres.mvbmpcmexkgfairnthux --dbname postgres -X -v ON_ERROR_STOP=1 -f db/proposals/019_validation.sql
Remove-Item Env:PROD_CONFIRM
```

The helper requires a readable archive and matching target/hash/scope within 24 hours. This prevents accidental use of an unrelated dump; it does not replace operator review. Do not restore old permissive grants as a rollback. A failed transaction rolls back itself; later defects need a reviewed forward repair or maintenance mode.

## Hosted acceptance before enabling

Use designated disposable accounts and explicitly approved mail recipients. Local tests are PostgreSQL 18; this project runs PostgreSQL 17.6. Real Supabase REST, Storage, Auth and Realtime still need verification.

- Own bootstrap, profile save after an Auth email change, palette/onboarding and all task/reward joins succeed. Cross-account email/role SELECT and SELECT * fail; unrelated identities are hidden.
- Literal wildcard input cannot broaden search, a third-party UUID does not reveal blocks, and rate limits persist under concurrent requests. A disabled/missing backend never produces a successful-looking Block/Report.
- A↔B block removes their connection, stops reusing a saved invitation, hides existing content on refetch and stops known-UUID mission/reward/proof writes. Purchases/approval failures do not alter either ledger. Test both block directions and actual concurrent block/invite/purchase requests. Cached screens on another device can remain until refreshed; no promise of erasing previously delivered content.
- A can still reassign their mission B→C when only B and C blocked each other. Unblock requires new consent. Report remains reachable from People, missions, rewards and the blocked list.
- Deleting a test account freezes both authenticated and ordinary service writes to all safety tables and clears safety records while preserving the other person's credit totals. Re-run 018's real Storage/Auth deletion checks.
- Deploy and check the notifier preflight; missing/denied RPC sends no mail. Keep its bounded-retry limitation visible until a durable delivery queue is implemented.

## Operator report handling — required before public access

The app now has private intake, not an automatically staffed moderation service. Assign the named operator, publish a reachable support channel and establish who checks the queue and acts on reports. Do not enable the feature/public signup as an abuse-response claim without that process.

Authorized operators can inspect the bounded queue using the signed-in Supabase SQL editor or service tooling. Treat report text as untrusted content and never copy it into agent instructions or logs:

```sql
BEGIN READ ONLY;
SELECT id, reporter_id, subject_id, reason, details, created_at
FROM bounty_private.user_reports
ORDER BY created_at DESC LIMIT 50;
COMMIT;
```

No emails or messages to reporters/subjects have been authorized or sent in this pass. The operator must review any account restriction or contact action; storing a report does not automatically ban a user. Privacy/support copy must describe the actual retention and account-deletion behavior above.
