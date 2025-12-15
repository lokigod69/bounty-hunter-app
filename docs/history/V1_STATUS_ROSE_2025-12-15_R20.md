# V1 Status Report – Rose (Round 20)
**Date**: 2025-12-15
**Status**: Copy & UX Cleanup - Mode-Specific Wording and Coin Display Fixes

---

## Session Summary

This round focused on copy consistency and UX refinements:
1. Reward Store coin display fixes
2. Mode-specific navigation icons
3. Theme string updates for Family mode
4. Edit Profile mode switcher improvements

---

## Phase 1: Reward Store Coin Fixes

### Header Balance Coin

**Problem**: The Reward Store balance card showed a coin with "B" label instead of the actual balance value.

**Solution**: Updated the Coin component usage to pass the balance value.

```typescript
// RewardsStorePage.tsx - BEFORE
<Coin size="lg" variant="subtle-spin" showValue={false} />

// RewardsStorePage.tsx - AFTER (R20)
<Coin size="lg" variant="subtle-spin" value={userCredits ?? 0} />
```

**File**: `src/pages/RewardsStorePage.tsx`

### My Bounties Cost Display

**Problem**: RewardCard cost display used CreditDisplay with animated shimmer, which was distracting.

**Solution**: Replaced CreditDisplay with static Coin component.

```typescript
// RewardCard.tsx - BEFORE
<CreditDisplay amount={cost} size="small" />

// RewardCard.tsx - AFTER (R20)
<Coin size="sm" variant="static" value={cost} />
```

**File**: `src/components/RewardCard.tsx`

---

## Phase 2: Mode-Specific Navigation Icons

**Problem**: All modes used the same Home icon for the first nav tab, which didn't match Guild mode's "Contracts" label.

**Solution**: Made nav icons conditional based on `theme.id`.

```typescript
// Layout.tsx - R20: Mode-specific icons
const getContractsIcon = () => {
  switch (theme.id) {
    case 'guild': return <ScrollText size={20} />;
    case 'couple': return <Heart size={20} />;
    case 'family':
    default: return <Home size={20} />;
  }
};

const getMissionsIcon = () => {
  switch (theme.id) {
    case 'family': return <ListTodo size={20} />;
    case 'guild':
    case 'couple':
    default: return <Send size={20} />;
  }
};
```

### Icon Mapping

| Mode | First Tab (Inbox) | Second Tab (Issued) |
|------|-------------------|---------------------|
| Guild | ScrollText (contracts) | Send (missions) |
| Family | Home (chores) | ListTodo (assigned) |
| Couple | Heart (requests) | Send (moments) |

**File**: `src/components/Layout.tsx`

---

## Phase 3: Family Mode Label Fix

**Problem**: Family mode's second tab was labeled "Tasks" but should be "My Chores" to be clearer.

**Solution**: Updated `missionsLabel` in familyTheme and made IssuedPage title smart about "My" prefix.

```typescript
// themes.ts - BEFORE
missionsLabel: 'Tasks',

// themes.ts - AFTER (R20)
missionsLabel: 'My Chores',
```

```typescript
// IssuedPage.tsx - R20: Avoid duplicating "My"
title={theme.strings.missionsLabel.startsWith('My ')
  ? theme.strings.missionsLabel
  : `My ${theme.strings.missionsLabel}`}
```

**Files**: `src/theme/themes.ts`, `src/pages/IssuedPage.tsx`

---

## Phase 4: Edit Profile Mode Label

**Problem**: Mode switcher in Edit Profile only showed "Guild", "Family", "Couple" without context.

**Solution**: Added hint text below the mode selector showing what each mode is for.

```typescript
// ProfileEditModal.tsx - R20: Mode options with hints
const modeOptions = [
  { id: 'guild', label: 'Guild', icon: Shield, hint: 'For friends & gaming groups' },
  { id: 'family', label: 'Family', icon: Home, hint: 'For household chores' },
  { id: 'couple', label: 'Couple', icon: Heart, hint: 'For partners & loved ones' },
];

// In render:
<p className="text-xs text-white/50 mt-2 text-center">
  {modeOptions.find(o => o.id === themeId)?.hint}
</p>
```

**File**: `src/components/ProfileEditModal.tsx`

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/RewardsStorePage.tsx` | Coin shows balance value |
| `src/components/RewardCard.tsx` | Static coin for cost display |
| `src/components/Layout.tsx` | Mode-specific nav icons |
| `src/theme/themes.ts` | Family missionsLabel → "My Chores" |
| `src/pages/IssuedPage.tsx` | Smart "My" prefix handling |
| `src/components/ProfileEditModal.tsx` | Mode switcher hints |

---

## Mode Wording Summary

### Guild Mode
- First tab: "Contracts" (ScrollText icon)
- Second tab: "Missions" → Page: "My Missions"
- Store: "Loot Vault"
- Tokens: "credits"

### Family Mode
- First tab: "Chores" (Home icon)
- Second tab: "My Chores" (ListTodo icon) → Page: "My Chores"
- Store: "Reward Store"
- Tokens: "stars"

### Couple Mode
- First tab: "Requests" (Heart icon)
- Second tab: "Moments" → Page: "My Moments"
- Store: "Gift Store"
- Tokens: "tokens"

---

## How to Test

### Reward Store Coin
1. Go to Rewards Store
2. **Expected**: Balance card coin shows your actual balance number

### Nav Icons
1. Switch to Guild mode in Edit Profile
2. **Expected**: First nav tab has scroll/document icon
3. Switch to Family mode
4. **Expected**: First nav tab has home icon, second has list icon
5. Switch to Couple mode
6. **Expected**: First nav tab has heart icon

### Family Mode Labels
1. Switch to Family mode
2. **Expected**: Second nav tab says "My Chores"
3. Click "My Chores" tab
4. **Expected**: Page header says "My Chores"

### Mode Switcher Hints
1. Open Edit Profile modal
2. **Expected**: Below mode buttons, see hint text like "For friends & gaming groups"
3. Click different modes
4. **Expected**: Hint updates to match selected mode

---

*Rose – 2025-12-15 R20*
