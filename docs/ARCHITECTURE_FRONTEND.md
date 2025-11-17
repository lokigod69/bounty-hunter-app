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

## 2. Repository Structure (Frontend-Focused, 3 Levels)

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
      ConfirmDialog.tsx     # Rewards-specific confirm dialog (legacy z-index)
      ProofModal.tsx        # File proof upload modal
      ProofSubmissionModal.tsx # Text proof modal
      ImageLightbox.tsx     # Critical overlay image viewer
      FriendCard.tsx        # Friend/guild member card
      FriendSelector.tsx    # Friend dropdown for task assignment
      UserCredits.tsx       # Live credits HUD widget
      CursorTrail.tsx       # Laser cursor effect
      HuntersCreed.tsx      # Quote display / flavor
      coin/                 # Coin/credit visualizations
    pages/                  # Route-level screens
      Login.tsx             # Magic-link auth
      Dashboard.tsx         # "Contracts" view (assigned contracts)
      IssuedPage.tsx        # "Missions" creator view (issued contracts)
      ArchivePage.tsx       # Archive of completed contracts
      Friends.tsx           # Guild / friendships management
      RewardsStorePage.tsx  # Rewards marketplace
      MyCollectedRewardsPage.tsx # Stub for claimed rewards
      ProfileEdit.tsx       # Profile editing shell
    hooks/                  # Feature-specific hooks (data + side effects)
      useAuth.ts
      useTasks.ts
      useAssignedContracts.ts
      useIssuedContracts.ts
      useArchivedContracts.ts
      useFriends.ts
      useRewardsStore.ts
      useCreateBounty.ts
      useUpdateBounty.ts
      useDeleteBounty.ts
      usePurchaseBounty.ts
      useCollectedRewards.ts
      useDailyQuote.ts
      useClickOutside.ts
      useShimmerDuration.ts
    context/
      UIContext.tsx         # Global UI state (mobile menu)
    lib/
      supabase.ts           # Typed Supabase client
      quotes.ts             # Static quotes data
    types/
      database.ts           # Supabase-generated DB types
      custom.ts             # Task/profile helpers
      app-specific-types.ts
      rpc-types.ts
    utils/
      getErrorMessage.ts    # Error categorization
      soundManager.ts       # Audio playback helpers
      dateUtils.ts

  docs/
    overview.md             # Product & repo overview
    architecture.md         # System-level architecture
    state-and-events.md     # State distribution & flows
    api-map.md              # All backend API interactions
    data-model.md           # Database schema
    runbook.md              # Setup, migrations, deployment
    ios/SETUP.md            # Capacitor iOS integration

  supabase/
    migrations/             # Database tables, RLS policies, RPCs
    functions/              # Edge function: notify-reward-creator

  public/
    fonts/                  # Mandalore, Howdybun font families
    sounds/                 # Credit transfer / UI SFX
    logo5.png

  capacitor.config.ts       # Capacitor app configuration
  vite.config.ts            # Vite build config
  tailwind.config.js        # Tailwind theme extension
  package.json              # Scripts & dependencies
  vercel.json               # Frontend deployment config
```

**Assessment**

- **Solid**: Clear layering of `pages` → `components` → `hooks` → `lib`, with doc coverage in `docs/` that matches reality reasonably well.
- **Fragile**: Some divergence between docs and code (e.g. docs mention additional `npm run ios:*` scripts that are not present in `package.json`; RLS and migration status in docs is ahead of the actual SQL).
- **Inconsistent**: UI primitives (modals, confirm dialogs) are scattered across `components/` without a single modal/overlay abstraction; multiple confirm components overlap in purpose.

---

## 3. Routing & Screens

### 3.1 Route Map

Defined in `App.tsx`:

- **`/login` → `Login`**
  - Magic-link authentication flow via Supabase (`supabase.auth.signInWithOtp`).
  - Very self-contained; no global layout.
- **`/` (root) → `Dashboard` (inside `Layout` via `ProtectedRoute`)**
  - Main "Contracts" view for tasks assigned to the current user.
  - Uses `useAssignedContracts()` and `TaskCard` grid.
- **`/issued` → `IssuedPage`**
  - Missions created by the current user.
  - Uses `useIssuedContracts()`, `TaskCard` (creator view), and `TaskForm` as a modal for creating contracts.
- **`/friends` → `Friends`**
  - Guild/friendships management.
  - Uses `useFriends()`, `FriendCard`, search, pending/accepted tabs.
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

### 3.2 Layout & Duplication

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

## 4. Core Domains & Modules

### 4.1 Contracts / Tasks Domain

- **Where implemented**
  - Data hooks: `useTasks.ts`, `useAssignedContracts.ts`, `useIssuedContracts.ts`, `useArchivedContracts.ts`.
  - UI components: `TaskCard.tsx`, `TaskCardSkeleton.tsx`, `TaskForm.tsx`, `ConfirmationModal.tsx`, `ConfirmDeleteModal.tsx`, `ProofModal.tsx`, `ProofSubmissionModal.tsx`.
  - Screens: `Dashboard.tsx`, `IssuedPage.tsx`, `ArchivePage.tsx`.
- **Data model**
  - `tasks` table with fields such as `title`, `description`, `status`, `reward_type`, `reward_text`, `assigned_to`, `created_by`, `deadline`, `proof_required`, `proof_url`, `proof_type`, `is_archived`, `completed_at`.
  - Strongly typed via `Database['public']['Tables']['tasks']` and extended types in `types/custom.ts`.
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

### 4.2 Rewards / Bounties Domain

- **Where implemented**
  - Hooks: `useRewardsStore.ts`, `useCreateBounty.ts`, `useUpdateBounty.ts`, `useDeleteBounty.ts`, `usePurchaseBounty.ts`, `useCollectedRewards.ts`.
  - Components: `RewardCard.tsx`, `CreateBountyModal.tsx`, `EditBountyModal.tsx`, `ConfirmDialog.tsx`, `CreditDisplay.tsx`.
  - Screen: `RewardsStorePage.tsx`, stub `MyCollectedRewardsPage.tsx`.
- **Data model**
  - `rewards_store` table for active bounties, `collected_rewards` for claims, `user_credits` for balances, plus related RPCs (`create_reward_store_item`, `update_reward_store_item`, `purchase_bounty`, etc.).

**Assessment**

- **Solid**
  - Clear split between hooks for fetching (`useRewardsStore`), creating/updating (`useCreateBounty`, `useUpdateBounty`), deleting (`useDeleteBounty`), and purchasing (`usePurchaseBounty`).
  - Rewards UI is nicely modularized into `RewardCard` and modal components.
- **Fragile**
  - RLS policies for `rewards_store`, `collected_rewards`, and `user_credits` are noted as incomplete in docs; this impacts trustworthiness of the data domain.
  - `MyCollectedRewardsPage` is incomplete; the hook exists but the screen is stubbed, which can cause UX gaps on mobile.
- **Inconsistent**
  - Modals for rewards (`CreateBountyModal`, `EditBountyModal`, `ConfirmDialog`) use custom styling and `z-50`, partially bypassing the canonical modal z-index utilities.

### 4.3 Friends / Guild Domain

- **Where implemented**
  - Hook: `useFriends.ts`.
  - Screen: `Friends.tsx`.
  - Components: `FriendCard.tsx`, `FriendSelector.tsx`.
- **Responsibilities**
  - Search profiles, send requests, accept/reject, remove friends.
  - Provide friend options in `TaskForm` / `CreateBountyModal` for assignments.

**Assessment**

- **Solid**
  - `useFriends` encapsulates the necessary queries and mutations, including realtime updates.
  - `FriendCard` provides a consistent visual treatment across different friendship states (accepted, incoming pending, outgoing pending).
- **Fragile**
  - Friend selection logic is tied directly into `TaskForm` and `CreateBountyModal`; if the friends domain changes (e.g. multiple guilds), these components will need manual rewiring.

### 4.4 Proofs & Media Domain

- **Where implemented**
  - Storage operations inside `useTasks.ts` and `Dashboard.handleProofUpload`, plus `ProofModal.tsx`, `ProofSubmissionModal.tsx`, `ImageLightbox.tsx`.
  - Uses Supabase Storage bucket `bounty-proofs`.
- **Assessment**
  - **Solid**
    - Proofs integrate with tasks clearly: upload file ⇒ update `tasks.proof_url` and `status=review` ⇒ review in `IssuedPage`.
  - **Fragile**
    - Proof upload logic is duplicated: `useTasks` has upload helpers, but `Dashboard` also implements its own upload handling that talks directly to Supabase.
    - `ImageLightbox` introduces a separate "critical overlay" z-index tier, but its class names (`z-critical-overlay`, etc.) are not yet reused uniformly by other critical overlays.
  - **Inconsistent**
    - Some proof flows use file upload (`ProofModal`), others use text/URL (`ProofSubmissionModal`), and the naming of these two modals can be confusing.

### 4.5 Credits & Economy

- **Where implemented**
  - Hooks and RPCs: `useRewardsStore`, `usePurchaseBounty`, `useIssuedContracts` + direct `supabase.rpc('increment_user_credits')`.
  - UI: `UserCredits.tsx` subscribed to realtime updates on `user_credits`.
- **Assessment**
  - **Solid**
    - Credits are centrally displayed in the HUD (`UserCredits` in `Layout`), with realtime updates and confetti feedback.
  - **Fragile**
    - Current `increment_user_credits` RPC is client-callable and not RLS-protected, which is a critical security risk already captured in docs.
    - Credit awarding logic lives in `IssuedPage.handleApprove`, making it tightly coupled to one specific UI pathway.

---

## 5. State Management & Data Flow

### 5.1 Global / Shared State

- **UIContext (`context/UIContext.tsx`)**
  - `isMobileMenuOpen`, `toggleMobileMenu`, `closeMobileMenu`, `forceCloseMobileMenu`.
  - Used only for the mobile nav drawer; modals have their own internal state and local scroll locking.
- **Supabase session context (`SessionContextProvider`)**
  - Provided at the root (`App.tsx`); consumed by `useAuth()` and through it by virtually all pages.
- **Global visual effects**
  - `CursorTrail` toggled via header button; stored locally in `Layout`.
  - Daily quote state lives in a hook and uses `localStorage` under the hood.

### 5.2 God Components & Coupling

- **`Dashboard.tsx`**
  - Drives data fetch (`useAssignedContracts`), proof uploads (direct storage + Supabase update), status transitions (complex logic in `handleStatusUpdate`), and UI layout, all in one place.
- **`IssuedPage.tsx`**
  - Owns mission listing, approval/rejection logic, credit awarding RPC, contract creation (`TaskForm` integration), deletion (`ConfirmDeleteModal`), and summary stats.
- **`TaskCard.tsx`**
  - Encapsulates a lot of behavior (tooltips, swipe gestures, modal expansion, proof viewing, archiving) and directly calls Supabase for archiving.

These components are **feature-rich but heavy**. They work, but they concentrate data access, domain rules, and UI logic, which makes them hard to reuse or test in isolation.

### 5.3 Key Interaction Pipelines (Current)

**A. User switches "room" (screen) via header HUD**

1. User taps a nav item in `Layout` (`Link` with path `/`, `/issued`, `/friends`, etc.).
2. `react-router-dom` updates the URL and swaps the `Outlet` content.
3. On mobile, if the drawer is open, `closeMobileMenu()` is called on nav click, and `Layout` restores body scroll.
4. The destination page's hook runs (`useAssignedContracts`, `useIssuedContracts`, etc.), fetches data from Supabase, and renders cards.

**B. User opens a contract card and views details/proof**

1. `Dashboard` renders a grid of `TaskCard` components for assigned tasks.
2. User taps a collapsed card; `TaskCard` sets `isExpanded=true`.
3. `TaskCard` uses `createPortal` to render a fixed overlay into `document.body`, with `z-modal-backdrop` / `z-modal-content` classes.
4. Body scroll is locked while the modal is open.
5. If proof exists, `TaskCard` shows proof links or the `ProofModal`; proof viewing may open a new tab or validate the URL first.
6. User closes the modal via the "Close" button or backdrop, restoring scroll and returning to the underlying grid.

**C. User creates a new contract from the "Missions" (Issued) page**

1. User taps the floating action button (FAB) in `IssuedPage`.
2. FAB handler checks `isMobileMenuOpen` from `UIContext`:
   - If open, calls `forceCloseMobileMenu()` and waits briefly before opening the `TaskForm` modal.
   - If closed, opens `TaskForm` immediately.
3. `TaskForm` manages its own body scroll lock and uses `useFriends` to populate the assignee dropdown.
4. On submit, `TaskForm` constructs a `NewTaskData` payload and calls `onSubmit` (`IssuedPage.handleCreateContract`), which uses Supabase to insert into `tasks`.
5. On success, `IssuedPage` calls `refetchIssuedContracts()`, shows a toast, and closes the modal; the new contract appears in the list.

**Assessment**

- **Solid**: Hook-based data access, optimistic updates in some hooks, and clear pipelines in `state-and-events.md`.
- **Fragile**: Scroll locking and z-indexing for overlays are implemented ad-hoc per modal instead of via a central overlay system; `Dashboard` and `IssuedPage` each embed a fair amount of business logic.

---

## 6. UI Composition & Styling

### 6.1 Layout System

- **Primary layout primitive**
  - `Layout.tsx` is effectively the global `<AppShell>`:
    - Sticky header with nav, logo, user avatar, cursor trail toggle, logout button.
    - Mobile nav drawer overlay.
    - Main content region (`<main className="flex-1 container mx-auto px-4 py-6 main-content no-bounce"> <Outlet /> </main>`).
- **Per-page layout patterns**
  - `Dashboard` uses `max-w-4xl mx-auto p-4 md:p-6` within the main; `IssuedPage` wraps its content with `min-h-screen bg-gradient-to-br` inside the `Outlet` region.
  - `RewardsStorePage` uses `container mx-auto p-4` and a FAB.
  - Some pages apply their own backgrounds/gradients that stack on top of the global `body` background defined in `index.css`.

**Assessment**

- **Solid**: The presence of a single `Layout` with a sticky HUD is a good foundation for a "HUD + viewport" mental model.
- **Fragile**: Individual pages diverge in how they treat padding, max-width, and backgrounds; this makes it hard to guarantee that every "room" feels like part of a single cohesive space.
- **Refactor opportunity**: Introduce small layout primitives (`<Page>`, `<PageHeader>`, `<PageBody>`, `<PageStatsRow>`) to standardize structure across all screens and keep the per-page code focused on domain logic.

### 6.2 Design System Elements

- **Tokens & Typography**
  - Typography, colors, and z-index are defined via CSS custom properties in `index.css`.
  - Custom fonts (`Mandalore`, `Howdybun`, Poppins/Bebas) are wired up with dedicated classes (`app-title`, `.gradient-text`, `.galactic-title`, `.status-badge`, etc.).
- **Re-usable styles**
  - `glass-card`, `btn-primary`, `btn-secondary`, `btn-danger-galactic`, `nav-item-galactic`, and `bounty-card-*` provide a coherent "galactic" visual language.
  - Input styling is centralized in `.input-field`, with mobile-specific tweaks for touch targets and font sizes.
- **Spacing & tap targets**
  - Many controls explicitly enforce minimum 44–48px heights for mobile buttons and inputs, aligning with mobile UX best practices.

**Assessment**

- **Solid**: A lot of work has already gone into centralizing theme and visual primitives; the `index.css` file serves as a de-facto design system.
- **Fragile**: Several components bypass these primitives and hardcode `bg-gray-800`, `rounded-lg`, `h-32`, etc., instead of relying on tokenized classes; this will cause subtle visual drift over time.
- **Inconsistent**:
  - Typography hierarchy (font size/weight for headers and labels) is not enforced consistently; some pages use `app-title`, others use raw `text-3xl` with default fonts.
  - Card layouts (TaskCard vs RewardCard vs FriendCard) all use slightly different paddings and grid structures.

### 6.3 Styling Mechanisms & Z-Index

- **Mechanisms in play**
  - Tailwind utility classes (dominant).
  - Global CSS utilities and components defined in `index.css` (shimmer, holographic effects, card layouts).
- **Z-index system**
  - `index.css` defines a canonical hierarchy:
    - `--z-header`, `--z-mobile-menu`, `--z-modal-*`, `--z-critical-*` with matching utility classes (`.z-header`, `.z-modal-content`, etc.).
  - Many modals correctly use `z-modal-backdrop`, `z-modal-content`, `z-modal-controls` (e.g. `TaskForm`, `CreateBountyModal`, `ProfileEditModal`, `ProofModal`, `TaskCard` expanded view, `ProofSubmissionModal`).
  - Critical overlays (`ImageLightbox`) use `z-critical-overlay`, `z-critical-content`, `z-critical-controls`.
- **Inconsistencies & legacy**
  - `ConfirmationModal.tsx`, `ConfirmDialog.tsx`, and `EditBountyModal.tsx` still use raw `z-50` on their roots.
  - `ConfirmDeleteModal.tsx` introduces new class names (`z-critical-overlay-backdrop`, `z-critical-overlay-content`, `z-critical-overlay-controls`) that do **not** match the existing CSS utility class names.
    - This means it visually works only because its parent classes (`glass-card`, layout, etc.) happen to sit above the content, not because the new z-classes are wired to the token system.

**Assessment**

- **Solid**: The z-index token system in `index.css` is exactly what is needed to avoid "z-index wars" on mobile and in modals.
- **Fragile**: Incomplete adoption of the token system means some modals may still mis-layer, especially when combined (e.g. a confirm dialog showing on top of an already open modal or the mobile menu).
- **Refactor opportunity**:
  - Standardize all overlays and modals to use the same `z-modal-*` / `z-critical-*` utilities.
  - Remove `z-50` and hand-invented z-classes in favor of the canonical tokens.

### 6.4 Mobile vs Desktop Behavior

- **Mobile handling**
  - `Layout` locks body scroll when the mobile menu is open and auto-closes the menu on route change.
  - Many buttons use `min-h-[44px]` and responsive font sizes to avoid iOS zoom and ensure finger-friendly controls.
  - Modals like `TaskForm` explicitly lock both `body` and `html` scroll and use mobile-specific animations (`modal-mobile-slide`, `modal-mobile-fade`).
- **Desktop handling**
  - Desktop nav header uses `nav-item-galactic` styles and a hover/active state system.
  - Cursor trail and more dramatic holographic effects are desktop-friendly and hidden or toned down on small screens.

**Assessment**

- **Solid**: The app clearly cares about mobile-first UX— especially around tap targets and scroll behavior.
- **Fragile**: Scroll locking is handled by multiple components independently (`Layout`, `TaskForm`, `TaskCard`, some modals); if two overlays are open at once, they may stomp each other's scroll settings.
- **Risk**: Without a central "overlay controller", it's easy to reintroduce issues like "modal behind menu" or "menu open while modal is active", especially on iOS where viewport behavior is tricky.

---

## 7. Interaction Layer & Overlays (Analogue to 3D Scene & Controls)

While this app is not a 3D gallery, it behaves like a small interactive application with layered HUD, overlays, and mobile gestures. The "interaction layer" is essentially:

- The **HUD**: header, credits, cursor trail, mobile drawer.
- The **viewport content**: cards and lists rendered by each page.
- The **overlay system**: modals, proof viewers, confirmations, image lightbox.

### 7.1 Controls & Input

- **Pointer / touch interactions**
  - Cards are tap/click targets that open modals or trigger actions (`TaskCard`, `RewardCard`, `FriendCard`).
  - Swipe-to-archive is implemented on `TaskCard` via `react-swipeable`.
  - Pull-to-refresh is implemented on `Dashboard`, `IssuedPage`, and `RewardsStorePage` via `react-simple-pull-to-refresh`.
- **Keyboard**
  - No explicit keyboard-handling abstractions beyond standard browser focus; modals use buttons and close icons but not explicit focus traps.
- **Platform-specific behavior**
  - `TaskCard` and `Dashboard` both contain Android-specific handling:
    - Vibrations via `navigator.vibrate`, with different patterns for success vs error.
    - Tailored error messages to suggest toggling between WiFi and mobile data.

### 7.2 "Room" Switching & Scene Management

- **Rooms** in this context are the routed screens (`Dashboard`, `IssuedPage`, `Friends`, `Archive`, `Rewards`, `ProfileEdit`).
- **Switching** is purely route-based:
  - Nav links in `Layout` change the URL, and each page mounts/unmounts its own hooks and subscriptions.
  - No shared scene manager or transition controller; transitions are simple route switches.

### 7.3 Overlay & Modal Behavior

- **Where overlays live**
  - Most overlays are rendered with `createPortal` into `document.body` (`TaskCard` expanded modal, `TaskForm`, `CreateBountyModal`, `ProfileEditModal`, `ProofModal`, `ProofSubmissionModal`).
  - Some simpler modals (e.g. `ConfirmationModal`, `ConfirmDialog`, `EditBountyModal`) are not portaled and rely on being relatively high in the DOM.
- **Layer coordination**
  - There is **no global overlay root** (like `#overlay-root`) and no shared overlay manager.
  - `UIContext` only tracks mobile menu state; modals maintain their own booleans (`isOpen`, `isExpanded`, etc.).
  - Body scroll lock is implemented per overlay component, not centrally.

**Assessment**

- **Solid**: Portaling modals to `document.body` is the right move to escape header stacking contexts; the z-index tokens are there to support a robust layering system.
- **Fragile**:
  - Without a single `overlay-root` element, It's harder to reason about overall layering, especially if the app grows more complex.
  - Overlays that are not portaled have to rely on `z-50` and DOM order to win layering battles.
  - There is no central notion of an "active layer" (menu vs modal vs critical overlay), so conflicts are resolved ad-hoc (e.g. Issued FAB checking mobile menu manually).

---

## 8. Cross-Platform Readiness (Web → iOS / React Native)

### 8.1 Platform-Agnostic Modules (Today)

These are *closest* to being portable to a future `core/` layer:

- **Data types & models**: `types/database.ts`, `types/custom.ts`, `app-specific-types.ts`, `rpc-types.ts`.
- **Pure utilities**: `utils/dateUtils.ts` (dates), `lib/quotes.ts` (static data).
- **Business-logic-ish hooks** (partially):
  - The shape of hooks like `useTasks`, `useIssuedContracts`, `useRewardsStore`, `useFriends` is conceptually portable, but they are implemented using React + Supabase client directly.

### 8.2 Web-Bound Modules

These are tightly coupled to the DOM, the browser event model, or Tailwind CSS:

- **All React components in `components/` and `pages/`**
  - They rely on `document`, `window`, CSS classes, and browser-specific patterns (e.g., `window.open`, `IntersectionObserver` for shimmer, `navigator.vibrate`).
- **Supabase client initialization in `lib/supabase.ts`**
  - Uses `import.meta.env` and browser assumptions; would need a different environment wiring for React Native.
- **`utils/soundManager.ts`**
  - Uses `HTMLAudioElement` and assumes a browser-like audio subsystem.
- **CSS-driven design system in `index.css`**
  - Tailwind + custom CSS is strongly web-centric; React Native would require re-implementing the look and feel using RN styles or libraries like `react-native-tailwindcss`.

### 8.3 Proposed `core/` vs `web/` Layering

To enable reuse in a future React Native or hybrid iOS app:

- **Introduce a `core/` directory (pure logic & models)**
  - `core/domain/contracts.ts`:
    - Functions for status transitions, archive rules, and proof requirements (e.g. `canTransition(from, to, { proofRequired })`).
  - `core/domain/rewards.ts`:
    - Functions for validating reward creation, credit costs, and purchase rules (e.g. `canAfford(userCredits, cost)`).
  - `core/services/tasksRepo.ts` / `rewardsRepo.ts`:
    - Interfaces for "task repository" and "rewards repository" that encapsulate CRUD operations but not the React hook layer.
  - `core/errors.ts`:
    - The categorization logic currently inside `getErrorMessage`, decoupled from `toast`/UI concerns.
- **Refactor current hooks into an adapter layer**
  - `web/hooks/useTasks.ts` (current file) becomes a thin adapter:
    - Calls `tasksRepo` from `core/` using Supabase as the implementation.
    - Exposes the same React API to components.
  - Equivalent pattern for `useRewardsStore`, `useFriends`, etc.
- **Keep DOM/UI-specific pieces in `web/`**
  - `web/components/`, `web/pages/`, `web/utils/soundManager`, `web/styles/index.css`.
  - These are where Tailwind, `document`, `window`, `navigator`, and Capacitor plugins are used.

Once this split exists:

- A React Native/iOS app can reimplement `web/hooks/*` and `web/components/*` while reusing `core/domain/*` and `core/services/*` with a different backing client (e.g. `@supabase/supabase-js` for native or an HTTP API wrapper).
- The cross-platform boundary is clear: **core** knows about contracts, rewards, proofs, and credits as *concepts*, not about Tailwind classes or HTML elements.

---

## 9. Refactor & Upgrade Roadmap (Phased)

This roadmap focuses on:

1. **Stabilizing** layering and UI behavior (especially modals and mobile).
2. **Unifying** the design system and layouts across screens.
3. **Extracting** domain logic so it can later be reused in a React Native / iOS implementation.

### Phase 0 – Inventory & Stabilization

- **Goals**
  - Ensure that the current app can be deployed safely without breaking schema or obvious security issues.
- **Key tasks**
  - Align migrations with actual table names (`bounties` ↔ `rewards_store`, `collected_bounties` ↔ `collected_rewards`) per `data-model.md` and `runbook.md`.
  - Lock down the `increment_user_credits` RPC so it is not callable from the client (service-role-only, move to server-side triggers or trusted RPC).
  - Verify and add missing RLS policies for `rewards_store`, `collected_rewards`, and `user_credits`.
- **Acceptance criteria**
  - A fresh Supabase project with migrations runs cleanly and matches what the app expects.
  - No obvious path for users to mint credits or see other users' sensitive data via the client.

### Phase 1 – Layout & Design System Unification

- **Goals**
  - Make every "room" (screen) feel consistent in layout, spacing, and typography, especially on mobile, as preparation for cross-platform work.
- **Key tasks**
  - Introduce lightweight layout primitives:
    - `Page` (controls `max-width`, side padding, vertical rhythm).
    - `PageHeader` (standardized title + subtitle + optional stats row).
    - `PageBody` (grid/list layout wrapper).
  - Refactor `Dashboard`, `IssuedPage`, `RewardsStorePage`, `ArchivePage`, and `Friends` to use these primitives rather than ad-hoc `container` / `max-w-4xl` / `bg-gradient` combinations.
  - Audit typographic usage:
    - Define a simple scale (e.g. `display`, `h1`, `h2`, `body`, `caption`) and map them to utility classes or small CSS helpers.
    - Replace one-off font styles with `app-title`, `galactic-title`, or new standardized heading classes.
  - Normalize cards:
    - Align `TaskCard`, `RewardCard`, and `FriendCard` to share padding, corner radius, and shadow intensity where appropriate.
- **Acceptance criteria**
  - Visual audit across all primary screens shows consistent padding, typography, and card treatments.
  - No screen redefines its own max-width or background gradient in a way that clashes with `Layout` and `index.css`.

### Phase 2 – Overlay & Interaction Layer Refactor (Modal System)

This phase should align with and subsume the existing modal/z-index plans in:

- `bounty_hunter_mobile_modal_fix_ui_polish_plan_v_1.md`
- `REAL_IMPLEMENTATION_PLAN.md`
- `UI_UX_improvements_plan.md`

- **Goals**
  - Eliminate z-index bugs and scrolling conflicts between mobile menu, modals, and critical overlays.
  - Centralize overlay rendering and body scroll locking.
- **Key tasks**
  - Introduce a **single overlay root**:
    - Add `#overlay-root` next to `#root` in `index.html`.
    - Update all modal/overlay components that currently use `createPortal(document.body)` to portal into `overlay-root` instead.
  - Extend `UIContext` with a simple layer mutex:
    - `activeLayer: 'none' | 'menu' | 'modal' | 'critical'`.
    - Helpers like `setActiveLayer(layer)` that automatically close conflicting layers (e.g., opening a modal closes the menu).
  - Standardize z-index usage:
    - Replace `z-50` in `ConfirmationModal`, `ConfirmDialog`, `EditBountyModal` with `z-modal-*` or `z-critical-*` classes.
    - Fix naming mismatches (`z-critical-overlay-backdrop` vs `.z-critical-overlay`) by aligning class names with the utilities defined in `index.css`.
  - Centralize body scroll lock:
    - Implement a small `overlayManager` or hook that:
      - Tracks the number/type of open overlays.
      - Applies/removes scroll lock on `body`/`html` exactly once.
    - Refactor `Layout`, `TaskForm`, `TaskCard`, and modal components to call into this manager instead of manipulating `document.body` directly.
- **Acceptance criteria**
  - On typical mobile viewports (360×780, 393×852, 430×932):
    - Opening any modal always renders it above the mobile menu and content.
    - Opening a modal closes the mobile menu; opening the mobile menu closes modals.
    - Backdrop and close buttons are always reachable and visible.
  - No use of raw `z-50` or ad-hoc z-indexes remains in the codebase.

**Status**: ✅ **IMPLEMENTED** (2025-01-27)
- Overlay root (`#overlay-root`) added to `index.html`.
- `UIContext` extended with `activeLayer` state and coordination helpers (`openMenu`, `openModal`, `openCriticalOverlay`, `clearLayer`).
- Centralized scroll lock utility (`src/lib/scrollLock.ts`) manages body scroll locking with reference counting.
- All modals updated to portal into `overlay-root` instead of `document.body`.
- Z-index standardized: all modals use `z-modal-*` classes, critical overlays use `z-critical-*` classes.
- Removed all `z-50` usage and inconsistent z-class names.

### Phase 3 – Domain & Data Layer Extraction

- **Goals**
  - Move business logic (status transitions, credit rules, proof requirements) out of React components and into testable domain modules.
- **Key tasks**
  - Extract pure logic from:
    - `Dashboard.handleStatusUpdate` (status rules, permission rules).
    - `IssuedPage.handleApprove` / `handleReject` (approval/rejection semantics, credit awarding).
    - Proof upload helpers in `useTasks` and `Dashboard`.
  - Create domain modules in a new `core/` folder (see Section 8.3) and have hooks call into them.
  - Make hooks delegate to repo-style modules that accept a generic "client" interface, so they are not intrinsically bound to Supabase's client API.
- **Acceptance criteria**
  - Domain rules are expressed as pure functions that can be imported into tests or reused by other platforms.
  - Pages and components no longer import `supabase` directly; they talk only to hooks or repositories.

### Phase 4 – Platform Boundary & iOS Readiness

- **Goals**
  - Define a clean boundary between platform-independent logic and the current React DOM + Tailwind implementation so it's clear how to build a React Native or more-native iOS shell.
- **Key tasks**
  - Restructure project folders along a `core/` vs `web/` axis (or similar), moving:
    - Types, domain logic, repository abstractions into `core/`.
    - All React DOM components, Tailwind CSS, and Capacitor-specific integration into `web/`.
  - Wrap platform APIs:
    - `soundManager` should go behind an interface (`SoundPlayer`) whose implementation can vary between web (HTMLAudio) and native (Capacitor plugins).
    - Haptics (`navigator.vibrate`) could be abstracted for eventual replacement with `@capacitor/haptics` or React Native's `Vibration`.
  - Align iOS setup docs with code:
    - Ensure `package.json` scripts and `docs/ios/SETUP.md` agree on the recommended Capacitor workflow (`npm run ios:sync`, etc.).
- **Acceptance criteria**
  - A reviewer can point to a small set of `core/` modules that can be reused unchanged in a hypothetical React Native app.
  - Platform-specific APIs are accessed via thin adapters that can be reimplemented on iOS.

### Phase 5 – Hardening & QA

- **Goals**
  - Make the app safer to iterate on through automated checks and visual consistency testing.
- **Key tasks**
  - Add tests where they give the highest leverage:
    - Domain logic in `core/` (status transitions, reward validation, credit calculations).
    - A few critical UI workflows via integration tests (login, create contract, approve with proof, purchase reward).
  - Implement a lightweight visual regression / screenshot workflow for key screens and overlays to catch layout drift.
  - Instrument basic error tracking (e.g. Sentry) for the web app.
- **Acceptance criteria**
  - At least the primary contract and reward flows are covered by tests.
  - Regressions in core flows or layering issues are caught early via automation instead of manual device checks only.

---

## 10. Highest-Leverage Changes (Summary)

1. **Adopt the existing z-index token system everywhere and centralize overlay rendering through a single `overlay-root`** to eliminate entire classes of mobile layering bugs (menus vs modals vs critical overlays).
2. **Introduce small, reusable layout primitives (`Page`, `PageHeader`, `PageBody`, `PageStatsRow`) and a simple typography scale**, then apply them across `Dashboard`, `IssuedPage`, `RewardsStorePage`, `ArchivePage`, and `Friends` to stop visual drift between screens.
3. **Extract domain logic (status transitions, approval rules, credit awarding, proof requirements) from `Dashboard`, `IssuedPage`, and `TaskCard` into pure `core/` modules**, making it easier to test, evolve rules, and reuse them in a future iOS client.
4. **Lock down credit and rewards-related RPCs (`increment_user_credits`, `rewards_store`, `user_credits`, `collected_rewards`) and align migrations with actual table usage**, so the UI never has to compensate for insecure or inconsistent backend behavior.
5. **Define a clear platform boundary (`core/` vs `web/`) and abstract platform-specific services (Supabase client, audio, haptics)** to make the eventual React Native / iOS port largely a matter of re-skinning UI components rather than rewriting business logic.


