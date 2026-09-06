# Round 05 verification · 2026-09-07

Compiled offline fixture on 127.0.0.1:6078 with the production response policy. Fictional Michael/Alex/Sam accounts; state resets on reload. No live reward, email, credit or task mutation.

- Form: For / Reward / Details, Gift / Credits radios, five equal coin choices on a 360px phone. ArrowRight selected 10 from 5; ArrowLeft restored 5. Filled and submitted “Bring coffee upstairs” for Alex; the new card and detail both showed 5 credits. Skin switching inside the open form preserved all values.
- Materials: Starlight/Forged/Astral forms and detail surfaces checked at desktop, 360px and 390px. Astral modal frame inset is 0; no horizontal document/dialog overflow. Source artwork is cropped mechanically; corners retain their original display scale.
- Values: German 12.500 fits within the 96px medallion (47.75px text width, 15px font) without truncation. App formatting test covers the same locale and explicit zero.
- Claim: 24 → 4 balance; automatic Collected tab; Ready to enjoy; Mark as used → Used; Undo → ready, balance remains 4. Phone header balance updates without Realtime. Verified A desktop and B/C German phone collection cards.
- German reward tabs initially clipped the selected final tab. Fixed with equal-width tabs and wrapped labels; all three are now within the 390px viewport, equal 56px height. Header remains outside the main scroll container. Final B/C collected screenshots replace the earlier failing captures.
- `npm test`: 413 tests / 34 files. Includes 3 new malformed-response cases and 3 sample lifecycle cases (one debit, duplicate prevention, insufficient funds, recipient/self/unavailable guards, used/undo). Fixture reinitialization emits the expected multiple-GoTrueClient warning in tests; there is one client in the running preview.
- `npm run build`: app TypeScript and Vite pass. `npm run lint`: zero errors, three existing Fast Refresh warnings. `git diff --check`: pass. Preview toolbar/fixtures are excluded from the ordinary production build.

PNG files here capture the actual app, not imagegen mockups. Screenshots taken during transitions can show intermediate coin count-up values; authoritative final balances were checked after the operation settled. No physical iPhone/Safari, VoiceOver, live Supabase policy, push or mail verification is claimed. Existing motion/transparency fallbacks remain; OS accessibility settings need device testing.
