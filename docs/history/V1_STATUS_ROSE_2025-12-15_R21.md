# V1 Status Report – Rose (Round 21)
**Date**: 2025-12-15
**Status**: Copy & Labels Standardization - Mode-Specific Wording Cleanup

---

## Session Summary

This round focused on standardizing copy and labels across all three modes:
1. Simplified top section titles (Friends, Store pages)
2. Standardized Tab 2 to "Missions" across all modes
3. Added theme strings for page subtitles
4. Fixed ProfileEditModal mode label

---

## Task 1: Top Section Titles

Simplified page headers to be short, neutral nouns:

| Page | Before | After |
|------|--------|-------|
| Friends (Guild) | "Guild Roster" | "Guild" |
| Friends (Family) | "Your Family" | "Family" |
| Friends (Couple) | "Your Partner" | "Partner" |
| Store (Family) | "Reward Store" | "Rewards" |
| Store (Couple) | "Gift Store" | "Gifts" |
| Store (Guild) | "Loot Vault" | "Loot Vault" (unchanged) |

**File**: `src/theme/themes.ts`

---

## Task 2: Standardized Tab Labels

### Before
| Mode | Tab 1 | Tab 2 |
|------|-------|-------|
| Guild | Contracts | Missions |
| Family | Chores | My Chores |
| Couple | Requests | Moments |

### After
| Mode | Tab 1 | Tab 2 |
|------|-------|-------|
| Guild | Contracts | **Missions** |
| Family | Chores | **Missions** |
| Couple | Requests | **Missions** |

Tab 2 is now consistently "Missions" across all modes.

---

## Task 3: New Theme Strings

Added two new fields to `ThemeStrings`:

```typescript
inboxSubtitle: string;     // Subtitle for Dashboard (Tab 1 destination)
issuedPageTitle: string;   // Title for IssuedPage (Tab 2 destination)
issuedPageSubtitle: string; // Subtitle for IssuedPage
```

### Per-Mode Values

| Mode | `inboxSubtitle` | `issuedPageTitle` | `issuedPageSubtitle` |
|------|-----------------|-------------------|----------------------|
| Guild | "Contracts assigned to you for completion." | "My Missions" | "Missions you've created for others to complete." |
| Family | "Chores assigned to you for completion." | "My Missions" | "Missions you've created for your family to complete." |
| Couple | "Requests your partner has sent you." | "My Missions" | "Missions you've created for your partner to complete." |

**Files**: `src/theme/theme.types.ts`, `src/theme/themes.ts`

---

## Task 4: IssuedPage Updates

- Removed "My" prefix logic - now uses `issuedPageTitle` and `issuedPageSubtitle` directly
- Simplified empty state and FAB labels to use "mission" consistently

```typescript
// Before
title={theme.strings.missionsLabel.startsWith('My ')
  ? theme.strings.missionsLabel
  : `My ${theme.strings.missionsLabel}`}

// After
title={theme.strings.issuedPageTitle}
subtitle={theme.strings.issuedPageSubtitle}
```

**File**: `src/pages/IssuedPage.tsx`

---

## Task 5: Dashboard Updates

- Changed subtitle to use new `inboxSubtitle` theme string

```typescript
// Before
subtitle={t('contracts.description')}

// After
subtitle={theme.strings.inboxSubtitle}
```

**File**: `src/pages/Dashboard.tsx`

---

## Task 6: Layout Nav Icons

- Simplified `getMissionsIcon()` since Tab 2 is now "Missions" for all modes
- All modes now use `Send` icon for Tab 2
- Removed unused `ListTodo` import

```typescript
// Before
const getMissionsIcon = () => {
  switch (theme.id) {
    case 'family': return <ListTodo size={20} />;
    // ...
  }
};

// After
const getMissionsIcon = () => {
  return <Send size={20} />;
};
```

**File**: `src/components/Layout.tsx`

---

## Task 7: ProfileEditModal Mode Label

- Changed label from `{t('profile.mode') || 'App Mode'}` to just `"Mode"`
- Prevents "profile.mode" string from appearing if translation key is missing

**File**: `src/components/ProfileEditModal.tsx`

---

## Files Modified

| File | Changes |
|------|---------|
| `src/theme/theme.types.ts` | Added `inboxSubtitle`, `issuedPageTitle`, `issuedPageSubtitle` fields |
| `src/theme/themes.ts` | Updated all three themes with new strings and simplified titles |
| `src/pages/Dashboard.tsx` | Use `inboxSubtitle` for subtitle |
| `src/pages/IssuedPage.tsx` | Use theme strings directly for title/subtitle |
| `src/components/Layout.tsx` | Simplified missions icon, removed ListTodo |
| `src/components/ProfileEditModal.tsx` | Mode label to "Mode" |

---

## Mode Wording Summary (Final State)

### Guild Mode
| Element | Value |
|---------|-------|
| Tab 1 Label | "Contracts" |
| Tab 1 Icon | ScrollText |
| Tab 1 Page Title | "Mission Inbox" |
| Tab 1 Page Subtitle | "Contracts assigned to you for completion." |
| Tab 2 Label | "Missions" |
| Tab 2 Icon | Send |
| Tab 2 Page Title | "My Missions" |
| Tab 2 Page Subtitle | "Missions you've created for others to complete." |
| Friends Title | "Guild" |
| Store Title | "Loot Vault" |
| Token Name | "credits" |

### Family Mode
| Element | Value |
|---------|-------|
| Tab 1 Label | "Chores" |
| Tab 1 Icon | Home |
| Tab 1 Page Title | "Chore Inbox" |
| Tab 1 Page Subtitle | "Chores assigned to you for completion." |
| Tab 2 Label | "Missions" |
| Tab 2 Icon | Send |
| Tab 2 Page Title | "My Missions" |
| Tab 2 Page Subtitle | "Missions you've created for your family to complete." |
| Friends Title | "Family" |
| Store Title | "Rewards" |
| Token Name | "stars" |

### Couple Mode
| Element | Value |
|---------|-------|
| Tab 1 Label | "Requests" |
| Tab 1 Icon | Heart |
| Tab 1 Page Title | "Request Inbox" |
| Tab 1 Page Subtitle | "Requests your partner has sent you." |
| Tab 2 Label | "Missions" |
| Tab 2 Icon | Send |
| Tab 2 Page Title | "My Missions" |
| Tab 2 Page Subtitle | "Missions you've created for your partner to complete." |
| Friends Title | "Partner" |
| Store Title | "Gifts" |
| Token Name | "tokens" |

---

## How to Test

### Tab Labels
1. Switch between Guild/Family/Couple modes in Edit Profile
2. **Expected**: Tab 2 always shows "Missions" in the nav

### Page Titles
1. Click Tab 1 (Contracts/Chores/Requests)
2. **Expected**: Header shows correct inbox title and subtitle per mode
3. Click Tab 2 (Missions)
4. **Expected**: Header shows "My Missions" with mode-specific subtitle

### Store Headers
1. Navigate to store in each mode
2. **Expected**:
   - Guild: "Loot Vault"
   - Family: "Rewards"
   - Couple: "Gifts"

### Friends Page Title
1. Navigate to friends page in each mode
2. **Expected**:
   - Guild: "Guild"
   - Family: "Family"
   - Couple: "Partner"

### Mode Selector
1. Open Edit Profile
2. **Expected**: Label above mode pills reads "Mode" (not "App Mode" or "profile.mode")

---

## Strings Removed

- "My Chores" (was Family Tab 2 label)
- "Moments" (was Couple Tab 2 label)
- "Your Family" (was Family friends title)
- "Your Partner" (was Couple friends title)
- "Guild Roster" (was Guild friends title)
- "Reward Store" (was Family store title)
- "Gift Store" (was Couple store title)

---

*Rose – 2025-12-15 R21*
