# V1 Status Report – Rose (Round 14)
**Date**: 2025-12-06
**Status**: UX / Copy / Layout Fixes for Partner Mode and Store

---

## Session Summary

Fixed UX/copy/layout issues in partner mode and store:

1. **Store tokens balance layout** - Simplified to make number the focal point
2. **My Bounties layout** - Centered column layout for better visual balance
3. **"Moments" naming in Couple mode** - Mode-aware titles and labels
4. **FAB position** - Mobile: bottom-right, Desktop: centered bottom
5. **Partner Requests empty-state** - Contextually correct copy
6. **Self-assignment prevention** - Blocked in Couple mode with validation

---

## Part 1: Store Tokens Balance Layout

### The Problem

The Gift Store token display had:
- Old Pantheon-style spinning coins dominating the view
- Small balance number drifting offset, visually weak
- Too much visual noise

### The Fix

Simplified to a clean balance card:

```tsx
<BaseCard className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
  <div className="flex flex-col">
    <span className="text-xs text-white/50 uppercase tracking-wide mb-1">
      {theme.strings.storeCreditsLabel}
    </span>
    <span className="text-3xl sm:text-4xl font-semibold text-white">
      {userCredits ?? 0}
    </span>
    {/* Contextual hint below balance */}
  </div>
  {/* Single coin visual, scaled down */}
  <div className="text-4xl sm:text-5xl animate-proper-spin">🪙</div>
</BaseCard>
```

Key changes:
- Large number is the focal point
- Single coin to the right (not dominant)
- Contextual hint below balance (affordable count, distance to next reward)
- Removed CreditDisplay component dependency

---

## Part 2: My Bounties Layout Centering

### The Problem

The "created" (My Bounties) tab used a grid layout that felt unbalanced with 1-2 items.

### The Fix

Changed to centered column layout for the "created" tab:

```tsx
if (activeTab === 'created') {
  return (
    <div className="max-w-xl mx-auto flex flex-col gap-3">
      {filteredRewards.map(reward => (
        <RewardCard ... />
      ))}
    </div>
  );
}

// "available" tab keeps grid layout
return (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 spacing-grid">
    ...
  </div>
);
```

---

## Part 3: Mode-Aware "Moments" Naming

### The Problem

In Couple mode, the second tab is conceptually "Moments", but some UI elements still said "Missions".

### The Fix

Updated IssuedPage to use theme strings:

```tsx
<PageHeader
  title={`My ${theme.strings.missionsLabel}`}
  subtitle={theme.id === 'couple'
    ? `Create ${theme.strings.missionPlural} for your ${theme.strings.crewLabel}`
    : t('contracts.myMissionsDescription')}
/>
```

Mode-aware empty state:
```tsx
<p className="text-subtitle text-slate-300 mb-6">
  {theme.id === 'couple'
    ? `No ${theme.strings.missionsLabel.toLowerCase()} yet. Create one for your ${theme.strings.crewLabel}!`
    : t('contracts.noMissions')}
</p>
```

Result:
- Guild mode: "My Missions"
- Family mode: "My Tasks"
- Couple mode: "My Moments"

---

## Part 4: FAB Position

### The Problem

FAB (Floating Action Button) was always bottom-right, which felt off on desktop in couple mode.

### The Fix

Responsive positioning:
- **Mobile (<640px)**: Bottom-right (standard FAB position)
- **Desktop**: Centered bottom

```tsx
<button
  className="fixed z-fab rounded-full ...
    bottom-4 right-4
    sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto"
  onClick={handleCreate}
>
  <Plus size={24} />
</button>
```

Applied to:
- RewardsStorePage.tsx
- IssuedPage.tsx

---

## Part 5: Partner Requests Empty-State Copy

### The Problem

In Couple mode inbox, empty state said "No requests pending. Maybe create one?" which is misleading - the inbox shows requests FROM your partner, not ones you create.

### The Fix

Mode-aware empty state in Dashboard:

```tsx
<h3 className="text-subtitle text-white/90 mb-2">
  {theme.id === 'guild' && 'No missions right now'}
  {theme.id === 'family' && 'No chores assigned'}
  {theme.id === 'couple' && 'No requests yet'}
</h3>
<p className="text-body text-white/60 mb-4">
  {theme.id === 'guild' && 'Create a mission or check the store.'}
  {theme.id === 'family' && 'You\'re all clear for now.'}
  {theme.id === 'couple' && 'When your partner sends you a request, it will show up here.'}
</p>
```

For Couple mode:
- **Title**: "No requests yet"
- **Description**: "When your partner sends you a request, it will show up here."
- **CTA**: "Create request for your partner" (secondary style, navigates to Issued)

---

## Part 6: Self-Assignment Prevention in Couple Mode

### The Problem

Users could accidentally assign missions to themselves in Couple mode, which doesn't make conceptual sense.

### The Fix

Added validation in TaskForm:

```tsx
const validateForm = () => {
  const newErrors: Record<string, string> = {};

  // ... other validations ...

  // R14: Prevent self-assignment in couple mode
  if (theme.id === 'couple' && assignedTo === userId) {
    newErrors.assignedTo = `In partner mode, ${theme.strings.missionPlural} are meant for your ${theme.strings.crewLabel}.`;
    toast.error(`You can't assign a ${theme.strings.missionSingular} to yourself in partner mode.`);
  }

  // ... rest of validation ...
};
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/RewardsStorePage.tsx` | Simplified balance card, centered My Bounties, responsive FAB |
| `src/pages/IssuedPage.tsx` | Mode-aware titles, FAB positioning |
| `src/pages/Dashboard.tsx` | Mode-aware empty state copy for inbox |
| `src/components/TaskForm.tsx` | Self-assignment prevention in couple mode |

---

## How to Test

### 1. Store Tokens Display
- [ ] Navigate to Gift Store / Loot Vault
- [ ] Balance card shows large number as focal point
- [ ] Single spinning coin to the right
- [ ] Contextual hint below (affordable count or distance to next)

### 2. My Bounties Layout
- [ ] Navigate to Gift Store → "My Bounties" tab
- [ ] Items are centered in a column layout
- [ ] "Available" tab still uses grid layout

### 3. Moments Naming (Couple Mode)
- [ ] Switch to Couple mode in Edit Profile
- [ ] Navigate to Issued page (should say "My Moments")
- [ ] Empty state says "No moments yet"
- [ ] Create button says "Create new request"

### 4. FAB Position
- [ ] On mobile: FAB is bottom-right
- [ ] On desktop (>640px): FAB is centered at bottom
- [ ] Single click opens modal immediately

### 5. Inbox Empty State (Couple Mode)
- [ ] Navigate to Dashboard in Couple mode with no pending requests
- [ ] Title: "No requests yet"
- [ ] Description: "When your partner sends you a request, it will show up here."

### 6. Self-Assignment Prevention (Couple Mode)
- [ ] In Couple mode, go to My Moments → Create
- [ ] Try to assign to yourself (if possible in dropdown)
- [ ] Should show error: "You can't assign a request to yourself in partner mode."

---

## Summary

These were UX/copy/layout fixes focused on:
1. Making the token balance visually clear
2. Centering My Bounties for better composition
3. Using mode-aware terminology throughout
4. Positioning FAB appropriately per device
5. Providing contextually correct empty states
6. Preventing conceptually invalid actions

---

*Rose – 2025-12-06 R14*
