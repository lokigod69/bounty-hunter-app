# Modes V2 Concept
**Status**: Design Stub (Not Implemented)
**Author**: Rose
**Date**: 2025-12-02

---

## Overview

The app supports three distinct modes that change the vocabulary and feel while sharing the same underlying task/credit system.

---

## Modes

### Guild Mode
- **Vocabulary**: Bounties, Missions, Guild Members, Gold
- **Use Case**: Generic task tracking, gamified productivity
- **Default Home**: Dashboard with mission feed

### Family Mode
- **Vocabulary**: Chores, Allowance, Family Members, Stars
- **Use Case**: Parents assigning chores to kids, earning allowance
- **Default Home**: Dashboard with chore list

### Couple Mode
- **Vocabulary**: Requests, Treats, Partner
- **Use Case**: Partners exchanging favors and rewards
- **Default Home**: Partner page with connection status

---

## Shared Behavior

Regardless of mode:
- Same task data model (tasks table)
- Same credit system (credits)
- Same rewards store
- Same friend/partner relationships

Mode changes ONLY:
- UI strings (via `theme.strings.*`)
- Default navigation/home view
- Visual styling (future)

---

## Card Styling Proposal (Future)

To visually differentiate modes:

| Mode | Card Shape | Border Style | Accent Color |
|------|------------|--------------|--------------|
| Guild | Rounded rectangle | Solid cyan | Teal/Cyan |
| Family | Soft square | Dotted | Warm orange |
| Couple | Circular/heart-framed | Gradient pink | Pink/Rose |

This is NOT implemented yet - just a design direction for future consideration.

---

## UX: Mode Selector

**Location**: Profile/Edit screen or Settings

**Implementation**:
```tsx
// Conceptual - not implemented
<div className="flex gap-2">
  <button
    onClick={() => setTheme('guild')}
    className={theme.id === 'guild' ? 'active' : ''}
  >
    Guild
  </button>
  <button
    onClick={() => setTheme('family')}
    className={theme.id === 'family' ? 'active' : ''}
  >
    Family
  </button>
  <button
    onClick={() => setTheme('couple')}
    className={theme.id === 'couple' ? 'active' : ''}
  >
    Couple
  </button>
</div>
```

Mode is stored in:
- `localStorage` (current implementation via ThemeContext)
- Could optionally sync to user profile in DB for cross-device

---

## Implementation Notes

Current `ThemeContext` already supports:
- `theme.id`: 'guild' | 'family' | 'couple'
- `theme.strings.*`: All localized strings

What would need to be added:
1. Mode selector UI in Profile/Settings
2. Card styling variants per mode (optional)
3. Default home view routing based on mode (optional)

---

## Priority

This is a **P1 feature** - not blocking V1 launch.
Focus for V1:
- Core task/credit loop works
- Identity displays correctly
- Cards are interactive

Mode switching can be enhanced post-V1.
