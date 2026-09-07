# Live rollout — 2026-09-07

This record supersedes earlier staged-only release notes. Michael explicitly delegated technical review and authorized the remaining release work. No further Saya/human SQL review or database password is required.

- The provider's documented narrow CLI-role repair succeeded after exact metadata capture, independent review and eight local PostgreSQL checks. No app records were changed by the repair.
- Verified actual schema/ACL archive: `schema_acl_20260907_195121_589.backup`, SHA256 `3ED359C249567F3DB4D919C6920BF5A805CB0606B12D9594BEFE43B1CA3C67A6`, 268 TOC entries. This preserves public/storage/private definitions, ownership, policies and ACLs, not Auth/app data or Storage bytes.
- The actual archive restored successfully on isolated PG18. Fresh bucket settings and external Auth/extensions fixtures supplied service dependencies. All four migrations and validators passed on that restored schema.
- Fresh hosted PG 17.6 preflight found zero profile email mismatches or malformed connections. **016 → 017 → 018 → 019 are LIVE**, each with successful hosted metadata validation. Per-stage logs and rollout records are in `verification/`.
- `delete-account` Edge Function is deployed with gateway JWT verification enabled and its own Auth/session authorization. Real HTTP/Auth/Storage acceptance passed using disposable accounts only.
- First HTTP run verified real sessions, profile restrictions, consent, lifecycle actor checks, private proofs, single approval award and single purchase debit/Used/Undo. A fixture display-name mismatch stopped lookup assertions; all three test accounts were successfully deleted. The fixture now sets names explicitly and is rerunning. See `verification/hosted-acceptance.json` for latest result.

Temporary provider DB credentials stay in memory in `scripts/prod/with_cli_connection.ps1`; backup/apply explicitly switch to postgres and bind that role in the backup manifest. Never print/store credentials. Do not reapply016 after019; its earlier exact-policy guards intentionally predate restrictive safety policies.

Hosted block/report/deletion acceptance passed and all test accounts were removed. SMTP is saved/reloaded; notify-reward-creator is deployed and provider simulation passed. Still in progress: native push implementation, frontend commit/deployment verification and Mac build checks. Public operator/support contact and Apple enrollment/Mac/iPhone facts are pending. There has been no human-inbox delivery, completed iPhone build, APNs delivery or TestFlight submission.

The initial fixture-name mismatch was corrected. Subsequent checks distinguished CDN-cached proof delivery from fresh origin authorization and compared existing ledger records instead of assuming the balance was a ledger sum. Final hosted acceptance passes; new proof uploads use zero cache lifetime.
