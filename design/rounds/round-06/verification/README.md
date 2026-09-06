# Round 06 verification — 2026-09-07

The browser uses the compiled, offline sample fixture on 6078 with the production response policy. These checks do not exercise live accounts, credits or iPhone hardware.

- Desktop Starlight Rewards: header 24, balance 24; clear bright bevels on physical metal faces.
- 360×800: all five form choices 1/2/3/5/10 remain 48×48px, in one row across A/B/C. Keyboard Right from 5 selects 10. Skin changes preserve selection. No document/dialog horizontal overflow.
- Forged sample Claim: cost 20; balance settles from 24 to 4; Collected retains spent 20. Astral Ready to enjoy, Mark as used and Undo verified.
- Existing skin-stress scenario: German 12.500 in the mission dialog across A/B/C; token grows to 112px. Accessibility tree announces the whole amount once, not individual glyphs or punctuation.
- Loaded coin images have nonzero natural widths. Everyday two-digit artwork occupies about 64% of the token width, inside the solid face. No stretching of digit proportions or emblem aspect ratio.
- 415 tests / 34 files pass. Tests cover locale punctuation, all ten glyphs, zero/decorative coins and whole-amount fallback when an image fails. App TypeScript/build pass; lint has 0 errors and the 3 existing Fast Refresh warnings.

Screenshots are named for their skin/surface/viewport. `starlight-large-german-mobile.png`, `forged-large-german-mobile.png` and `astral-large-german-mobile.png` show the final long-amount sizing. Other captures have unchanged one/two-digit geometry.

Asset metrics: 13 final WebPs, 122,888 bytes; 3 emblems at 256×256, shared ten digits at 96px high. Four replaced production images total 97,982 bytes, so net asset growth is 24,906 bytes. Source PNGs and rejected drafts are design history, excluded from the app bundle. See ../asset-metrics.json, ../export-assets.cjs and ../PROMPTS.md.

Physical iPhone/Safari rendering and an actual screen-reader session remain unverified. No production SQL, service configuration or notification change was made in this visual pass.
