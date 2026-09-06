# Round 04 — shape coverage

Approved 2026-09-07 in the user's request to finalize A/B/C sizing and proceed with release/security. This extends the already approved materials; it introduces no new design direction or workflow.

Each skin now has three authored source shapes:

| Use | Shape and scaling |
| --- | --- |
| Mission/person cards, square reward artwork, tall dialogs, navigation | Existing nine-slice panel: four fixed corner regions, four extending edge strips, no painted center |
| Primary/destructive actions, selected mission tabs, credit balance | New shallow control frame with shorter, intentionally shaped corners |
| Profile and contact portraits | New circular ring, scaled uniformly with the portrait |

Generating a separate image at every card width would add downloads and still fail when translated text changes its height. Nine-slice preserves the corner proportions while layout and text remain responsive. The new control and circle silhouettes address the genuine gaps in the old one-frame approach.

Six true-alpha WebPs add 129,108 bytes. No letters, prices or accessibility labels are baked into images. A/B/C remain Starlight/Forged/Astral in the existing appearance selector. Accent and material remain independent.

| Skin | Existing panel | New control | New ring | Complete decoration set |
| --- | ---: | ---: | ---: | ---: |
| A Starlight | 32,952 B | 28,974 B | 19,580 B | 81,506 B |
| B Forged | 29,520 B | 20,390 B | 16,434 B | 66,344 B |
| C Astral | 20,438 B | 25,790 B | 17,940 B | 64,168 B |

Frames now remain visible above reward images; medium desktop navigation uses the full emblem when the wordmark would crowd the links. Existing equal action sizing, live credit numerals, quiet interaction glint and accessibility fallbacks are retained.

Sources: [prompts](PROMPTS.md), source PNGs in assets/, and [browser verification](verification/README.md). Export script reads the archived source PNGs; supply an installed `sharp` module or `SHARP_MODULE` path. Cropping/resizing/WebP encoding only; imagegen authored the artwork and transparency.
