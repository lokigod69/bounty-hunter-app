# Round 06 — shared metal numerals and physical credit tokens

2026-09-07. Generated with the built-in image generation tool. Sources are preserved in assets/. Astral and the initial rejected Forged use starlight-source.png as their material/proportion reference. The final Forged prompt and alpha correction attempts are in FORGED_ITERATIONS.md. Production export is mechanical cropping, resizing and WebP encoding only.

## Saved production assets

- `src/assets/generated/credit-starlight.webp`, `credit-forged.webp`, `credit-astral.webp` (256px, real alpha).
- `src/assets/generated/credit-digit-0.webp` through `credit-digit-9.webp` (ten shared glyphs, each 96px high).
- Originals: [digits](assets/digits-source.png), [Starlight](assets/starlight-source.png), [Forged](assets/forged-source.png), [Astral](assets/astral-source.png).
- Exact byte sizes/crop coordinates: [asset-metrics.json](asset-metrics.json). Runtime use: `src/components/visual/Coin.tsx`, `src/theme/skin-styles.css`.

## Digits

```text
Use case: stylized-concept.
Asset type: one production sprite atlas of metallic digits for a premium science-fiction missions-and-rewards interface. This is reusable numeral artwork, not a mockup.
Create exactly ten separate numerals in a strict 5-column, 2-row grid on a genuinely transparent alpha background.
Exact top row: "0 1 2 3 4". Exact bottom row: "5 6 7 8 9". Each character appears once, centered in its own equally sized cell, with generous empty transparent gutters. No printed cell borders, no labels.
The digits themselves are physical machined ivory-platinum metal, bold compact industrial sans-serif with subtly chamfered corners, bright near-white broad front faces, fine silver bevels, faint champagne edge catches. Slight dimensional extrusion visible at bottom/right but camera perfectly frontal, orthographic, all glyphs upright, same cap height, baseline and stroke weight. They must read clearly at just 18 pixels tall. Numeral 1 has a strong angled flag and foot; 0 is an ordinary rounded rectangle with one counter, never slashed; 8 has two distinct counters.
Material is bright and luminous through reflection, not glowing neon. All ten share identical material and top-left studio lighting. Minimal natural contact shading only on the glyph itself. No long drop shadows. No black/dark surrounds. No coins, rings, gems, flourishes, stars, diamonds, fantasy ornaments, plates, scene or words. Preserve genuine alpha between and inside the glyphs. Large high resolution landscape atlas, approximately 5:2 aspect.
```

## Starlight

```text
Use case: stylized-concept.
Asset type: production UI currency emblem, Starlight material, isolated on genuinely transparent alpha background.
Create a premium physical sci-fi credit token seen exactly face-on orthographic, centered, no perspective. Mostly round but not just a ring: a compact machined coin body has two small asymmetrical overlapping silver fins that extend slightly beyond its outline at upper-right and lower-left, with recessed teal light slits. Integrated segmented rim, shallow ridged edge, convincing bevels and crisp reflective silver catches.
Crucial: the center is a FILLED brushed blue-grey titanium face, softly reflecting mint-grey light, fully opaque with subtle fine horizontal machining. NOT black, NOT empty, NOT a hole. Reserve the broad center 65% of the token diameter as calm continuous physical metal so bright ivory numerals can later be laid over it, visually embossed into the face. Do not put any numeral in this source image.
Material: cool polished platinum rim, smoked blue steel face of medium luminance, very restrained mint glass inserts only on the edge. Contemporary precision fabrication, compact and elegant, tactile depth. A few rim pieces overlap inward and outward so the silhouette has character, but no broad wings or tall spikes. Upper-left soft studio highlight, bottom/right dark bevels.
Constraints: one complete token only, no text or numbers, no crown, jewels, diamonds, gemstones, fantasy scrollwork, filigree, magical rays, background shadow, mockup, scene, watermark or checkerboard. Modest empty transparent padding on all sides. Square canvas. Actual alpha around the silhouette. Must look refined at 48 pixels, use broad simple details.
```

## Forged

```text
Use case: style-transfer.
Asset type: one production currency emblem, Forged variant, actual transparent alpha.
Input image: reference for the shared credit-token proportions and readable central metal face.
Create its Forged sibling: retain exactly frontal orthographic camera, centered solid brushed-metal center, compact coin-like body with a few physical details slightly projecting beyond the rim. Change the material and rim construction to rugged machined dark tungsten with warm champagne brass bevels, a filled satin bronze-graphite center of medium luminance and subtle horizontal brush marks. A few layered chamfered metal plates bridge inward/outward across the rim at diagonally opposed corners. Short inset amber-white light slots, very restrained. Crisp crafted sci-fi hardware, not medieval/fantasy. Center 65% diameter must remain calm, visibly METAL, not black or empty, reserved for bright ivory numeral artwork that will be composed later. No marks in center.
Keep one token, same compact footprint and usable face area as reference, broad geometry readable at 48px. Upper-left studio reflection. Small transparent padding on all sides; genuine alpha outside object.
No letters, numerals, ornate filigree, gems, diamonds, crowns, skulls, broad wings, flames, rays, floating parts, backdrop, cast shadow or watermark. This is a clean standalone asset, no labels or comparison sheet.
```

## Astral

```text
Use case: style-transfer.
Asset type: one production currency emblem, Astral variant, actual transparent alpha.
Input image: reference for shared physical credit-token proportions and solid readable center.
Create its Astral sibling: maintain centered front-facing orthographic view, coin-like disk with short asymmetric extensions at upper-right and lower-left. Use a subtly faceted platinum and smoked optical-glass rim, thin cyan and violet iridescent edge catches. A few angular layered crystal-metal lips interrupt the circle, extending a little into and outside it; compact, delicate, precise. The center MUST be a fully filled brushed titanium face with a soft medium slate-blue/lavender reflection, not black, not a hole. Calm physical face spanning 65% diameter to receive bright ivory-platinum numeral assets later. No center symbol or number. Some shallow machining makes the whole object tangible.
Elegant contemporary sci-fi fabrication, not magic or ornate fantasy. Refined thin facets instead of gemstones. Broad enough material changes to remain visible at 48px. Upper-left studio light, same usable face area and near-square footprint as reference. Clean alpha edges and modest transparent padding.
One standalone token only. No text, numbers, jewels, diamonds, filigree, broad wings, detached elements, rays, aura, scene, ground shadow, checkerboard pattern or watermark. Background must be genuinely transparent, NOT an illustration of transparency.
```
