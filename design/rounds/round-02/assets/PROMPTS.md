# Production frame — 2026-09-07

Built-in image generation. Reference: ../A-01.png. Original preserved as starlight-frame-source.png; production WebP: src/assets/generated/starlight-frame-alpha.webp.

## Exact prompt

Create ONE production UI asset for Bounty Hunter based on the polished glass material in the supplied approved Starlight glass mockup. The supplied image is a MATERIAL reference only, not an edit target or a request to reproduce the screenshot.

Output a square 1024 x 1024 PNG with a genuinely transparent alpha background AND completely transparent hollow center. Draw a SINGLE perfectly front-facing rounded-square crystal frame, outer bounds approximately x=12,y=12 to x=1012,y=1012, corner radius 90 pixels. No perspective, no background plate, no text, no icons, no stars, no shadow outside the object, no checkerboard baked in. This is a nine-slice UI border: the long straight middle portions of all four edges must be even and tile/stretch smoothly; all curved geometry and glints must stay within the 140 x 140 corner regions.

The rim is fine, 8–14 pixels across: transparent clear optical crystal with 2–3 tiny nested refraction lines, brushed silver-white reflected highlights and only a whisper of pale mint. It must look physically polished and beautifully reflective, NOT a neon tube, NOT a thick metallic frame, NOT opaque plastic. Strongest narrow white catchlight at the upper-left curved corner, a smaller subtle glint in the lower-right corner; quieter top-right/bottom-left. Some tiny realistic optical irregularities around the rim for authored tactile detail. The inside 80% is truly empty transparent alpha, so live UI and the app's real starfield will show through. Keep whites controlled and most of the rim translucent, balanced against a near-black app. Production-ready single isolated asset. No lettering or labels anywhere.

## Transparency correction (built-in edit)

Edit the supplied single glass frame asset. Preserve the exact shape, fine silver/mint reflection detail and bright corner catches. Remove ALL of the black background, outside AND inside the hollow frame, and export as a true RGBA PNG with transparent alpha in the empty areas. This is a UI overlay, not a picture of a frame on a background. Do not render a black or white or checkerboard background. The empty center and all exterior space must be actual alpha=0. Keep only the optical rim highlights and translucent glass edge. No other changes. One isolated frame.

Saved as starlight-frame-alpha-source.png. The edit returned true RGBA: 1312×1199, transparent center and exterior. Production asset: src/assets/generated/starlight-frame-alpha.webp, resized to 512×512 (fit fill), WebP quality 85 / effort 6, 32,952 bytes. Nine-slice preserves the curves at flexible control/card sizes. No blending workaround is needed. The original RGB export is kept as design history only.

## First export (superseded)

The returned PNG has an RGB black ground, despite the alpha request. No manual semantic image editing was used. A 6,522-byte draft was tested with screen blending, then discarded because transparent compositing groups could expose its black ground. The corrected RGBA asset above replaces it; no blend workaround ships.
