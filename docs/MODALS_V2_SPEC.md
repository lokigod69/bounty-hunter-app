# Modal V2 Specification
**Author**: Rose
**Date**: 2025-12-04
**Status**: Design Spec (Awaiting Approval)

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Core Design Tokens](#2-core-design-tokens)
3. [Mode Palettes](#3-mode-palettes)
4. [Role Variants](#4-role-variants)
5. [State Indicators](#5-state-indicators)
6. [Glassmorphism Shell Spec](#6-glassmorphism-shell-spec)
7. [Implementation Architecture](#7-implementation-architecture)
8. [Migration Plan](#8-migration-plan)

---

## 1. Design Philosophy

### Goals
- **Unified**: One structural shell, multiple visual themes
- **Semantic**: State communicated through subtle chips, not giant colored backgrounds
- **Mode-Aware**: Guild/Family/Couple each have distinct but cohesive palettes
- **Role-Clear**: Assignee, Creator, and Store views are visually differentiated
- **Glassmorphism**: Modern dark UI with depth and blur

### Anti-Goals
- No full-pane colored backgrounds for state (no bg-red-900)
- No inconsistent styling between similar modals
- No hardcoded colors that ignore mode

---

## 2. Core Design Tokens

These tokens are **mode-agnostic** and form the base dark UI.

### 2.1 Background Colors

| Token | Value | Tailwind Equivalent | Usage |
|-------|-------|---------------------|-------|
| `bg-page` | `#0a0e1a` | Custom | Main app background |
| `bg-surface` | `#1a1f3a` | Custom | Cards, panels |
| `bg-elevated` | `#252b4a` | Custom | Elevated content, dropdowns |
| `bg-glass` | `rgba(12, 18, 40, 0.85)` | Custom | Glassmorphism overlay |
| `bg-glass-hover` | `rgba(18, 26, 54, 0.9)` | Custom | Glass hover state |

### 2.2 Border Colors

| Token | Value | Tailwind Equivalent | Usage |
|-------|-------|---------------------|-------|
| `border-subtle` | `rgba(255, 255, 255, 0.08)` | `border-white/[0.08]` | Subtle separators |
| `border-default` | `rgba(255, 255, 255, 0.12)` | `border-white/[0.12]` | Default borders |
| `border-strong` | `rgba(255, 255, 255, 0.20)` | `border-white/20` | Emphasized borders |
| `border-accent` | (mode-dependent) | — | Accent-colored borders |

### 2.3 Shadow & Effects

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-elevated` | `0 8px 32px rgba(0, 0, 0, 0.4)` | Modal drop shadow |
| `shadow-glow-subtle` | `0 0 20px rgba(accent, 0.15)` | Subtle accent glow |
| `shadow-glow-strong` | `0 0 40px rgba(accent, 0.25)` | Strong accent glow |
| `backdrop-blur` | `blur(16px)` | `backdrop-blur-md` | Glass blur |
| `backdrop-blur-strong` | `blur(24px)` | `backdrop-blur-lg` | Stronger blur |

### 2.4 Typography

| Token | Size | Font | Usage |
|-------|------|------|-------|
| `text-modal-title` | 24px / 1.75rem | Mandalore | Modal title |
| `text-modal-subtitle` | 16px / 1rem | Poppins | Modal subtitle |
| `text-modal-body` | 14px / 0.875rem | Poppins | Body content |
| `text-modal-meta` | 12px / 0.75rem | Poppins | Meta info, labels |

### 2.5 Semantic Colors (Mode-Agnostic)

| Token | Value | RGB | Usage |
|-------|-------|-----|-------|
| `color-success` | `#22c55e` | `34, 197, 94` | Completed, approved |
| `color-warning` | `#f59e0b` | `245, 158, 11` | Pending, caution |
| `color-danger` | `#ef4444` | `239, 68, 68` | Error, delete |
| `color-info` | `#8b5cf6` | `139, 92, 246` | In review, info |

---

## 3. Mode Palettes

Each mode extends core tokens with its own accent personality.

### 3.1 Guild Mode

| Token | Value | RGB | Notes |
|-------|-------|-----|-------|
| `mode.accent` | `#20F9D2` | `32, 249, 210` | Electric cyan - gamified, sci-fi |
| `mode.accentSoft` | `rgba(32, 249, 210, 0.12)` | — | Glass tint |
| `mode.accentMuted` | `rgba(32, 249, 210, 0.5)` | — | Muted text |
| `mode.icon` | Shield / Sword | — | Role indicator |
| `mode.glassAccent` | `rgba(32, 249, 210, 0.08)` | — | Subtle glass tint |

**Vibe**: Sci-fi bounty hunter, arena, competitive

### 3.2 Family Mode

| Token | Value | RGB | Notes |
|-------|-------|-----|-------|
| `mode.accent` | `#F5D76E` | `245, 215, 110` | Warm gold - domestic, rewarding |
| `mode.accentSoft` | `rgba(245, 215, 110, 0.12)` | — | Glass tint |
| `mode.accentMuted` | `rgba(245, 215, 110, 0.5)` | — | Muted text |
| `mode.icon` | House / People | — | Role indicator |
| `mode.glassAccent` | `rgba(245, 215, 110, 0.06)` | — | Subtle glass tint |

**Vibe**: Cozy, family-friendly, nurturing

### 3.3 Couple Mode

| Token | Value | RGB | Notes |
|-------|-------|-----|-------|
| `mode.accent` | `#FF6FAE` | `255, 111, 174` | Pink-magenta - intimate, playful |
| `mode.accentSoft` | `rgba(255, 111, 174, 0.12)` | — | Glass tint |
| `mode.accentMuted` | `rgba(255, 111, 174, 0.5)` | — | Muted text |
| `mode.icon` | Heart | — | Role indicator |
| `mode.glassAccent` | `rgba(255, 111, 174, 0.06)` | — | Subtle glass tint |

**Vibe**: Romantic, light, personal

---

## 4. Role Variants

Within a given mode, the **role** determines header styling and action layout.

### 4.1 Assignee Role

**Context**: User is assigned to complete this mission.

| Element | Styling |
|---------|---------|
| Header Chip | `"Assigned to you"` with `mode.accent` background |
| Header Icon | Target / Flag icon |
| Primary CTA | Large, centered, `mode.accent` background, black text |
| Secondary CTA | "Close" ghost button |
| Delete Action | Hidden or deeply de-emphasized |

**Layout**:
```
┌────────────────────────────────────────┐
│ [Target]  Assigned to you    [State] X │  ← Header
├────────────────────────────────────────┤
│ [Avatar] From: Creator Name            │  ← Context
├────────────────────────────────────────┤
│                                        │
│  Description text...                   │  ← Body
│                                        │
│         ┌──────────────┐               │
│         │  🪙 50 L     │               │  ← Reward Block
│         └──────────────┘               │
│                                        │
├────────────────────────────────────────┤
│       [ Complete Task ]                │  ← Primary CTA
│          [ Close ]                     │  ← Secondary
└────────────────────────────────────────┘
```

### 4.2 Creator Role

**Context**: User created this mission and needs to review/approve.

| Element | Styling |
|---------|---------|
| Header Chip | `"You created this"` with `mode.accent` background |
| Header Icon | Stamp / Check icon |
| Primary CTA (review) | "Approve" with `color-success` background |
| Secondary CTA (review) | "Reject" with `color-danger` outline |
| Edit Action | Pencil icon button in header or body |
| Delete Action | Ghost red button in footer, separated from main CTAs |

**Layout (In Review State)**:
```
┌────────────────────────────────────────┐
│ [Stamp]  You created this  [State] [✎] │  ← Header + Edit
├────────────────────────────────────────┤
│ [Avatar] Assigned to: Assignee Name    │  ← Context
├────────────────────────────────────────┤
│                                        │
│  Description text...                   │
│                                        │
│  ┌─────────────────────────────────┐   │
│  │      📎 View Submitted Proof    │   │  ← Proof Block
│  └─────────────────────────────────┘   │
│                                        │
├────────────────────────────────────────┤
│   [ Approve ]        [ Reject ]        │  ← CTAs
│            [ Close ]                   │
│            [🗑 Delete]                  │  ← Destructive
└────────────────────────────────────────┘
```

### 4.3 Store Role

**Context**: User is viewing a reward they can redeem.

| Element | Styling |
|---------|---------|
| Header Chip | `"Reward"` or `"Gift"` with `mode.accent` background |
| Header Icon | Coin / Gift icon |
| Primary CTA | `"Redeem for X L"` with `mode.accent` gradient |
| Secondary CTA | "Close" ghost button |
| Affordability | Show "Need X more" if not affordable |

**Layout**:
```
┌────────────────────────────────────────┐
│ [Coin]  Reward             [Afford?] X │  ← Header
├────────────────────────────────────────┤
│                                        │
│         ┌──────────────┐               │
│         │   🎁 IMAGE   │               │  ← Reward Image
│         └──────────────┘               │
│                                        │
│  Reward Name                           │
│  Description text...                   │
│                                        │
├────────────────────────────────────────┤
│       [ Redeem for 50 L ]              │  ← Primary CTA
│          [ Close ]                     │
└────────────────────────────────────────┘
```

---

## 5. State Indicators

States are communicated through **subtle chips and thin accents**, not full-background colors.

### 5.1 State Chip Definitions

| State | Color | Icon | Text | Border Accent |
|-------|-------|------|------|---------------|
| Pending | `color-warning` (#f59e0b) | Clock | "Open" or "Pending" | None |
| In Review | `color-info` (#8b5cf6) | Eye | "In Review" | Thin purple top border |
| Completed | `color-success` (#22c55e) | Check | "Done" | Thin green top border |
| Overdue | `color-danger` (#ef4444) | Exclamation | "Overdue" | Thin red top border |
| Archived | `text-muted` | Archive | "Archived" | None |

### 5.2 Chip Component Spec

```tsx
<StateChip state="pending">
  // Renders:
  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                  bg-warning/15 text-warning text-xs font-medium">
    <Clock size={12} />
    <span>Open</span>
  </div>
</StateChip>
```

### 5.3 Border Accent Behavior

For states that warrant visual urgency, add a thin top border to the modal:

```css
/* Overdue */
.modal-shell[data-state="overdue"]::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #ef4444, transparent);
  border-radius: 12px 12px 0 0;
}
```

### 5.4 No Full-Pane Backgrounds

**Explicitly banned**:
```tsx
// ❌ DON'T DO THIS
className="bg-red-900"  // No full-pane status colors
className="bg-yellow-900"
className="bg-green-900"
```

**Exception**: Delete confirmation modals may use subtle red tint for urgency:
```tsx
// ✅ OK for delete confirm only
className="bg-glass border-danger/30"
```

---

## 6. Glassmorphism Shell Spec

### 6.1 Background Composition

```css
.mission-modal-shell {
  /* Base glass effect */
  background: rgba(12, 18, 40, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  /* Border */
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;

  /* Shadow */
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;

  /* Optional: Mode accent glow */
  /* Applied via CSS variable */
  --mode-accent-rgb: 32, 249, 210; /* Guild default */
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 40px rgba(var(--mode-accent-rgb), 0.1);
}
```

### 6.2 Inner Gradient (Optional Depth)

For additional depth, add a subtle inner gradient:

```css
.mission-modal-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.03) 0%,
    transparent 50%
  );
  pointer-events: none;
}
```

### 6.3 Structural Layout

```
┌─────────────────────────────────────────────────────┐
│ HEADER (fixed height: 60px)                         │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Icon] Title            [StateChip] [Close]     │ │
│ │ Context: From/To avatars + role label           │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ BODY (scrollable, flex-grow)                        │
│                                                     │
│  ┌─────────────────────┐  ┌──────────────────────┐  │
│  │ Description         │  │ Reward Block         │  │
│  │ (2/3 width)         │  │ (1/3 width)          │  │
│  │                     │  │ ┌────────────────┐   │  │
│  │ Lorem ipsum dolor   │  │ │   🪙 50 L      │   │  │
│  │ sit amet...         │  │ └────────────────┘   │  │
│  └─────────────────────┘  └──────────────────────┘  │
│                                                     │
│  [Proof Section if applicable]                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│ FOOTER (fixed height: ~80px)                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │      [ Primary CTA ]       [ Secondary ]        │ │
│ │             [🗑 Delete - if creator]            │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 6.4 Mobile Layout Adjustments

On mobile (< 640px):
- Header/Body/Footer stack vertically
- Reward block moves below description
- Full-width CTAs
- Bottom-sheet style animation (slide up from bottom)

---

## 7. Implementation Architecture

### 7.1 Component API

```tsx
interface MissionModalShellProps {
  // Core
  isOpen: boolean;
  onClose: () => void;

  // Theming
  mode: 'guild' | 'family' | 'couple';
  role: 'assignee' | 'creator' | 'store';
  state: 'pending' | 'review' | 'completed' | 'overdue' | 'archived';

  // Content
  title: string;
  description?: string;

  // Context
  fromUser?: { name: string; avatar?: string };
  toUser?: { name: string; avatar?: string };

  // Reward
  reward?: {
    type: 'credit' | 'text' | 'image';
    value: string | number;
    imageUrl?: string;
  };

  // Actions
  primaryAction?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    variant?: 'accent' | 'success' | 'danger';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  deleteAction?: {
    onClick: () => void;
    loading?: boolean;
  };

  // Custom content
  children?: React.ReactNode;
}
```

### 7.2 Usage Example

```tsx
<MissionModalShell
  isOpen={isExpanded}
  onClose={handleClose}
  mode={theme.id}
  role={isCreatorView ? 'creator' : 'assignee'}
  state={task.status}
  title={task.title}
  description={task.description}
  fromUser={{ name: creator.display_name, avatar: creator.avatar_url }}
  toUser={{ name: assignee.display_name, avatar: assignee.avatar_url }}
  reward={{
    type: task.reward_type,
    value: task.reward_text,
    imageUrl: task.image_url
  }}
  primaryAction={{
    label: 'Complete Task',
    onClick: () => setShowProofModal(true),
    variant: 'accent'
  }}
  secondaryAction={{
    label: 'Close',
    onClick: handleClose
  }}
/>
```

### 7.3 Theme Configuration File

Create `src/theme/modalTheme.ts`:

```typescript
import { ThemeId } from './theme.types';

export type ModalRole = 'assignee' | 'creator' | 'store';
export type ModalState = 'pending' | 'review' | 'completed' | 'overdue' | 'archived';

export interface ModeColors {
  accent: string;
  accentRgb: string;
  accentSoft: string;
  icon: string; // Lucide icon name
}

export const modeColors: Record<ThemeId, ModeColors> = {
  guild: {
    accent: '#20F9D2',
    accentRgb: '32, 249, 210',
    accentSoft: 'rgba(32, 249, 210, 0.12)',
    icon: 'Shield',
  },
  family: {
    accent: '#F5D76E',
    accentRgb: '245, 215, 110',
    accentSoft: 'rgba(245, 215, 110, 0.12)',
    icon: 'Home',
  },
  couple: {
    accent: '#FF6FAE',
    accentRgb: '255, 111, 174',
    accentSoft: 'rgba(255, 111, 174, 0.12)',
    icon: 'Heart',
  },
};

export interface RoleConfig {
  headerLabel: string;
  headerIcon: string;
}

export const roleConfig: Record<ModalRole, RoleConfig> = {
  assignee: {
    headerLabel: 'Assigned to you',
    headerIcon: 'Target',
  },
  creator: {
    headerLabel: 'You created this',
    headerIcon: 'Stamp',
  },
  store: {
    headerLabel: 'Reward',
    headerIcon: 'Coins',
  },
};

export interface StateConfig {
  label: string;
  icon: string;
  color: string;
  hasBorderAccent: boolean;
}

export const stateConfig: Record<ModalState, StateConfig> = {
  pending: {
    label: 'Open',
    icon: 'Clock',
    color: '#f59e0b',
    hasBorderAccent: false,
  },
  review: {
    label: 'In Review',
    icon: 'Eye',
    color: '#8b5cf6',
    hasBorderAccent: true,
  },
  completed: {
    label: 'Done',
    icon: 'Check',
    color: '#22c55e',
    hasBorderAccent: true,
  },
  overdue: {
    label: 'Overdue',
    icon: 'AlertTriangle',
    color: '#ef4444',
    hasBorderAccent: true,
  },
  archived: {
    label: 'Archived',
    icon: 'Archive',
    color: '#64748b',
    hasBorderAccent: false,
  },
};
```

### 7.4 Trade-offs Discussion

**Option A: CSS Variables + Tailwind**
- Pros: Works with existing Tailwind setup, easy to override
- Cons: Verbose class strings, harder to type-check

**Option B: CVA (Class Variance Authority)**
- Pros: Type-safe variants, cleaner component code
- Cons: New dependency, learning curve

**Option C: Styled-components / Emotion**
- Pros: Full dynamic theming
- Cons: Different paradigm from existing codebase

**Recommendation**: **Option A** for initial implementation, with CSS custom properties for mode colors. This aligns with existing codebase patterns and requires no new dependencies. CVA could be added later as a refinement.

---

## 8. Migration Plan

### Phase 1: Foundation (1 modal)

1. Create `src/theme/modalTheme.ts` with configuration
2. Create `src/components/modals/MissionModalShell.tsx`
3. Create supporting components:
   - `StateChip.tsx`
   - `ModalHeader.tsx`
   - `ModalBody.tsx`
   - `ModalFooter.tsx`
4. Convert **TaskCard Expanded (Assignee view)** to use new shell
5. Verify all states work correctly

### Phase 2: Creator View

1. Add creator-specific header/actions to MissionModalShell
2. Convert **TaskCard Expanded (Creator view)**
3. Add proof review block component

### Phase 3: Store View

1. Add store-specific layout to MissionModalShell
2. Evaluate if RewardCard inline expansion should use modal
3. Create reward claim confirmation modal if needed

### Phase 4: Form Modals

1. Create `FormModalShell.tsx` (variant of MissionModalShell for forms)
2. Convert **CreateBountyModal**
3. Convert **EditBountyModal**

### Phase 5: System Modals

1. Update **ConfirmDeleteModal** with glassmorphism tokens
2. Merge **ConfirmationModal** and **ConfirmDialog** into single component
3. Update **ProofModal** styling (may use MissionModalShell or separate)

### Phase 6: Cleanup

1. Remove old styling code from TaskCard
2. Delete unused modal components
3. Update any remaining hardcoded colors
4. Add documentation for modal system

---

## Appendix: CSS Variable Reference

Add to `src/index.css`:

```css
:root {
  /* Modal Shell Tokens */
  --modal-bg: rgba(12, 18, 40, 0.85);
  --modal-border: rgba(255, 255, 255, 0.1);
  --modal-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  --modal-radius: 16px;
  --modal-blur: 16px;

  /* Semantic Colors */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #8b5cf6;

  /* Mode colors (set dynamically) */
  --mode-accent: #20F9D2;
  --mode-accent-rgb: 32, 249, 210;
  --mode-accent-soft: rgba(32, 249, 210, 0.12);
}

[data-mode="family"] {
  --mode-accent: #F5D76E;
  --mode-accent-rgb: 245, 215, 110;
  --mode-accent-soft: rgba(245, 215, 110, 0.12);
}

[data-mode="couple"] {
  --mode-accent: #FF6FAE;
  --mode-accent-rgb: 255, 111, 174;
  --mode-accent-soft: rgba(255, 111, 174, 0.12);
}
```

---

*Rose – 2025-12-04*
