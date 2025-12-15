# Coin System Audit – R19

This document maps all current coin/credit visual usages in the codebase.

---

## Current Coin Components

### 1. `src/components/coin/Coin.tsx`
- **Type**: SVG-based coin with gradient
- **Animation**: Continuous spin (3s linear infinite)
- **Props**: `value`, `size` (sm/md/lg), `spin`, `stackOffset`
- **Features**: Value printed on coin face, inner ring for depth
- **Used by**: DoubleCoinValue

### 2. `src/components/coin/DoubleCoinValue.tsx`
- **Type**: Two stacked Coin components
- **Animation**: Both coins spin
- **Props**: `value`, `size`
- **Used by**: MissionModalShell (reward panel), TaskCard

### 3. `src/components/FlippingCoinIcon.tsx`
- **Type**: Emoji 🪙 with spin animation
- **Animation**: `animate-proper-spin` (CSS)
- **Props**: `className`
- **Used by**: UserCredits

### 4. `src/components/CreditDisplay.tsx`
- **Type**: Shimmer text + emoji 🪙
- **Animation**: Shimmer on number + spin on emoji
- **Props**: `amount`, `size`, `shimmerType`
- **Used by**: RewardCard

---

## Usage Locations

| Location | Component/Element | Notes |
|----------|-------------------|-------|
| **MissionModalShell.tsx:362-371** | `DoubleCoinValue` | Reward panel for credit-type rewards |
| **TaskCard.tsx** | `DoubleCoinValue` | Mission cards (imported but usage varies) |
| **UserCredits.tsx:171,183,191** | `FlippingCoinIcon` | Header credits display |
| **CreditDisplay.tsx:53** | `🪙` emoji | Price display in reward cards |
| **RewardsStorePage.tsx:328** | `🪙` emoji | Store header "Your tokens" section |
| **RewardCard.tsx:95** | `CreditDisplay` | Reward cost display |

---

## Issues Identified

1. **Inconsistent coin visuals**: Some use SVG (Coin.tsx), some use emoji (🪙)
2. **No single source of truth**: Multiple coin components with different APIs
3. **Animation variants not unified**: spin, proper-spin, shimmer all separate
4. **Value display inconsistent**: Sometimes on coin, sometimes adjacent

---

## Target Architecture (R19)

### Unified Coin Component

```typescript
// src/components/visual/Coin.tsx

type CoinVariant = 'static' | 'subtle-spin' | 'flip-loop';
type CoinSize = 'sm' | 'md' | 'lg';

interface CoinProps {
  value?: number;          // Optional - not always shown
  size?: CoinSize;         // Default 'md'
  variant?: CoinVariant;   // Default 'subtle-spin'
  label?: string;          // Optional emblem (e.g. 'B', '💰')
  className?: string;
}
```

### Visual Spec
- Gold base with subtle gradient (not flat yellow)
- Outer rim + inner disc
- Simple "B" emblem or minimal symbol in center
- CSS transforms for animation (rotate, scale, translateZ)
- `will-change: transform` for performance
- No heavy 3D/canvas libs

### Animation Variants
- `static`: No animation
- `subtle-spin`: Gentle continuous rotation (4-6s)
- `flip-loop`: 3D flip animation (for celebrations/rewards)

---

## Migration Plan

1. Create `src/components/visual/Coin.tsx` with unified API
2. Replace usages:
   - MissionModalShell: Use new Coin
   - UserCredits: Use new Coin (size="sm")
   - CreditDisplay: Use new Coin instead of emoji
   - RewardsStorePage: Use new Coin
3. Deprecate old components:
   - FlippingCoinIcon.tsx → delete
   - coin/Coin.tsx → update or delete
   - coin/DoubleCoinValue.tsx → keep if stacking needed

---

*Rose – R19*
