<!-- docs/ARCHITECTURE_FRONTEND.md: Front-end architecture overview and phased refactor plan for Bounty Hunter (UI/layout, interaction layer, cross‑platform readiness). -->

## 1. Tech Stack & Runtime

- **Framework**: React 18 SPA, bootstrapped with Vite.
- **Language**: TypeScript everywhere in `src/`.
- **Bundler / Dev tools**: Vite 6.x, ESLint, TailwindCSS, PostCSS.
- **Routing**: `react-router-dom` v6 (client-side routing).
- **Styling**: Tailwind utility classes plus a substantial global stylesheet (`index.css`) defining:
  - Mandalorian-themed color and typography tokens via CSS variables.
  - Reusable utility classes (`glass-card`, `btn-*`, `nav-item-galactic`, holographic effects).
  - A canonical z-index system (`--z-header`, `--z-mobile-menu`, `--z-modal-*`, `--z-critical-*`).
- **State management**:
  - `UIContext` (global UI bits such as mobile menu state).
  - Supabase session context via `SessionContextProvider`.
  - Domain-specific custom hooks (`useTasks`, `useIssuedContracts`, `useRewardsStore`, `useFriends`, etc.) for all data access and mutations.
  - Local component state for view-specific concerns (modals, filters, sorting, etc.).
- **Backend / data layer**:
  - Supabase for Postgres, Auth, Storage, Realtime, and RPC functions.
  - Typed client in `lib/supabase.ts` parameterized by generated types from `types/database.ts`.
- **3D / interaction libs**:
  - **None today**: this is a 2D glassmorphic SPA (no `three.js` / `react-three-fiber`).
  - Interaction complexity comes from mobile-friendly modals, pull-to-refresh, and audio/animation (`animejs`, `soundManager`, cursor trails) rather than a 3D scene.
- **Cross-platform runtime**:
  - Capacitor wrapper (`capacitor.config.ts`) with an existing iOS project (`ios/App`).
  - `docs/ios/SETUP.md` describes the Capacitor-based packaging and workflow.

**Assessment**

- **Solid**: Modern React/TS stack, Supabase integration, typed database access, and a deliberate CSS token system for theme and z-index.
- **Fragile**: Some UI elements still bypass the z-index token system (`z-50` usage, ad-hoc z-classes), and front-end components embed Supabase logic directly, which tightens coupling to the web DOM and makes reuse in a future iOS/native layer harder.
- **Inconsistent**: Multiple modal implementations and confirm dialogs with slightly different styling and layering rules; mixed usage of global `glass-card` design system vs. inline Tailwind-only layouts.

---

## 2. Layout & Design System

### 2.1 Layout Primitives

**PageContainer** (`src/components/layout/PageContainer.tsx`)
- Standardized page container providing consistent max-width (5xl), horizontal centering, and responsive padding
- Used by all main pages: Dashboard, IssuedPage, RewardsStorePage, ArchivePage, Friends, ProfileEdit

**PageHeader** (`src/components/layout/PageHeader.tsx`)
- Standardized page header with title, optional subtitle, and action buttons
- Title uses `.text-display` and `.app-title` classes
- Subtitle uses `.text-meta` for secondary text

**PageBody** (`src/components/layout/PageBody.tsx`)
- Standardized page body wrapper providing consistent vertical spacing (`space-y-6`)

**StatsRow** (`src/components/layout/StatsRow.tsx`)
- Reusable component for displaying summary statistics (used in Dashboard, IssuedPage)
- Consistent icon/value/label layout with responsive spacing

### 2.2 Card Primitives

**BaseCard** (`src/components/ui/BaseCard.tsx`)
- Base card component providing consistent styling across all cards
- Variants: `glass` (default, uses `.glass-card`), `solid`, `bordered`
- Standardized padding via `.spacing-card` class
- Used by: `TaskCard`, `RewardCard`, `FriendCard`

### 2.3 Typography & Spacing Scale

**Typography Roles** (defined in `src/index.css`):
- `.text-display` - Very large titles (4xl/5xl, MandaloreTitle font)
- `.text-title` - Page/section titles (3xl, Mandalore font)
- `.text-subtitle` - Subtitles (xl, Poppins semibold)
- `.text-body` - Body text (base, Poppins medium)
- `.text-meta` - Small labels/timestamps (xs/sm, Poppins regular)

**Spacing Utilities** (defined in `src/index.css`):
- `.spacing-page` - Page-level responsive padding
- `.spacing-section` - Section-level vertical spacing
- `.spacing-card` - Card padding (p-4 sm:p-6)
- `.spacing-grid` - Grid gaps (gap-4 sm:gap-6)

---

## 3. Repository Structure (Frontend-Focused, 3 Levels)

```text
bounty-hunter-app/
  src/
    App.tsx                 # Root app + routing
    main.tsx                # React entrypoint
    index.css               # Global theme, typography, z-index system, design tokens
    components/             # Reusable UI components
      Layout.tsx            # App shell, header, HUD, mobile menu
      TaskCard.tsx          # Contract card + expanded modal (portal)
      RewardCard.tsx        # Rewards/bounties listing card
      TaskForm.tsx          # Create/edit contract modal
      CreateBountyModal.tsx # Create bounty modal (portal)
      EditBountyModal.tsx   # Edit bounty modal
      ConfirmationModal.tsx # Generic confirm modal (legacy z-index)
      ConfirmDeleteModal.tsx# Critical overlay confirm modal (new z-index naming)
      ConfirmDialog.tsx    # Rewards-specific confirm dialog (legacy z-index)
      ProofModal.tsx        # File proof upload modal
      ProofSubmissionModal.tsx # Text proof modal
      ui/                   # Base UI primitives
        BaseCard.tsx        # Card component with variants
      layout/               # Layout primitives
        PageContainer.tsx   # Page wrapper
        PageHeader.tsx      # Page header
        PageBody.tsx        # Page body wrapper
        StatsRow.tsx        # Stats summary component
    pages/                  # Screen-level components
      Dashboard.tsx         # Mission Inbox (P3)
      IssuedPage.tsx        # Issued missions management
      RewardsStorePage.tsx  # Reward Store (P4)
      FriendsPage.tsx       # Friends/Crew/Family management
      ProfileEdit.tsx       # Profile editing
      ArchivePage.tsx       # Archived contracts
      Onboarding.tsx        # First-time experience (P2)
    hooks/                  # Custom hooks for data access
      useTasks.ts           # Task/contract CRUD operations
      useAssignedContracts.ts # Contracts assigned to user
      useIssuedContracts.ts  # Contracts issued by user
      useRewardsStore.ts    # Rewards store operations
      useFriends.ts         # Friendships management
      useUserCredits.ts     # User credits balance
      useDailyMissionStreak.ts # Daily missions & streaks (P5)
    core/                   # Domain logic (pure functions)
      contracts/            # Contract status transitions
      credits/              # Credit awarding rules
      proofs/               # Proof validation
    context/                # React contexts
      ThemeContext.tsx      # Theme system (P1)
      UIContext.tsx         # UI state (modals, mobile menu)
    lib/                    # Utilities & config
      supabase.ts           # Supabase client
      overlayRoot.tsx       # Portal root for modals
    types/                  # TypeScript types
      database.ts           # Generated Supabase types
      custom.ts             # Custom domain types
    theme/                  # Theme system
      theme.types.ts        # Theme type definitions
      themes.ts             # Theme implementations
```

---

## 4. Routing & Navigation

### 4.1 Route Structure

All routes defined in `src/App.tsx`:

- **`/` → `Dashboard`** (Mission Inbox)
  - Main landing page after login.
  - Shows contracts assigned to the current user, grouped by status.
  - Uses `useAssignedContracts()` and `useIssuedContracts()` hooks.
- **`/issued` → `IssuedPage`**
  - Contracts created by the current user.
  - Uses `useIssuedContracts()` hook.
- **`/friends` → `FriendsPage`**
  - Friends/Crew/Family management.
  - Uses `useFriends()` hook.
- **`/archive` → `ArchivePage`**
  - Historical/completed contracts.
  - Uses `useArchivedContracts()` and `TaskCard` in read-only mode.
- **`/rewards-store` → `RewardsStorePage`**
  - Rewards/bounties marketplace.
  - Uses `useRewardsStore()`, `RewardCard`, `CreateBountyModal`, `EditBountyModal`, `ConfirmDialog`.
- **`/my-rewards` → `MyCollectedRewardsPage`**
  - Intended view for claimed rewards; currently a partial stub despite having `useCollectedRewards()`.
- **`/profile/edit` → `ProfileEdit`**
  - Wraps `ProfileEditModal` and profile editing logic.
- **`*` → redirect to `/`**
  - Simple catch-all redirect instead of a dedicated 404.

All authenticated routes share `Layout` as the top-level shell (header/HUD, mobile menu, cursor/credits UI, `Outlet` for the page).

### 4.2 Layout & Duplication

- **Shared layout via `Layout`**:
  - Sticky header with nav, logo, user avatar, cursor trail toggle, logout button.
  - Mobile nav drawer overlay.
  - Main content region (`<main className="flex-1 container mx-auto px-4 py-6 main-content no-bounce"> <Outlet /> </main>`).
- **Per-page inconsistencies**:
  - Some pages (e.g. `Dashboard`, `IssuedPage`) define their own max-width containers and background gradients inside the main area; others use simpler `container` wrappers.
  - Multiple pages implement their own "summary stats" header cards with manually chosen icons and spacing.
  - Different heading font treatments (`app-title` vs. `gradient-text` vs. plain `text-3xl font-bold`) are used across screens.

**Assessment**

- **Solid**: Routing structure is simple and understandable; all protected screens share a single layout shell; `ProtectedRoute` centralizes auth gating.
- **Fragile**: Individual pages diverge in how they treat padding, max-width, and backgrounds; this makes it hard to guarantee that every "room" feels like part of a single cohesive space.
- **Inconsistent**: The nav labels and semantics ("Contracts" vs. "Missions" vs. "Bounties") are themed correctly but not encapsulated in layout primitives; summary stats are duplicated in `Dashboard` and `IssuedPage` with slightly different styling.

---

## 5. Core Domains & Modules

### 4.1 Contracts / Tasks Domain

- **Where implemented**
  - Data hooks: `useTasks.ts`, `useAssignedContracts.ts`, `useIssuedContracts.ts`, `useArchivedContracts.ts`.
  - UI components: `TaskCard.tsx`, `TaskCardSkeleton.tsx`, `TaskForm.tsx`, `ConfirmationModal.tsx`, `ConfirmDeleteModal.tsx`, `ProofModal.tsx`, `ProofSubmissionModal.tsx`.
  - Screens: `Dashboard.tsx` (Mission Inbox), `IssuedPage.tsx`, `ArchivePage.tsx`.
- **Data model**
  - `tasks` table with fields such as `title`, `description`, `status`, `reward_type`, `reward_text`, `assigned_to`, `created_by`, `deadline`, `proof_required`, `proof_url`, `proof_type`, `is_archived`, `completed_at`.
  - Strongly typed via `Database['public']['Tables']['tasks']` and extended types in `types/custom.ts`.
- **Mission Inbox (Dashboard.tsx) - P3 Implementation**
  - **Grouping Logic**: Client-side filtering and sorting using `useMemo` for performance
    - **Do this now**: Filters tasks with status `pending`, `in_progress`, `rejected`, `overdue`, or `null`
      - Sorted by deadline: overdue first, then soonest deadline, then by creation date (newest first)
    - **Waiting for approval**: Filters tasks with status `review` (where current user is assignee and has submitted proof)
    - **Recently completed**: Filters tasks with status `completed`, sorted by `completed_at` (most recent first), limited to last 10
  - **Status Mapping**:
    - Active statuses: `pending`, `in_progress`, `rejected`, `overdue`, `null` → "Do this now"
    - `review` → "Waiting for approval"
    - `completed` → "Recently completed"
  - **Issued Missions Summary**: Uses `useIssuedContracts` hook to show summary stats
    - Counts missions awaiting proof (status `pending` or `in_progress`)
    - Counts missions pending approval (status `review`)
    - Only displayed if user has issued missions
  - **Theme Integration**: Section titles use theme strings (`sectionDoNowTitle`, `sectionWaitingApprovalTitle`, `sectionCompletedTitle`, `sectionIssuedSummaryTitle`)
- **Data flow**
  - Hooks encapsulate Supabase queries and subscriptions; pages call hooks and pass results to components.
  - Some operations (e.g. archiving a task in `TaskCard.handleArchive`) directly use `supabase` instead of going through hooks, creating cross-cutting dependencies.

**Assessment**

- **Solid**
  - Domain-specific hooks provide a clear abstraction for fetching and mutating contract data.
  - Status transitions and proof handling reflect real-world flows (pending ⇒ review ⇒ completed, with proof upload and approval).
- **Fragile**
  - Business rules (e.g. when to award credits, who can update which statuses) are spread across `Dashboard`, `IssuedPage`, and `TaskCard`, making it easy to introduce inconsistencies.
  - `IssuedPage` directly calls the `increment_user_credits` RPC from the client, which is a known security risk and couples UI to privileged operations.
- **Inconsistent**
  - Some code paths use hooks for updates; others reach for `supabase` directly (e.g. archiving, deletion, approval), which weakens the "hooks as domain boundary" convention.

### 4.1.1 Daily Missions & Streaks (P5 Implementation)

- **Data Model** (`supabase/migrations/20250127000000_add_daily_missions_and_streaks.sql`):
  - `tasks.is_daily` boolean column (default: false) - marks missions as daily recurring
  - `daily_mission_streaks` table tracks streak counts per contract/user
    - Columns: `contract_id`, `user_id`, `streak_count`, `last_completion_date` (date only, no time)
    - Unique constraint on `(contract_id, user_id)` ensures one streak record per contract/user pair
    - RLS policies: users can read/update streaks for contracts they're assigned to
- **Domain Logic** (`src/core/contracts/contracts.domain.ts`):
  - `isDailyMission()` - checks if contract has `is_daily` flag set
  - `computeStreakAfterCompletion()` - pure function computing streak updates based on date comparison
  - `computeNewStreakCount()` - helper taking current streak and computing new count
  - Streak rules (date-based, UTC normalized):
    - No previous completion → streak = 1
    - Last completion was yesterday → streak increments
    - Last completion was today → streak stays same (no increment)
    - Gap detected (last completion > 1 day ago) → streak resets to 1
- **Credits Domain** (`src/core/credits/credits.domain.ts`):
  - `applyStreakBonus()` - applies +10% per streak day (starting from day 2), capped at 2x multiplier
  - Integrated into `decideCreditsForApprovedContract()` via `isDaily` and `streakCount` context fields
  - Streak bonus only applies to daily missions with `streakCount > 1`
- **Hooks** (`src/hooks/useDailyMissionStreak.ts`):
  - `fetchStreak()` - fetches streak for single contract/user
  - `fetchStreaksForContracts()` - batch fetches streaks for multiple contracts (used in Dashboard)
  - `updateStreakAfterCompletion()` - updates/creates streak after completion, returns new streak count
  - `useDailyMissionStreak()` - React hook for fetching streak data
- **Approval Flow** (`src/pages/IssuedPage.tsx`):
  - On approval of daily mission: calls `updateStreakAfterCompletion()` before awarding credits
  - Passes `streakCount` to `decideCreditsForApprovedContract()` for bonus calculation
  - Shows streak bonus message in success toast (e.g., "10 credits awarded (3-day streak bonus!)")
- **UI Components**:
  - `TaskForm.tsx`: Added "Make this a daily mission" checkbox, saves `is_daily` flag on create/edit
  - `TaskCard.tsx`: Shows theme-aware "Daily" badge and streak count (🔥 N-day streak) for daily missions
  - `Dashboard.tsx`: Fetches streaks for all daily missions using `fetchStreaksForContracts()`, passes to TaskCard
- **Theme Integration** (`src/theme/theme.types.ts`, `src/theme/themes.ts`):
  - Added `dailyLabel` and `streakLabel` to `ThemeStrings`
  - Guild: "Daily mission", Family: "Daily chore", Couple: "Daily moment"
  - Streak label is consistent across themes ("streak")

### 4.2 Rewards / Bounties Domain

- **Where implemented**
  - Hooks: `useRewardsStore.ts`, `useCreateBounty.ts`, `useUpdateBounty.ts`, `useDeleteBounty.ts`, `usePurchaseBounty.ts`, `useCollectedRewards.ts`, `useUserCredits.ts`.
  - Components: `RewardCard.tsx`, `CreateBountyModal.tsx`, `EditBountyModal.tsx`, `ConfirmDialog.tsx`, `CreditDisplay.tsx`.
  - Screen: `RewardsStorePage.tsx`, stub `MyCollectedRewardsPage.tsx`.
- **Data model**
  - `rewards_store` table for active bounties, `collected_rewards` for claims, `user_credits` for balances, plus related RPCs (`create_reward_store_item`, `update_reward_store_item`, `purchase_bounty`, etc.).
- **Reward Store Layout & Credits Summary (P4 Implementation)**
  - **Credits Summary**: Prominent card at top of `RewardsStorePage.tsx` showing current user credits
    - Uses `useUserCredits()` hook to fetch balance
    - Calculates affordable rewards count and distance to next reward (client-side filtering)
    - Theme-aware labels (`storeCreditsLabel`, `storeCanAffordLabel`, `storeCantAffordLabel`)
  - **RewardCard Design**: Aspirational card layout with clear visual hierarchy
    - Image/emoji area (h-40 md:h-48) with gradient backgrounds
    - Prominent price display using `CreditDisplay` with premium shimmer
    - Affordability checks: accepts `currentCredits` prop, shows "Need N more" hint for unaffordable rewards
    - Disabled state styling (opacity, overlay) for unaffordable rewards
    - Theme integration: uses theme strings for token labels (`tokenSingular`, `tokenPlural`)
  - **Empty State**: Theme-aware empty state with icon, title (`storeEmptyTitle`), body (`storeEmptyBody`), and CTA
  - **Mission Inbox Integration**: Prompt card in `Dashboard.tsx` when user has credits > 0
    - Shows credit count and link to Reward Store
    - Helps surface the store and remind users why credits matter

**Assessment**

- **Solid**
  - Clear separation between store items and collected rewards.
  - Purchase flow uses RPCs with proper error handling.
- **Fragile**
  - Credit balance updates rely on manual refetching after purchases; no realtime subscription for `user_credits` table changes.
  - Purchase errors are shown via toast but may not be surfaced in UI if the hook fails silently.
- **Inconsistent**
  - Some reward operations go through `useRewardsStore`, others through separate hooks (`useCreateBounty`, `usePurchaseBounty`), creating confusion about which hook to use.

---

## 6. Error Handling & Resilience (P6)

### 6.1 Error Handling Patterns

**Hook Return Patterns**:
- Most hooks follow a consistent pattern: `{ data, loading, error, refetch }`
- Error types: `string | null` (most hooks) or `Error | null` (some hooks)
- Loading states: `boolean`

**Current Error Handling Status**:

- **useAssignedContracts**: ✅ Returns `error: string | null`, Dashboard displays error state
- **useIssuedContracts**: ✅ Returns `error: string | null`, IssuedPage should display errors
- **useRewardsStore**: ✅ Returns `rewardsError: string | null`, shows toast but may not display inline
- **useFriends**: ✅ Returns `error: string | null`, FriendsPage should display errors
- **useUserCredits**: ✅ Returns `error: string | null`, gracefully handles missing records
- **useTasks**: ✅ Returns `error: string | null`, but may not be consistently displayed

**Risk Points**:

1. **Dashboard.tsx**: ✅ Has error state display, but doesn't show retry button
2. **RewardsStorePage.tsx**: ⚠️ Uses `rewardsError` but may not display it inline (only toast)
3. **Onboarding**: ⚠️ May not handle Supabase errors gracefully, could leave users stuck
4. **Direct Supabase calls**: Some components call `supabase` directly without error handling
5. **Streak updates**: `updateStreakAfterCompletion()` errors are logged but don't block approval flow (intentional, but should be visible)

**Error Display Patterns**:

- **Good**: Dashboard shows full-page error with icon and message
- **Needs improvement**: RewardsStorePage should show inline error state
- **Needs improvement**: Onboarding steps should show errors and allow skip paths

### 6.2 System Status & Diagnostics

**P6 Addition**: Simple debug/status component to quickly identify backend issues:
- Location: `/profile/edit` or `/debug` route (dev-only or feature flag)
- Shows: User ID, theme mode, Supabase health check (ping test)
- Purpose: Quick diagnostics when "something is broken"

---

## 7. Theme System (P1)

- **Implementation**: `src/theme/themes.ts` defines three theme modes (Guild, Family, Couple)
- **Context**: `ThemeContext` provides `theme` and `setThemeId` via `useTheme()` hook
- **Persistence**: Theme preference stored in `localStorage` (key: `bounty_theme`)
- **Theme Strings**: Centralized labels in `ThemeStrings` interface, populated per theme
- **Usage**: Components use `useTheme()` to access theme-aware strings and colors

**Theme Coverage**:
- ✅ Navigation labels
- ✅ Page titles (Mission Inbox, Reward Store, Friends)
- ✅ Section titles (Do this now, Waiting for approval, etc.)
- ✅ Reward Store labels
- ✅ Daily mission labels (P5)
- ⚠️ Some hard-coded strings still exist (needs P6 audit)

---

## 8. First-Time Experience (P2)

- **Implementation**: `/onboarding` route with 4-step wizard
- **Steps**: Mode selection → Create reward → Invite someone → Create mission
- **Gate**: `FTXGate` component checks `localStorage['bounty_onboarding_completed']` and user data
- **Completion**: Sets `bounty_onboarding_completed` flag and redirects to Mission Inbox
- **Error Handling**: ⚠️ Needs improvement (P6) - should allow skip paths and show errors clearly

---

## 9. Cross-Platform Readiness

- **Capacitor**: iOS project exists in `ios/App`
- **Mobile considerations**: Pull-to-refresh, touch targets, responsive layouts
- **Known gaps**: Some components may not be fully mobile-optimized

---

## 10. Refactor Roadmap

### Phase 1: Layout Consistency (In Progress)
- ✅ Standardize page containers (`PageContainer`, `PageHeader`, `PageBody`)
- ✅ Create reusable card components (`BaseCard`)
- ⚠️ Migrate all pages to use layout primitives

### Phase 2: Error Handling (P6)
- ✅ Document error handling patterns
- ⚠️ Add consistent error states to all pages
- ⚠️ Add system status/debug component
- ⚠️ Improve onboarding error handling

### Phase 3: Theme Integration (P6)
- ✅ Core theme system in place
- ⚠️ Audit and replace hard-coded strings
- ⚠️ Ensure all flows use theme strings

### Phase 4: Mobile Optimization
- ⚠️ Audit touch targets and spacing
- ⚠️ Test on real devices
- ⚠️ Optimize performance for mobile

---

## 11. Testing & Quality

- **Manual testing**: See `docs/V1_TESTING_CHECKLIST.md` (P6)
- **Error scenarios**: Test with Supabase offline/unreachable
- **Theme switching**: Verify all strings update correctly
- **Onboarding**: Test skip paths and error recovery
