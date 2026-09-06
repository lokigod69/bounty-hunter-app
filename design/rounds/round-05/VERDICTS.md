# Round 05 · 2026-09-07

Approved directly by Michael: shorter mission forms, more intentional currency artwork, corrected Astral/reward frames and a working sample Claim flow. This iterates the locked A/B/C materials.

- For / Reward / Details; native Gift / Credits radio choices replace the reward dropdown. Five coin choices replace the amount dropdown. Existing custom denominations survive editing; the self-credit restriction remains.
- Three gem/enamel coins, with bright localized live numbers inside a blank dark center. Silver/ice for Starlight, gold/ruby for Forged, platinum/cyan/amethyst for Astral. This supersedes the adjacent-number treatment. No fixed digit alphabet or denomination cap.
- Tight panel crops remove the original artwork's asymmetric transparent margins on clipped dialogs/reward cards. Slice and border widths compensate for each crop, preserving corner scale. Existing roomy frames still serve surfaces that paint outside their bounds.
- Claim → Collected → Ready to enjoy → Mark as used → Undo. The sample adapter performs one debit and records a collection; duplicate claims/insufficient funds fail. The actual client requires explicit server success and refreshes all balance readers. The preview does not establish live RPC authorization.
- Three equal reward tabs wrap translations on phones. A small preview-only toolbar lets Michael compare open dialogs without discarding form input or reward state. Production appearance remains under Profile; device preferences synchronize across tabs.

Six new WebPs total **157,468 bytes** (153.8 KiB), with only the selected coin/panel rendered: A 59,184 B, B 55,626 B, C 42,658 B. This deliberate, measured extension supersedes the previous per-skin 100 kB total target; no runtime library or animation loop was added. Source and reproducible crop/export instructions: [PROMPTS.md](PROMPTS.md).

Verification: [browser and test evidence](verification/README.md). Production SQL, Edge deployment and physical iPhone testing were outside this follow-up.
