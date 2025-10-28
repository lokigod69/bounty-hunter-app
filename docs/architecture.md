# Bounty Hunter App - Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    React SPA (Vite)                                │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐   │  │
│  │  │   Pages     │  │  Components  │  │    Custom Hooks        │   │  │
│  │  │             │  │              │  │                        │   │  │
│  │  │ • Dashboard │  │ • TaskCard   │  │ • useAuth              │   │  │
│  │  │ • Friends   │  │ • RewardCard │  │ • useTasks             │   │  │
│  │  │ • Rewards   │  │ • FriendCard │  │ • useFriends           │   │  │
│  │  │ • Issued    │  │ • Modals     │  │ • useRewardsStore      │   │  │
│  │  └─────────────┘  └──────────────┘  └────────────────────────┘   │  │
│  │         │                  │                      │               │  │
│  │         └──────────────────┴──────────────────────┘               │  │
│  │                            │                                       │  │
│  │                   ┌────────▼────────┐                             │  │
│  │                   │  Supabase Client │                            │  │
│  │                   │   (supabase.ts)  │                            │  │
│  │                   └────────┬─────────┘                            │  │
│  └────────────────────────────┼──────────────────────────────────────┘  │
└────────────────────────────────┼─────────────────────────────────────────┘
                                 │ HTTPS (WebSocket for Realtime)
                                 │
┌────────────────────────────────▼─────────────────────────────────────────┐
│                         SUPABASE BACKEND                                 │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      PostgreSQL Database                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │  │
│  │  │   Tables     │  │ RLS Policies │  │    RPC Functions     │   │  │
│  │  │              │  │              │  │                      │   │  │
│  │  │ • profiles   │  │ • SELECT     │  │ • create_reward_*    │   │  │
│  │  │ • tasks      │  │ • INSERT     │  │ • purchase_bounty    │   │  │
│  │  │ • friendships│  │ • UPDATE     │  │ • increment_credits  │   │  │
│  │  │ • rewards_*  │  │ • DELETE     │  │ • decrement_credits  │   │  │
│  │  │ • user_*     │  │              │  │ • delete_reward_*    │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                       Supabase Storage                            │  │
│  │  ┌──────────────────┐           ┌──────────────────┐             │  │
│  │  │  bounty-proofs   │           │     avatars      │             │  │
│  │  │  (PUBLIC)        │           │    (PUBLIC)      │             │  │
│  │  │                  │           │                  │             │  │
│  │  │ • Task proofs    │           │ • User avatars   │             │  │
│  │  │ • Image/Video    │           │ • Profile pics   │             │  │
│  │  └──────────────────┘           └──────────────────┘             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      Supabase Auth                                │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │         Magic Link (OTP via Email)                         │  │  │
│  │  │  • No OAuth providers                                      │  │  │
│  │  │  • Email-based authentication only                         │  │  │
│  │  │  • JWT tokens in session                                   │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Supabase Realtime                              │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  postgres_changes subscriptions                            │  │  │
│  │  │  • tasks table changes                                     │  │  │
│  │  │  • friendships table changes                               │  │  │
│  │  │  • user_credits table changes                              │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Edge Functions (Deno)                          │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  notify-reward-creator                                     │  │  │
│  │  │  • Triggered after bounty purchase                         │  │  │
│  │  │  • Sends email to reward creator (MOCK - not implemented)  │  │  │
│  │  │  • Uses service_role key for admin queries                 │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Application Structure

**Framework**: React 18 Single-Page Application (SPA)
**Build Tool**: Vite 6.3.5
**Router**: React Router DOM v6 (client-side routing)

### Routing Configuration

All routes defined in [src/App.tsx](../src/App.tsx):

```typescript
<Routes>
  <Route path="/login" element={<Login />} />

  {/* Protected routes wrapped in Layout */}
  <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
    <Route path="/" element={<Dashboard />} />
    <Route path="/friends" element={<Friends />} />
    <Route path="/archive" element={<ArchivePage />} />
    <Route path="/profile/edit" element={<ProfileEdit />} />
    <Route path="/rewards-store" element={<RewardsStorePage />} />
    <Route path="/my-rewards" element={<MyCollectedRewardsPage />} />
    <Route path="/issued" element={<IssuedPage />} />
  </Route>

  <Route path="*" element={<Navigate to="/" />} />
</Routes>
```

**Authentication Guard**: `ProtectedRoute` component checks `useAuth()` state before rendering.

---

### Page-Level Components

| Route | Component | Purpose | Key Hooks |
|-------|-----------|---------|-----------|
| `/login` | [Login.tsx](../src/pages/Login.tsx) | Magic link authentication | `useAuth()` |
| `/` | [Dashboard.tsx](../src/pages/Dashboard.tsx) | Assigned tasks (contracts) | `useAssignedContracts()` |
| `/issued` | [IssuedPage.tsx](../src/pages/IssuedPage.tsx) | Created tasks (issued contracts) | `useIssuedContracts()` |
| `/friends` | [Friends.tsx](../src/pages/Friends.tsx) | Guild management | `useFriends()` |
| `/archive` | [ArchivePage.tsx](../src/pages/ArchivePage.tsx) | Completed task history | `useArchivedContracts()` |
| `/rewards-store` | [RewardsStorePage.tsx](../src/pages/RewardsStorePage.tsx) | Bounty marketplace | `useRewardsStore()` |
| `/my-rewards` | [MyCollectedRewardsPage.tsx](../src/pages/MyCollectedRewardsPage.tsx) | Claimed rewards (**STUB**) | `useCollectedRewards()` |
| `/profile/edit` | [ProfileEdit.tsx](../src/pages/ProfileEdit.tsx) | User profile settings | `useAuth()` |

---

### Component Hierarchy

```
App (SessionContextProvider, UIProvider, Router)
├── Login
│   └── (Magic link form)
│
└── ProtectedRoute
    └── Layout (Navigation + Outlet)
        ├── Header
        │   ├── Logo
        │   ├── Navigation Links
        │   ├── UserCredits Widget
        │   └── Profile Menu
        │
        ├── MobileMenu (conditional)
        │   └── Navigation Links (mobile)
        │
        ├── CursorTrail (visual effect)
        │
        └── Outlet (Page Content)
            │
            ├── Dashboard
            │   ├── TaskCard (multiple)
            │   │   └── ProofSubmissionModal
            │   └── (Empty state)
            │
            ├── IssuedPage
            │   ├── TaskForm (create modal)
            │   ├── TaskCard (multiple)
            │   └── ConfirmationModal (approve/decline)
            │
            ├── Friends
            │   ├── FriendCard (multiple)
            │   ├── Search Input
            │   └── Tabs (Friends | Requests | Sent)
            │
            ├── ArchivePage
            │   └── TaskCard (read-only)
            │
            ├── RewardsStorePage
            │   ├── CreateBountyModal
            │   ├── EditBountyModal
            │   ├── RewardCard (multiple)
            │   └── Tabs (Available | My Bounties)
            │
            ├── MyCollectedRewardsPage
            │   └── (Placeholder - not implemented)
            │
            └── ProfileEdit
                └── ProfileEditModal
```

---

### State Management

**Architecture**: Context + Custom Hooks (no Redux/Zustand)

#### Global State (Context)

**UIContext** ([src/context/UIContext.tsx](../src/context/UIContext.tsx)):
- **Purpose**: Mobile menu visibility
- **State**: `isMobileMenuOpen: boolean`
- **Actions**: `toggleMobileMenu()`, `closeMobileMenu()`, `forceCloseMobileMenu()`
- **Usage**: `const { isMobileMenuOpen, toggleMobileMenu } = useUI();`

#### Session State (Supabase)

**SessionContextProvider** (from `@supabase/auth-helpers-react`):
- **Purpose**: Auth session management
- **Consumed by**: `useAuth()` hook
- **Location**: Wraps entire `<App />` in [src/App.tsx](../src/App.tsx)

#### Local State (Custom Hooks)

All data fetching and mutations encapsulated in custom hooks:

| Hook | Purpose | State | Side Effects |
|------|---------|-------|--------------|
| `useAuth()` | User authentication | user, profile, session | Auth state listener, profile fetch |
| `useTasks()` | Task CRUD | tasks[], loading, error | Real-time subscription, file uploads |
| `useFriends()` | Friend system | friends[], pendingRequests[] | Real-time subscription |
| `useRewardsStore()` | Bounty marketplace | rewards[], loading | RPC calls, edge function triggers |
| `useCollectedRewards()` | Claimed rewards | collectedRewards[] | Query `collected_rewards` table |
| `useAssignedContracts()` | Tasks assigned to user | contracts[] | Filtered query |
| `useIssuedContracts()` | User-created tasks | contracts[] | Filtered query |
| `useArchivedContracts()` | Completed tasks | archivedTasks[] | Filtered query |

**Pattern**: Each hook returns `{ data, loading, error, ...actions }` structure for predictable consumption.

---

## Backend Architecture (Supabase)

### Database Layer

**PostgreSQL** with Row-Level Security (RLS) enabled on all tables.

**Primary Tables**:
1. `profiles` - User accounts
2. `tasks` - Contracts/assignments
3. `friendships` - Social connections
4. `rewards_store` - Bounty marketplace items
5. `collected_rewards` - Claimed rewards
6. `user_credits` - Credit balances
7. `credit_transactions` - Credit history
8. `marketplace_bounties` - (Unused duplicate of rewards_store?)
9. `recurring_task_instances` - (Unused recurring task feature)

**See [data-model.md](./data-model.md) for full schema details.**

---

### RPC Functions (Stored Procedures)

**Location**: [supabase/migrations/YYYYMMDDHHMMSS_*.sql](../supabase/migrations/)

| Function | Purpose | Security | Caller |
|----------|---------|----------|--------|
| `create_reward_store_item` | Create new bounty | `SECURITY DEFINER`, granted to `authenticated` | [useCreateBounty.ts:34](../src/hooks/useCreateBounty.ts#L34) |
| `update_reward_store_item` | Edit existing bounty | `SECURITY DEFINER` | [useUpdateBounty.ts:19](../src/hooks/useUpdateBounty.ts#L19) |
| `delete_reward_store_item` | Delete bounty | `SECURITY DEFINER` | [useDeleteBounty.ts:17](../src/hooks/useDeleteBounty.ts#L17) |
| `purchase_bounty` | Claim reward with credits | `SECURITY DEFINER`, granted to `authenticated` | [usePurchaseBounty.ts:31](../src/hooks/usePurchaseBounty.ts#L31) |
| `increment_user_credits` | Award credits | ⚠️ Granted to `authenticated` | [IssuedPage.tsx:165](../src/pages/IssuedPage.tsx#L165) |
| `decrement_user_credits` | Deduct credits | `SECURITY DEFINER`, granted to `authenticated` | Called by `purchase_bounty` |
| `complete_task_instance` | Complete recurring task | `SECURITY DEFINER`, granted to `authenticated` | **UNUSED** (recurring tasks not implemented) |

**⚠️ Security Issue**: `increment_user_credits` should NOT be callable by clients. See [overview.md - Risk #2](./overview.md#top-10-risks).

---

### Storage Buckets

**Location**: Supabase Storage

| Bucket | Visibility | Purpose | Policies | Usage |
|--------|------------|---------|----------|-------|
| `bounty-proofs` | PUBLIC | Task proof uploads | Authenticated users can upload/view | [useTasks.ts:532](../src/hooks/useTasks.ts#L532) |
| `avatars` | PUBLIC | User profile pictures | Authenticated users can upload/view | [ProfileEditModal.tsx:84](../src/components/ProfileEditModal.tsx#L84) |

**Path Structure**:
- Proof files: `proofs/{taskId}/{timestamp}.{ext}`
- Avatar files: `{userId}.{ext}` (assumed)

**File Validation**:
- **Client-side only**: File type and size checked in [FileUpload.tsx](../src/components/FileUpload.tsx)
- **⚠️ No server-side validation**: See [overview.md - Risk #6](./overview.md#top-10-risks)

---

### Edge Functions

**Runtime**: Deno (TypeScript)
**Location**: [supabase/functions/](../supabase/functions/)

#### notify-reward-creator

**Purpose**: Send email notification to reward creator when their bounty is purchased.

**Trigger**: Called from `useRewardsStore.purchaseReward()` after successful purchase ([useRewardsStore.ts:154](../src/hooks/useRewardsStore.ts#L154)).

**Flow**:
1. Receive `reward_id` and `collector_id` via POST
2. Query `rewards_store` for creator_id and reward name
3. Query `profiles` for creator email and collector username
4. Send email (currently MOCK - see [notify-reward-creator/index.ts:11-44](../supabase/functions/notify-reward-creator/index.ts#L11-L44))

**Security**:
- Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for admin queries
- Environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` (optional)

**Status**: **NOT FUNCTIONAL** - Email sending is mocked. See [overview.md - Risk #8](./overview.md#top-10-risks).

---

### Authentication Flow

**Method**: Magic Link (OTP via Email)
**Provider**: Supabase Auth
**No OAuth**: Google, GitHub, etc., not configured

**Flow**:
```
1. User enters email on /login → supabase.auth.signInWithOtp({ email })
2. Supabase sends magic link email
3. User clicks link → redirected to app
4. Supabase session created → JWT token stored
5. App fetches user profile from profiles table
6. Redirected to / (Dashboard)
```

**Session Management**:
- **Hook**: [useAuth.ts](../src/hooks/useAuth.ts)
- **Listener**: `supabase.auth.onAuthStateChange()` in useEffect
- **Storage**: Browser session storage (managed by Supabase SDK)

**Profile Creation**:
- Trigger: `on_auth_user_created` (likely defined in initial migration, not visible in repo)
- Auto-creates `profiles` row on first sign-up

---

### Real-Time Subscriptions

**Technology**: Supabase Realtime (PostgreSQL replication)

**Active Subscriptions**:

| Hook | Table | Event | Purpose |
|------|-------|-------|---------|
| `useTasks()` | `tasks` | INSERT, UPDATE, DELETE | Live task updates |
| `useFriends()` | `friendships` | INSERT, UPDATE, DELETE | Live friend requests |
| `UserCredits` component | `user_credits` | UPDATE | Live credit balance |

**Pattern**:
```typescript
useEffect(() => {
  const channel = supabase
    .channel('unique-channel-name')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks'
    }, (payload) => {
      refetch(); // or update local state
    })
    .subscribe();

  return () => { channel.unsubscribe(); };
}, []);
```

**⚠️ Note**: Real-time works, but RLS policies must be correctly configured to prevent unauthorized data exposure.

---

## Deployment Architecture

### Frontend Deployment

**Platform**: Vercel
**Config**: [vercel.json](../vercel.json)

**Build Command**: `npm run build` (TypeScript compile + Vite build)
**Output**: `dist/` directory (static files)

**Environment Variables** (required on Vercel):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Domain**: Not specified in repo (TBD)

---

### Backend Deployment

**Platform**: Supabase Cloud
**Project Reference**: Not committed (in `.temp/` folder)

**Deployment Steps**:
1. Run migrations: `supabase db push` (or via Supabase Dashboard)
2. Deploy edge functions: `supabase functions deploy notify-reward-creator`
3. Configure storage bucket policies via Dashboard
4. Set environment variables for edge functions

**⚠️ Migration Issue**: Migrations use placeholder timestamps (`YYYYMMDDHHMMSS_*`). These need proper timestamps before deployment. See [open-questions.md](./open-questions.md).

---

## Integration Points

### Supabase Client Initialization

**Location**: [src/lib/supabase.ts](../src/lib/supabase.ts)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default supabase;
```

**Usage**: Imported in all hooks and components requiring database access.

---

### Type Safety

**Auto-Generated Types**: [src/types/database.ts](../src/types/database.ts)
**Generation Command**: `supabase gen types typescript --project-ref <ref> > src/types/database.ts`

**Custom Extensions**:
- [src/types/custom.ts](../src/types/custom.ts) - Task/Profile types
- [src/types/rpc-types.ts](../src/types/rpc-types.ts) - RPC input/output types
- [src/types/app-specific-types.ts](../src/types/app-specific-types.ts) - Enums and unions

---

## Security Architecture

### Row-Level Security (RLS)

**Status**: **ENABLED** on all tables, but policies may be incomplete.

**Example Policies** (from migrations):

**profiles**:
```sql
-- Anyone can view profiles (public)
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
```

**tasks**:
```sql
-- Users can view tasks they created or are assigned to
CREATE POLICY "View tasks" ON tasks FOR SELECT USING (auth.uid() IN (created_by, assigned_to));

-- Users can create tasks (creator must match auth.uid())
CREATE POLICY "Create tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update tasks they're involved in
CREATE POLICY "Update tasks" ON tasks FOR UPDATE USING (auth.uid() IN (created_by, assigned_to));
```

**⚠️ Critical Issue**: No visible policies for `rewards_store`, `user_credits`, `collected_rewards`. See [open-questions.md](./open-questions.md).

---

### API Security

**Client Requests**:
- Use **anon key** (public, safe to expose)
- RLS policies enforce authorization
- JWT token in session header

**Edge Function Requests**:
- Use **service_role key** (admin, bypasses RLS)
- Only accessible in edge function environment
- Never exposed to client

**⚠️ Vulnerability**: `increment_user_credits` callable by clients with anon key. Must be service_role-only. See [overview.md - Risk #2](./overview.md#top-10-risks).

---

## Performance Considerations

### Optimistic UI Updates

**Pattern** (from `useTasks.updateTaskStatus()`):
```typescript
1. Update local state immediately (setTasks([...updated]))
2. Show loading toast
3. Send request to Supabase
4. On success: Confirm update with server data
5. On error: Rollback local state, show error toast
```

**Benefits**: Instant feedback, no loading spinners for every action.

---

### Real-Time Efficiency

**Subscriptions**: Limited to necessary tables only (tasks, friendships, user_credits).
**Channel Names**: Unique per subscription to prevent conflicts.
**Cleanup**: All subscriptions unsubscribed on component unmount.

---

### File Upload Optimization

**Android-Specific** ([useTasks.ts:532](../src/hooks/useTasks.ts#L532)):
- 1MB chunk size for large files
- Progress tracking via `uploadProgress` state
- Client-side compression (not implemented, could be added)

---

## Design System

### Styling Approach

**Framework**: TailwindCSS 3.4.1
**Theme**: Glassmorphic dark mode with indigo/teal gradient

**Key Classes**:
- Cards: `backdrop-blur-md bg-white/10 rounded-2xl`
- Gradients: `bg-gradient-to-br from-indigo-900 to-teal-600`
- Buttons: `bg-teal-500/80 hover:bg-teal-400/90 transition-all`

**Fonts** (loaded in [index.html](../index.html)):
- **Headings**: Orbitron (futuristic)
- **Body**: Rajdhani (clean, readable)
- **Fallback**: Inter

---

### Responsive Design

**Breakpoints** (Tailwind defaults):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

**Mobile Menu**: Rendered conditionally via `useUI()` context on screens < `lg`.

---

## Internationalization (i18n)

**Library**: i18next + react-i18next
**Setup**: [src/i18n/index.ts](../src/i18n/index.ts)

**Supported Languages**:
- English (en) - Default
- German (de)

**Translation Files**:
- `src/i18n/locales/en/translation.json`
- `src/i18n/locales/de/translation.json`

**Usage**:
```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
return <h1>{t('dashboard.title', 'Dashboard')}</h1>;
```

**Language Switcher**: [LanguageSwitcher.tsx](../src/components/LanguageSwitcher.tsx)

---

## Error Handling

### Client-Side

**Utility**: [src/utils/getErrorMessage.ts](../src/utils/getErrorMessage.ts)

**Error Categories**:
- `PERMISSION` - RLS policy violations
- `NETWORK` - Connection failures
- `VALIDATION` - Input errors
- `AUTHENTICATION` - Auth failures
- `DATABASE` - Constraint violations
- `RATE_LIMIT` - Too many requests

**Context-Specific Messages**:
- Task completion errors
- Proof upload errors
- Task update errors
- Android-specific enhancements (helpful messages for mobile)

**Toast Notifications**: Uses `react-hot-toast` for user feedback.

---

### Server-Side

**RPC Functions**: Return JSONB with `{ success: boolean, message: string }` format.

**Example** ([purchase_bounty](../supabase/migrations/YYYYMMDDHHMMSS_purchase_bounty_rpc.sql)):
```sql
RETURN jsonb_build_object(
  'success', TRUE,
  'message', 'Reward collected successfully!',
  'collection_id', new_collection_id,
  'reward_name', reward_info.name
);
```

**Edge Functions**: Return standard HTTP error responses (400, 500, etc.).

---

## Monitoring & Logging

**Current State**: No structured logging implemented.

**Recommendations**:
1. **Frontend**: Integrate Sentry for error tracking
2. **Backend**: Use Supabase Dashboard logs for edge functions
3. **RPC Functions**: Add RAISE LOG statements for debugging
4. **Metrics**: Track credit transactions for anomaly detection

---

**Last Updated**: 2025-10-25
**Next Steps**: Review security policies, align schema, implement email notifications.
