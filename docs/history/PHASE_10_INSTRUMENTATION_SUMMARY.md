# Phase 10: OverlayRoot Instrumentation Summary

**Date:** 2025-01-28  
**Status:** Instrumentation Complete - Ready for Mobile Testing  
**Goal:** Identify exactly which overlay remains in `#overlay-root` when hamburger is dead

---

## Changes Made

### 1. Created Debug Helper (`src/lib/overlayDebug.ts`)

Added `logOverlayRootState()` function that:
- Only runs in dev mode (`import.meta.env.DEV`)
- Inspects `#overlay-root` and logs all children
- Reports: `tag`, `data-overlay`, `zIndex`, `pointerEvents`, `display`, `visibility`
- Can be called from anywhere to snapshot overlay state

### 2. Tagged Portal Root Divs

Added `data-overlay` attributes to identify portal owners:

- **TaskForm**: `data-overlay="TaskForm"` (line 217)
- **TaskCard Expanded Modal**: `data-overlay="TaskCardExpanded"` (line 449)
- **ProofModal**: `data-overlay="ProofModal"` (line 62)

### 3. Wired Debug Logging

**TaskForm** (`src/components/TaskForm.tsx`):
- Logs on mount: `"TaskForm mounted"`
- Logs on unmount: `"TaskForm unmounted"`

**TaskCard** (`src/components/TaskCard.tsx`):
- Logs when expanded modal opens: `"TaskCard expanded modal opened"`
- Logs when expanded modal closes: `"TaskCard expanded modal closed"`

**Layout** (`src/components/Layout.tsx`):
- Logs when hamburger is clicked: `"Hamburger clicked"`

**UIContext** (`src/context/UIContext.tsx`):
- Logs whenever `activeLayer` changes: `"activeLayer changed to: {value}"`

---

## Testing Instructions

### Reproduce Bug on Mobile

1. **Load app** on iPhone or mobile emulation
2. **Open TaskForm** via + button (create contract)
3. **Close TaskForm** with X button
4. **Try tapping hamburger** until you get the "dead" state

### Capture Console Logs

Watch for these log sequences:

**Normal Flow:**
```
[OverlayDebug] TaskForm mounted: 1 child(ren) [{overlay: "TaskForm", zIndex: "10000", ...}]
[OverlayDebug] TaskForm unmounted: 0 child(ren) []
[OverlayDebug] Hamburger clicked: 0 child(ren) []
```

**Broken Flow (if bug occurs):**
```
[OverlayDebug] TaskForm mounted: 1 child(ren) [{overlay: "TaskForm", ...}]
[OverlayDebug] TaskForm unmounted: 1 child(ren) [{overlay: "TaskForm", ...}]  // ← ZOMBIE!
[OverlayDebug] Hamburger clicked: 1 child(ren) [{overlay: "TaskForm", zIndex: "10000", pointerEvents: "auto", ...}]
```

### What to Report

For each state, document:

1. **Normal state** (no modals, no menu):
   - How many children in `#overlay-root`?
   - What are their `data-overlay` values?

2. **Right after closing TaskForm**:
   - How many children remain?
   - Which overlays are present?
   - What are their z-index and pointer-events values?

3. **When hamburger is dead**:
   - How many children in `#overlay-root`?
   - Which overlay is blocking?
   - What are its computed styles (z-index, pointer-events, display, visibility)?

4. **UIContext state**:
   - What is `activeLayer` when hamburger is dead?
   - What is `isMobileMenuOpen` when hamburger is dead?
   - Does `isMobileMenuOpen` toggle when hamburger is clicked?

---

## Expected Output Format

When reporting findings, use this format:

```markdown
## Overlay Root State Report

### Normal State (No Modals)
- Children: 0
- Overlays: []

### After Closing TaskForm
- Children: {N}
- Overlays: [{overlay: "X", zIndex: "Y", pointerEvents: "Z"}]

### When Hamburger is Dead
- Children: {N}
- Overlays: [{overlay: "X", zIndex: "Y", pointerEvents: "Z"}]
- **Culprit**: `div[data-overlay="X"]` with `z-index: Y` and `pointer-events: Z` is intercepting touches
```

---

## Build Status

- ✅ Build: PASSED (`npm run build`)
- ✅ Linter: PASSED (no errors)
- ✅ TypeScript: PASSED (no type errors)
- ✅ All instrumentation is dev-only (no production impact)

---

## Next Steps

After mobile testing:
1. Capture console logs showing overlay state at each critical moment
2. Identify which overlay (if any) remains mounted when hamburger is dead
3. Report findings in the format above
4. Once culprit is identified, fix will be targeted and simple

