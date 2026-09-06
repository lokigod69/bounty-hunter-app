# 2026-09-07 verification

- [Forged amounts](forged-amounts.png): authored hammered rim; unchanged 1/2/3/5/10 numeral assets.
- [Astral amounts](astral-amounts.png): faceted rim with the same numerals and equal controls.
- [Safety at 360×640](safety-phone.png) and [360×360](safety-short-viewport.png): report controls fit or scroll into view. This is browser viewport testing, not a physical iPhone/keyboard test.
- [Sample receipt](report-receipt.png): report succeeds locally after the preview import-routing fix. Initial failed request exposed a relative-import escape from the adapter; fixture resolution and explicit dummy environment values now prevent that path. No live report was created.
- [Unblocked without reconnecting](unblocked-no-reconnect.png): Alex leaves the blocked list but does not reappear as a connection; balance remains 24. Reset restores the fictional scenario.

The actual 0–9 source assets and Starlight base are byte-for-byte unchanged. Forged/Astral exports are genuine alpha WebP. The safety scenario demonstrated connection removal, unchanged 24-credit balance and access to Unblock/Report after reload. Sample blocks persist for this tab and Reset clears them; other fixture transactions reset on reload. These are UI examples, not evidence of deployed security.

Real authorization, private report access, profile ACLs, deletion freeze/cleanup, saved invitation/purchase and concurrent locking are tested separately in the isolated PostgreSQL suites. Production SQL and Edge Functions remain undeployed.

Final build scan: no hosted project ID or `supabase.co` in preview JavaScript; no `offline-preview-public-key`, `bh-preview-safety` or `LOCAL PREVIEW` in production JavaScript. The preview viewport was reset after verification. App gate: 428 tests/38 files; types/build pass; lint 0 errors/3 existing warnings; production dependency audit has zero vulnerabilities.
