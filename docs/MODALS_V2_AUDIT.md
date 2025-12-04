# Modal V2 Audit
**Author**: Rose
**Date**: 2025-12-04
**Status**: Phase 1 Complete

---

## Overview

This document catalogs all mission-related modals in the bounty-hunter-app codebase, mapping their current implementations, styling patterns, mode awareness, role context, and state handling.

---

## Modal Inventory

| Component | File | Trigger | Purpose | Role Context |
|-----------|------|---------|---------|--------------|
| TaskCard (Expanded) | `src/components/TaskCard.tsx` | Dashboard/Issued card click | View/complete/approve mission | Assignee or Creator |
| CreateBountyModal | `src/components/CreateBountyModal.tsx` | "Create bounty" FAB on RewardsStorePage | Create new reward for friend | Creator |
| EditBountyModal | `src/components/EditBountyModal.tsx` | Edit button on reward card | Edit existing reward | Creator |
| ConfirmDeleteModal | `src/components/ConfirmDeleteModal.tsx` | Delete actions | Confirm destructive action | System |
| ConfirmationModal | `src/components/ConfirmationModal.tsx` | Various confirm actions | Generic confirmation | System |
| ConfirmDialog | `src/components/ConfirmDialog.tsx` | Delete reward on store | Confirm delete reward | System |
| ProofModal | `src/components/ProofModal.tsx` | "Complete Task" in TaskCard | Submit file/text proof | Assignee |
| ProofSubmissionModal | `src/components/ProofSubmissionModal.tsx` | Alternative proof flow | Submit text proof | Assignee |
| RewardCard | `src/components/RewardCard.tsx` | Store page | Display/claim reward (inline) | Store |

---

## Detailed Modal Analysis

### 1. TaskCard (Expanded Modal)

**Location**: `src/components/TaskCard.tsx:498-638`

**Current Styling**:
```tsx
const modalBgColor = isArchived
  ? 'bg-slate-900 border-2 border-slate-700'
  : status === 'pending'
  ? 'bg-red-900 border-2 border-red-500'      // ← PROBLEM: Giant red slab
  : status === 'in_progress'
  ? 'bg-blue-900 border-2 border-blue-500'
  : status === 'review'
  ? 'bg-yellow-900 border-2 border-yellow-500'
  : status === 'completed'
  ? 'bg-green-900 border-2 border-green-500'
  : status === 'rejected'
  ? 'bg-rose-900 border-2 border-rose-500'
  : 'bg-slate-800 border border-slate-700';
```

**Issues**:
- Full-pane colored backgrounds for status (overwhelming)
- No glassmorphism
- No mode awareness
- No visual hierarchy between assignee/creator views

**Mode Awareness**: None
**Role Detection**: Uses `isCreatorView` prop
**State Flags**: `status` (pending, in_progress, review, completed, rejected), `isArchived`

---

### 2. CreateBountyModal

**Location**: `src/components/CreateBountyModal.tsx`

**Current Styling**:
```tsx
<div className="bg-gray-900 w-full h-[98vh] sm:h-[95vh] md:h-auto md:max-w-lg rounded-t-2xl md:rounded-xl md:border md:border-gray-700 flex flex-col">
```

**Issues**:
- Solid gray background
- No glassmorphism
- Teal accent is hardcoded (not mode-aware)

**Mode Awareness**: None
**Role**: Creator (creating reward for someone else)
**State Flags**: None (form modal)

---

### 3. EditBountyModal

**Location**: `src/components/EditBountyModal.tsx`

**Current Styling**: Same as CreateBountyModal (gray-900 background)

**Issues**: Same as CreateBountyModal

**Mode Awareness**: None
**Role**: Creator
**State Flags**: None

---

### 4. ConfirmDeleteModal

**Location**: `src/components/ConfirmDeleteModal.tsx`

**Current Styling**:
```tsx
<div className="glass-card p-6 rounded-lg shadow-xl w-full max-w-md mx-4">
```

**Notes**:
- Uses `glass-card` class (glassmorphism ✓)
- Has AlertTriangle icon in red
- Uses `btn-danger-galactic` for confirm button

**Mode Awareness**: None
**Role**: System
**State Flags**: `isConfirming`

---

### 5. ConfirmationModal

**Location**: `src/components/ConfirmationModal.tsx`

**Current Styling**:
```tsx
<div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6">
```

**Issues**:
- Solid slate background (not glass)
- Red title color hardcoded

**Mode Awareness**: None
**Role**: System
**State Flags**: `loading`

---

### 6. ConfirmDialog

**Location**: `src/components/ConfirmDialog.tsx`

**Current Styling**:
```tsx
<div className="bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-sm m-auto border border-gray-700">
```

**Issues**:
- Solid gray background
- Red confirm button hardcoded

**Mode Awareness**: None
**Role**: System
**State Flags**: `isLoading`

---

### 7. ProofModal

**Location**: `src/components/ProofModal.tsx`

**Current Styling**:
```tsx
<div className="relative bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
```

**Issues**:
- Solid slate background
- No mode awareness

**Mode Awareness**: None
**Role**: Assignee (submitting proof)
**State Flags**: `uploadProgress`, `isSubmitting`

---

### 8. ProofSubmissionModal

**Location**: `src/components/ProofSubmissionModal.tsx`

**Current Styling**: Same as ProofModal

**Mode Awareness**: None
**Role**: Assignee
**State Flags**: `loading`

---

## Summary: Shell Analysis

### Distinct Visual Shells Currently Used

| Shell Type | Modals Using It | Background | Border |
|------------|-----------------|------------|--------|
| **Status-Colored Slab** | TaskCard Expanded | bg-{color}-900 | border-{color}-500 |
| **Solid Gray** | CreateBounty, EditBounty, ConfirmDialog | bg-gray-900 | border-gray-700 |
| **Solid Slate** | ConfirmationModal, ProofModal, ProofSubmission | bg-slate-800 | border-slate-700 |
| **Glass Card** | ConfirmDeleteModal | glass-card | (built-in) |

### Shells That Should Unify

**Mission Modal Shell** (new unified shell):
- TaskCard Expanded (assignee view)
- TaskCard Expanded (creator view)
- CreateBountyModal
- EditBountyModal
- ProofModal
- ProofSubmissionModal

**System Modal Shell** (can remain simpler):
- ConfirmDeleteModal
- ConfirmationModal
- ConfirmDialog

---

## Mode Awareness Gap

**Current State**: All modals use hardcoded teal/cyan accent. No mode-specific palettes.

**Required**: Each mode (Guild, Family, Couple) should have its own accent color that propagates through modals.

---

## Role Awareness Gap

**Current State**: Only TaskCard distinguishes between creator and assignee views, but visually they're identical except for available actions.

**Required**: Visual differentiation:
- **Assignee**: "Assigned to you" header, completion-focused actions
- **Creator**: "You created this" header, approval-focused actions
- **Store**: "Reward" header, redemption-focused actions

---

## State Indicator Gap

**Current State**: TaskCard uses full-background colors for state. Other modals don't show state.

**Required**: Subtle semantic chips/badges:
- Pending: amber chip with clock
- In Review: purple chip with eye
- Completed: green chip with checkmark
- Overdue: red chip with exclamation (thin border accent)

---

## Files to Modify for V2

| File | Change Type |
|------|-------------|
| `src/components/TaskCard.tsx` | Major refactor → use MissionModalShell |
| `src/components/CreateBountyModal.tsx` | Refactor → use MissionModalShell |
| `src/components/EditBountyModal.tsx` | Refactor → use MissionModalShell |
| `src/components/ProofModal.tsx` | Refactor → use MissionModalShell |
| `src/components/ProofSubmissionModal.tsx` | Consider merging with ProofModal |
| `src/components/ConfirmDeleteModal.tsx` | Minor: apply glassmorphism tokens |
| `src/components/ConfirmationModal.tsx` | Minor: apply glassmorphism tokens |
| `src/components/ConfirmDialog.tsx` | Consider merging with ConfirmationModal |
| `src/theme/themes.ts` | Add mode color palettes |
| (new) `src/theme/modalTheme.ts` | Create modal theming config |
| (new) `src/components/modals/MissionModalShell.tsx` | Create unified shell |

---

## Next Steps

1. Create `MODALS_V2_SPEC.md` with design tokens and implementation plan
2. Get approval from Saya
3. Implement MissionModalShell
4. Migrate modals one by one

---

*Rose – 2025-12-04*
