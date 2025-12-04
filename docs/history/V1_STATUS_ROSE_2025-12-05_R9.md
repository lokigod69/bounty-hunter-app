# V1 Status Report – Rose (Round 9)
**Date**: 2025-12-05
**Status**: MissionModalShell Foundation + TaskCard Migration

---

## Session Summary

Implemented the Mission Modal V2 design system foundation:
1. Created unified `MissionModalShell` component with glassmorphism design
2. Migrated TaskCard expanded view (assignee + creator) to use the new shell
3. Added mode/role/state theming support

---

## Files Created

| File | Purpose |
|------|---------|
| `src/theme/modalTheme.ts` | Modal theming configuration (modeColors, roleConfig, stateConfig) |
| `src/components/modals/StateChip.tsx` | State indicator chip component |
| `src/components/modals/MissionModalShell.tsx` | Unified modal shell with glassmorphism |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/index.css` | Added modal animations + CSS variables for mode colors |
| `src/components/TaskCard.tsx` | Replaced inline expanded modal with MissionModalShell |

---

## Implementation Details

### MissionModalShell API

```tsx
<MissionModalShell
  isOpen={boolean}
  onClose={() => void}
  mode="guild" | "family" | "couple"
  role="assignee" | "creator" | "store"
  state="pending" | "review" | "completed" | "overdue" | "archived"
  title={string}
  description={string}
  fromUser={{ name: string, avatar?: string }}
  toUser={{ name: string, avatar?: string }}
  reward={{ type: 'credit' | 'text' | 'image', value: string | number, imageUrl?: string }}
  primaryAction={{ label, onClick, loading?, variant?: 'accent' | 'success' | 'danger' }}
  secondaryAction={{ label, onClick, loading?, variant? }}
  deleteAction={{ onClick, loading? }}
  isDaily={boolean}
  streakCount={number}
>
  {/* Custom children content */}
</MissionModalShell>
```

### Mode Colors

| Mode | Accent | RGB |
|------|--------|-----|
| Guild | `#20F9D2` (cyan) | `32, 249, 210` |
| Family | `#F5D76E` (gold) | `245, 215, 110` |
| Couple | `#FF6FAE` (pink) | `255, 111, 174` |

### State Configuration

| State | Icon | Color | Border Accent |
|-------|------|-------|---------------|
| Pending | Clock | `#f59e0b` (amber) | No |
| In Review | Eye | `#8b5cf6` (purple) | Yes |
| Completed | Check | `#22c55e` (green) | Yes |
| Overdue | AlertTriangle | `#ef4444` (red) | Yes |
| Archived | Archive | `#64748b` (slate) | No |

### TaskCard Mapping

**Status → Modal State**:
```typescript
function mapTaskStatusToModalState(status, isArchived, deadline) {
  if (isArchived) return 'archived';
  if ((status === 'pending' || status === 'in_progress') && deadline < now) return 'overdue';

  'pending' | 'in_progress' → 'pending'
  'review' → 'review'
  'completed' → 'completed'
  'rejected' → 'overdue'
}
```

**Role Mapping**:
- `isCreatorView: true` → `role: 'creator'`
- `isCreatorView: false` → `role: 'assignee'`

**Actions by Role/State**:

| Role | State | Primary | Secondary | Delete |
|------|-------|---------|-----------|--------|
| Assignee | pending/in_progress | "Complete Task" | — | — |
| Assignee | review/completed | — | — | — |
| Creator | pending | — | — | "Delete mission" |
| Creator | review | "Approve" (success) | "Reject" (danger) | "Delete mission" |
| Creator | completed | — | — | — |

---

## CSS Additions

### Modal Animations

```css
/* Mobile: Bottom-sheet slide */
.animate-modal-slide-up { animation: modal-slide-up 0.25s ease-out forwards; }
.animate-modal-slide-down { animation: modal-slide-down 0.2s ease-in forwards; }

/* Desktop: Scale animation */
.animate-modal-scale-up { animation: modal-scale-up 0.2s ease-out forwards; }
.animate-modal-scale-down { animation: modal-scale-down 0.15s ease-in forwards; }
```

### Mode Color Variables

```css
:root {
  --mode-accent: #20F9D2;
  --mode-accent-rgb: 32, 249, 210;
  --mode-accent-soft: rgba(32, 249, 210, 0.12);
}

[data-mode="family"] {
  --mode-accent: #F5D76E;
  /* ... */
}

[data-mode="couple"] {
  --mode-accent: #FF6FAE;
  /* ... */
}
```

---

## Glassmorphism Design

### Modal Shell Styling

```tsx
style={{
  background: 'rgba(12, 18, 40, 0.92)',
  backdropFilter: isMobile ? 'blur(16px)' : 'blur(24px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: `
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 0 40px rgba(${modeConfig.accentRgb}, 0.1)
  `,
}}
```

### State Border Accent

For states with `hasBorderAccent: true`, a thin colored gradient bar appears at the top:

```tsx
<div
  className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
  style={{
    background: `linear-gradient(90deg, transparent, ${stateConf.color}, transparent)`,
  }}
/>
```

---

## Removed from TaskCard

- `modalBgColor` variable (status-colored full backgrounds)
- `renderActionButtonsInModal()` function
- `isAnimatingOut` state (MissionModalShell handles its own animation)
- `viewingProof` state (unused)
- Inline modal portal (replaced with MissionModalShell)

---

## Build Status

| Check | Status |
|-------|--------|
| TypeScript | ✅ No errors |
| Build | ✅ Passes (3.10s) |
| Bundle | 679KB (warning only) |

---

## Verification Checklist

### Guild Mode - Assignee View
- [ ] Click mission card assigned to you
- [ ] MissionModalShell opens with cyan accent
- [ ] Header shows "Assigned to you" with Target icon
- [ ] State chip shows correct state (Open/In Review/Done)
- [ ] "Complete Task" button visible for pending tasks
- [ ] Proof section visible after submission

### Guild Mode - Creator View
- [ ] Click mission you created
- [ ] Header shows "You created this" with Stamp icon
- [ ] For review state: "Approve" (green) and "Reject" (red) buttons
- [ ] "Delete mission" ghost button in footer
- [ ] Proof review section visible

### Mobile Layout
- [ ] Modal slides up from bottom
- [ ] Stacked layout (description above reward)
- [ ] Full-width buttons

### Desktop Layout
- [ ] Modal scales in from center
- [ ] Two-column layout (description 2/3, reward 1/3)
- [ ] Blur(24px) backdrop

---

## Follow-up Issues

1. **DoubleCoinValue import**: Currently imported in MissionModalShell - may need to verify path works in all contexts
2. **Theme.id type**: Using `theme.id` from ThemeContext to pass mode - verified working
3. **Proof modal**: Still uses old ProofModal component - Phase 4 migration pending

---

## Next Phases (Not Implemented Yet)

- Phase 3: Convert CreateBountyModal / EditBountyModal
- Phase 4: Update ProofModal with new styling
- Phase 5: System modals (ConfirmDelete, etc.)

---

*Rose – 2025-12-05 R9*
