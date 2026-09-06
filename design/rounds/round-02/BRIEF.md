# Material and lettering exploration — 2026-09-07

Status: A approved and implemented 2026-09-07 in 03f9323. This brief preserves the original exploration; verification/README.md records the shipped result. B/C are deferred.

## Keep
The simplified Missions / Rewards / People model, current layout and content hierarchy, recipient-per-mission workflow, optional customization, dark starfield, existing helmet logo and credit coin.

## Change under review
- Remove the Missions subtitle; it repeats what the screen already communicates.
- Restore the characteristic Mandalore heading typography. The plain page heading was a deliberate choice in round 01; the user prefers the brand's display lettering.
- Make surfaces genuinely reveal the stars: clear card centers, more glass on hover/focus and a transparent New mission control.
- Explore authored material assets for sculpted lettering finish, thin frame corners, metallic catches and optical highlights. Avoid a stock rectangular dashboard finish without making everyday text difficult to read.

## Three visual theses
A — Starlight glass: polished transparent crystal, frosted-silver lettering and restrained mint light. Closest to the requested glass direction.
B — Forged relic: small etched metal catches and platinum lettering around dark glass. More tangible craft and texture.
C — Astral lens: optical glass rails and prismatic edges with an unusual silhouette. The most experimental treatment.

Each image shows the same Missions page and content so material differences are comparable. The supplied screenshot is a structure reference; the existing coin/logo files are identity references. Full prompts: PROMPTS.md. Native built-in image generation is used; no API credentials are needed.

## Feasibility after approval
Use a few reusable WebP material pieces or corner/edge assets sized for real display dimensions. Keep the supplied coin/logo. Reuse frame pieces across arbitrary card sizes; never bake a whole task card or user-written task into an image. Ship only the selected palette's required pieces and measure the actual asset requests and transferred bytes before declaring it fast.

Render the real Mandalore font for headings. Surface textures, masks or highlights can provide the authored finish. Dynamic names, mission content, status counts and translations stay live text. If a specific fixed word needs a fully drawn asset, give it a live accessible name and an equivalent typographic fallback; do not generate an alphabet of independently fetched image letters.

Proposed incremental asset budget: aim for no more than 150 kB of new compressed decoration on the initial screen, then verify visual quality and actual network cost. This is a target, not a measured result or a guarantee. A full-screen mockup PNG is reference artwork, not a production background to ship.

Hover in the mockup is a visual concept. Its eventual focus/touch equivalent, contrast, reduced transparency/motion and iPhone rendering still need implementation and device verification. Generated lettering approximates the existing font; final rendering must use the installed font rather than reproduce image-generator misspellings.

## Order of work
1. Generate and inspect the three mockups; obtain Michael's selection/changes.
2. Lock the selected visual direction and update DESIGN_SPEC.md; prepare measured production assets and implement.
3. Verify the new surface and then resume the release/security work in docs/product-simplification/RELEASE_REVIEW.md.
