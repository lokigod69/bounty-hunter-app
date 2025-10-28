# Bounty Hunter App - State & Events

## State Management Architecture

**Pattern**: Context + Custom Hooks (no Redux/Zustand)

### State Distribution

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client State Layer                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Global UI State (React Context)                                │
│  └─ UIContext: Mobile menu visibility                           │
│                                                                 │
│  Session State (Supabase)                                       │
│  └─ SessionContextProvider: Auth session, JWT token             │
│                                                                 │
│  Feature State (Custom Hooks)                                   │
│  ├─ useAuth: user, profile, session                             │
│  ├─ useTasks: tasks[], loading, error                           │
│  ├─ useFriends: friends[], pendingRequests[]                    │
│  ├─ useRewardsStore: rewards[]                                  │
│  └─ useCollectedRewards: collectedRewards[]                     │
│                                                                 │
│  Local Component State (useState)                               │
│  └─ Form inputs, modal visibility, UI toggles                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│  Supabase DB   │  │  Supabase Auth   │  │  Supabase Storage  │
│  (Postgres)    │  │  (JWT tokens)    │  │  (S3-compatible)   │
└────────────────┘  └──────────────────┘  └────────────────────┘
```

---

## State Locations

### Server State (Source of Truth)

| Data Type | Table/Source | Accessed Via | Cached? |
|-----------|--------------|--------------|---------|
| User Profile | `profiles` | `useAuth()` | No (fetch on mount) |
| Tasks (Assigned) | `tasks` | `useAssignedContracts()` | No |
| Tasks (Created) | `tasks` | `useIssuedContracts()` | No |
| Tasks (Archived) | `tasks` | `useArchivedContracts()` | No |
| Friendships | `friendships` | `useFriends()` | No |
| Rewards | `rewards_store` | `useRewardsStore()` | No |
| Collected Rewards | `collected_rewards` | `useCollectedRewards()` | No |
| User Credits | `user_credits` | `UserCredits` component | Real-time sync |
| Proof Files | Storage bucket `bounty-proofs` | Direct URL access | Browser cache |
| Avatar Files | Storage bucket `avatars` | Direct URL access | Browser cache |

**Caching Strategy**: None (all queries refetch on mount). Consider React Query for optimization.

---

### Client State

| State | Scope | Managed By | Persistence |
|-------|-------|------------|-------------|
| Mobile Menu Open | Global | `UIContext` | Memory only |
| Auth Session | Global | Supabase SDK | Browser session storage |
| Current User | Global | `useAuth()` | Memory (refetched on mount) |
| Form Inputs | Component | `useState` / `react-hook-form` | Memory only |
| Modal Visibility | Component | `useState` | Memory only |
| Upload Progress | Component | `useState` in `useTasks` | Memory only |
| Language Preference | Global | i18next | localStorage (`i18nextLng`) |
| Daily Quote | Global | `useDailyQuote()` | localStorage |
| Sound Settings | Global | `soundManager` | localStorage (`soundEnabled`) |

---

## Event Flows

### Flow 1: Create & Assign Task

```
┌─────────────────────────────────────────────────────────────────────┐
│ User Action: Click "Create Contract" button                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ IssuedPage.tsx: Open TaskForm modal                                │
│  • Local state: isModalOpen = true                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ User fills form:                                                    │
│  • title, description, assigned_to (FriendSelector)                │
│  • reward_type, reward_text, deadline, proof_required              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ User Action: Click "Create"                                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ useTasks.createTask():                                              │
│  1. Optimistic update: setTasks([newTask, ...tasks])               │
│  2. toast.loading("Creating task...")                              │
│  3. supabase.from('tasks').insert([newTaskData])                   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
          ┌─────────────────┐     ┌─────────────────┐
          │   SUCCESS       │     │    ERROR        │
          └────────┬────────┘     └────────┬────────┘
                   │                       │
                   ▼                       ▼
    ┌──────────────────────────┐  ┌──────────────────────────┐
    │ Confirm with server data │  │ Rollback local state     │
    │ toast.success()          │  │ toast.error()            │
    │ Close modal              │  │ Show validation errors   │
    └──────────┬───────────────┘  └──────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────────────────────────┐
    │ Real-time event fires:                                    │
    │  • Supabase realtime channel "tasks-changes"             │
    │  • Event: INSERT on tasks table                          │
    │  • Listener in useTasks refetches tasks                  │
    └──────────┬───────────────────────────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────────────────────────┐
    │ Assignee sees new task in Dashboard                      │
    │  • useAssignedContracts() refetches                       │
    │  • TaskCard renders with new data                        │
    └──────────────────────────────────────────────────────────┘
```

**State Changes**:
1. `isModalOpen`: false → true → false
2. `tasks[]`: [...existing] → [optimistic, ...existing] → [confirmed, ...existing]
3. `loading`: false → true → false

---

### Flow 2: Submit Proof & Approve Task

```
┌─────────────────────────────────────────────────────────────────────┐
│ Assignee: View assigned task in Dashboard                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Click TaskCard → Expand modal                                      │
│  • Local state: isExpanded = true                                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Click "Submit Proof" → ProofSubmissionModal opens                  │
│  • If proof_required = false, skip to "Mark Complete"              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ User selects file (image/video)                                    │
│  • FileUpload component: file size/type validation                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ useTasks.uploadProof():                                             │
│  1. Generate path: proofs/{taskId}/{timestamp}.{ext}               │
│  2. supabase.storage.from('bounty-proofs').upload()                │
│  3. Track progress: setUploadProgress(0-100)                       │
│  4. Get public URL                                                 │
│  5. supabase.from('tasks').update({ proof_url, status: 'review' }) │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Task status: "pending" → "review"                                  │
│  • Creator notified via realtime subscription                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Creator: View task in IssuedPage                                   │
│  • TaskCard shows "Review Proof" button                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Creator clicks "Approve"                                            │
│  • ConfirmationModal: "Award credits to user?"                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ IssuedPage.handleApprove():                                         │
│  1. supabase.from('tasks').update({ status: 'completed' })         │
│  2. supabase.rpc('increment_user_credits', { user_id, amount })    │
│  3. toast.success("Credits awarded!")                              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Assignee: Credits updated in real-time                             │
│  • UserCredits component subscribes to user_credits changes        │
│  • Balance updates instantly                                       │
│  • Confetti animation triggers                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**State Changes**:
1. Task status: `pending` → `review` → `completed`
2. Task `proof_url`: `null` → `https://...storage.../proofs/...`
3. User credits balance: `X` → `X + reward_amount`
4. Upload progress: `0%` → `100%` → reset

---

### Flow 3: Purchase Bounty from Rewards Store

```
┌─────────────────────────────────────────────────────────────────────┐
│ User: Navigate to /rewards-store                                   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ useRewardsStore.fetchRewards():                                     │
│  • Query: SELECT * FROM rewards_store WHERE is_active = true       │
│  • Filter by assigned_to (personalized bounties)                   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ RewardCard displays bounty with "Claim" button                     │
│  • Show credit_cost (e.g., "100 credits")                          │
│  • Compare with user's current balance                             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ User clicks "Claim"                                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ usePurchaseBounty.purchaseBounty():                                 │
│  1. toast.loading("Purchasing bounty...")                          │
│  2. supabase.rpc('purchase_bounty', { p_bounty_id, p_collector_id })│
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ RPC: purchase_bounty executes:                                      │
│  1. Validate: reward exists, is active, not creator, not claimed   │
│  2. Call decrement_user_credits(collector_id, credit_cost)         │
│  3. INSERT INTO collected_rewards (reward_id, collector_id)        │
│  4. Return { success: true, reward_name }                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
          ┌─────────────────┐     ┌─────────────────┐
          │   SUCCESS       │     │    ERROR        │
          └────────┬────────┘     └────────┬────────┘
                   │                       │
                   ▼                       ▼
    ┌──────────────────────────┐  ┌──────────────────────────┐
    │ Client receives success  │  │ toast.error(message)     │
    │ toast.success()          │  │ (e.g., insufficient      │
    │ Confetti animation       │  │  credits, already        │
    │ Trigger notification     │  │  claimed)                │
    └──────────┬───────────────┘  └──────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────────────────────────┐
    │ useRewardsStore.triggerNotification():                    │
    │  • POST /functions/v1/notify-reward-creator              │
    │  • Body: { reward_id, collector_id }                     │
    └──────────┬───────────────────────────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────────────────────────┐
    │ Edge Function: notify-reward-creator                     │
    │  1. Fetch creator email from profiles                    │
    │  2. Fetch collector username                             │
    │  3. Send email (MOCKED - not implemented)                │
    └──────────┬───────────────────────────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────────────────────────┐
    │ User credits updated:                                     │
    │  • Real-time subscription in UserCredits fires           │
    │  • Balance: X → X - credit_cost                          │
    │  • Display updated balance in header                     │
    └──────────────────────────────────────────────────────────┘
```

**State Changes**:
1. User credits: `X` → `X - credit_cost`
2. `collected_rewards`: New row inserted
3. Reward visibility: May disappear from "Available" tab if one-time claim

---

### Flow 4: Friend Request & Acceptance

```
┌─────────────────────────────────────────────────────────────────────┐
│ User A: Navigate to /friends                                       │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Search for friend by display_name                                  │
│  • Input change triggers debounced search                          │
│  • useFriends.searchByEmail()                                       │
│  • Query: profiles WHERE display_name ILIKE '%search%'             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Select user from results → Click "Add Friend"                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ useFriends.sendFriendRequest():                                     │
│  1. Check for existing friendship (both directions)                │
│  2. INSERT INTO friendships (user1_id, user2_id, status: 'pending')│
│  3. Optimistic update: Add to sentRequests[]                       │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ User B: Receives real-time notification                            │
│  • Friendships channel fires INSERT event                          │
│  • useFriends refetches friendships                                 │
│  • pendingRequests[] updated                                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ User B: Views "Requests" tab in /friends                           │
│  • FriendCard shows "Accept" / "Reject" buttons                    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ User B clicks "Accept"                                              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ useFriends.respondToFriendRequest(id, true):                       │
│  • UPDATE friendships SET status = 'accepted' WHERE id = {id}      │
│  • Optimistic update: Move from pendingRequests to friends         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ User A: Real-time update                                            │
│  • Friendships channel fires UPDATE event                          │
│  • sentRequests[] → friends[]                                       │
│  • Can now assign tasks to User B                                  │
└─────────────────────────────────────────────────────────────────────┘
```

**State Changes** (User A):
1. `sentRequests[]`: [...existing] → [...existing, newRequest] → [...existing]
2. `friends[]`: [...existing] → [...existing, acceptedFriend]

**State Changes** (User B):
1. `pendingRequests[]`: [...existing] → [...existing, newRequest] → [...existing]
2. `friends[]`: [...existing] → [...existing, acceptedFriend]

---

## State Synchronization

### Real-Time Sync Mechanisms

| Table | Channel Name | Events | Listeners | Trigger Action |
|-------|--------------|--------|-----------|----------------|
| `tasks` | `tasks-changes` | INSERT, UPDATE, DELETE | `useTasks`, `useAssignedContracts`, `useIssuedContracts` | `refetch()` or `refreshFriends()` |
| `friendships` | `friendships-changes` | INSERT, UPDATE, DELETE | `useFriends` | `refreshFriends()` |
| `user_credits` | `user-credits` | UPDATE | `UserCredits` component | Update local `credits` state |

**Pattern**:
```typescript
useEffect(() => {
  const channel = supabase
    .channel('unique-channel-name')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'table_name'
    }, () => refetchData())
    .subscribe();

  return () => { channel.unsubscribe(); };
}, [dependencies]);
```

---

### Optimistic Updates

**Used In**: Task creation, task status updates, friend requests, bounty purchases

**Pattern**:
```typescript
1. Update local state immediately (instant UI feedback)
2. Send mutation to server
3. On success: Replace optimistic data with server response
4. On error: Rollback to previous state
```

**Benefits**:
- Instant feedback (no spinners)
- Better perceived performance
- Graceful error handling

**Risks**:
- State desync if server validation fails
- Requires careful rollback logic

---

## Event-Driven Side Effects

### Triggers & Cascades

| Event | Trigger | Side Effect |
|-------|---------|-------------|
| User signs up | `on_auth_user_created` trigger | Create `profiles` row |
| Task approved | Client calls `increment_user_credits` RPC | Update `user_credits.balance` |
| Bounty purchased | Client calls `purchase_bounty` RPC | Deduct credits, insert `collected_rewards`, call edge function |
| Bounty purchased | Edge function `notify-reward-creator` | Send email to creator (mocked) |
| Bounty updated | `on_bounties_updated` trigger | Update `updated_at` timestamp |
| Task proof uploaded | Client uploads to storage | Update `tasks.proof_url` |
| Task deleted | Client deletes task | Delete proof file from storage |

---

## State Persistence

### Browser Storage

| Data | Storage Type | Key | Managed By |
|------|--------------|-----|------------|
| Auth Session | Session Storage | `supabase.auth.token` | Supabase SDK |
| Language Preference | LocalStorage | `i18nextLng` | i18next |
| Daily Quote | LocalStorage | `dailyQuote_shuffledQuotes_v3`, `dailyQuote_currentIndex_v3`, `dailyQuote_lastDate_v3` | `useDailyQuote()` |
| Sound Enabled | LocalStorage | `soundEnabled` | `soundManager.ts` |

**Session Expiry**: JWT tokens expire after 1 hour (Supabase default). Refresh handled automatically by SDK.

---

## Loading & Error States

### Loading Patterns

**Per-Hook Loading State**:
```typescript
const { data, loading, error } = useCustomHook();

return (
  <>
    {loading && <Skeleton />}
    {error && <ErrorMessage />}
    {data && <DataDisplay />}
  </>
);
```

**Global Loading (None)**: No app-wide loading state. Each feature manages its own loading.

---

### Error Boundaries

**Current State**: No React Error Boundaries implemented.

**Recommendation**: Add error boundaries at route level:
```tsx
<ErrorBoundary FallbackComponent={ErrorPage}>
  <Route path="/" element={<Dashboard />} />
</ErrorBoundary>
```

---

## State Flow Diagram (Simplified)

```
User Action
    │
    ▼
Component Event Handler
    │
    ├─→ Local State Update (useState)
    │   └─→ UI Re-render
    │
    └─→ Custom Hook Action (useTasks, useFriends, etc.)
        │
        ├─→ Optimistic State Update
        │   └─→ UI Re-render (instant feedback)
        │
        └─→ Supabase API Call
            │
            ├─→ Success
            │   ├─→ Confirm State with Server Data
            │   ├─→ Toast Notification
            │   └─→ Real-time Event (optional)
            │       └─→ Other Clients Update
            │
            └─→ Error
                ├─→ Rollback Optimistic Update
                ├─→ Toast Error Message
                └─→ UI Re-render (original state)
```

---

## Performance Considerations

### State Update Frequency

| State | Update Frequency | Optimization |
|-------|------------------|--------------|
| Task list | On mount + real-time events | Debounce real-time refetch (500ms) |
| Friend list | On mount + real-time events | Memoize friend categorization |
| User credits | On mount + real-time updates | Direct state update (no refetch) |
| Profile data | On mount only | Cache in memory (rarely changes) |

### Memoization

**Used In**:
- [useTasks.ts](../src/hooks/useTasks.ts): `useMemo` for `assignedTasks` and `createdTasks`
- [useFriends.ts](../src/hooks/useFriends.ts): `useMemo` for categorizing friends/requests

**Pattern**:
```typescript
const assignedTasks = useMemo(
  () => tasks.filter(t => t.assigned_to === user?.id),
  [tasks, user?.id]
);
```

---

## State Management Best Practices

✅ **Do**:
- Use custom hooks for feature state
- Implement optimistic updates for mutations
- Subscribe to real-time events for live data
- Use `useCallback` for stable function references
- Clean up subscriptions in useEffect cleanup

❌ **Don't**:
- Store server data in global context (use hooks)
- Fetch data in render (use useEffect)
- Forget to unsubscribe from real-time channels
- Mutate state directly (use setters)

---

**Last Updated**: 2025-10-25
**Next Review**: After implementing React Query for caching optimization.
