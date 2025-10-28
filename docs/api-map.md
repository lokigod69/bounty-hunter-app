# Bounty Hunter App - API Map

## Overview

This document maps all backend API endpoints, RPC functions, database queries, storage operations, and their calling components.

---

## RPC Functions (PostgreSQL Stored Procedures)

### 1. create_reward_store_item

**Type**: Remote Procedure Call (JSONB return)
**Auth**: Authenticated users
**Security**: `SECURITY DEFINER`

**Endpoint**:
```typescript
supabase.rpc('create_reward_store_item', {
  p_name: string,
  p_description: string,
  p_image_url: string,
  p_credit_cost: number,
  p_assigned_to: UUID
})
```

**Returns**:
```typescript
{
  success: boolean,
  message: string,
  reward_id?: UUID
}
```

**Calling Components**:
- [src/hooks/useCreateBounty.ts:34](../src/hooks/useCreateBounty.ts#L34) → `createBounty()`
- Used in: [RewardsStorePage.tsx](../src/pages/RewardsStorePage.tsx) via CreateBountyModal

**Flow**: User fills CreateBountyModal → calls hook → RPC inserts into `rewards_store` → returns reward_id

---

### 2. update_reward_store_item

**Type**: RPC (JSONB return)
**Auth**: Authenticated (creator only via RLS)
**Security**: `SECURITY DEFINER`

**Endpoint**:
```typescript
supabase.rpc('update_reward_store_item', {
  p_bounty_id: UUID,
  p_name: string,
  p_description: string,
  p_image_url: string,
  p_credit_cost: number
})
```

**Returns**: `{ success: boolean, message: string }`

**Calling Components**:
- [src/hooks/useUpdateBounty.ts:19](../src/hooks/useUpdateBounty.ts#L19) → `updateBounty()`
- Used in: [RewardsStorePage.tsx](../src/pages/RewardsStorePage.tsx) via EditBountyModal

---

### 3. delete_reward_store_item

**Type**: RPC (JSONB return)
**Auth**: Authenticated (creator only)
**Security**: `SECURITY DEFINER`

**Endpoint**:
```typescript
supabase.rpc('delete_reward_store_item', {
  p_bounty_id: UUID
})
```

**Returns**: `{ success: boolean, message: string }`

**Calling Components**:
- [src/hooks/useDeleteBounty.ts:17](../src/hooks/useDeleteBounty.ts#L17) → `deleteBounty()`
- Used in: [RewardsStorePage.tsx](../src/pages/RewardsStorePage.tsx) via RewardCard delete button

---

### 4. purchase_bounty

**Type**: RPC (boolean return)
**Auth**: Authenticated
**Security**: `SECURITY DEFINER`

**Endpoint**:
```typescript
supabase.rpc('purchase_bounty', {
  p_bounty_id: UUID,
  p_collector_id: UUID
})
```

**Returns**: `boolean` (success/failure)

**Side Effects**:
1. Deducts credits via `decrement_user_credits()`
2. Inserts into `collected_rewards`
3. Triggers edge function `notify-reward-creator` (client-side)

**Calling Components**:
- [src/hooks/usePurchaseBounty.ts:31](../src/hooks/usePurchaseBounty.ts#L31) → `purchaseBounty()`
- [src/hooks/useRewardsStore.ts:154](../src/hooks/useRewardsStore.ts#L154) → `purchaseReward()`
- Used in: [RewardsStorePage.tsx](../src/pages/RewardsStorePage.tsx) via RewardCard "Claim" button

**Flow**:
```
User clicks "Claim"
→ purchaseBounty RPC
  → Validate (not creator, not already claimed, active)
  → decrement_user_credits
  → INSERT collected_rewards
  → Return success
→ Client calls notify-reward-creator edge function
→ Refetch rewards list
```

---

### 5. increment_user_credits

**Type**: RPC (VOID return)
**Auth**: ⚠️ **VULNERABLE** - Authenticated (should be service_role only)
**Security**: `SECURITY DEFINER`

**Endpoint**:
```typescript
supabase.rpc('increment_user_credits', {
  user_id_param: UUID,
  amount_param: number
})
```

**Returns**: `void`

**Side Effects**:
- Creates `user_credits` row if doesn't exist
- Increments `balance` and `total_earned`

**Calling Components**:
- [src/pages/IssuedPage.tsx:165](../src/pages/IssuedPage.tsx#L165) → Direct call on task approval
- [complete_task_instance RPC](../supabase/migrations/20231117000000_complete_task_instance.sql#L36) → Server-side call

**⚠️ CRITICAL SECURITY ISSUE**: Clients can award themselves unlimited credits. See [overview.md - Risk #2](./overview.md#top-10-risks).

**Fix Required**: Revoke `authenticated` access, move to service_role or database trigger.

---

### 6. decrement_user_credits

**Type**: RPC (boolean return)
**Auth**: Authenticated (safe - only deducts)
**Security**: `SECURITY DEFINER`

**Endpoint**:
```typescript
supabase.rpc('decrement_user_credits', {
  user_id_param: UUID,
  amount_param: number
})
```

**Returns**: `boolean` (true if sufficient funds, false otherwise)

**Calling Components**:
- [purchase_bounty RPC](../supabase/migrations/YYYYMMDDHHMMSS_purchase_bounty_rpc.sql#L34) → Server-side call only

**Not Directly Called by Clients**: Safe - only invoked by trusted RPC functions.

---

### 7. complete_task_instance (UNUSED)

**Type**: RPC (TABLE return)
**Auth**: Authenticated
**Security**: `SECURITY DEFINER`

**Endpoint**:
```typescript
supabase.rpc('complete_task_instance', {
  instance_id_param: UUID,
  user_id_param: UUID,
  proof_description_param?: string
})
```

**Returns**: `{ j: JSONB }` with success/message

**Status**: **NOT USED** - Recurring tasks feature not implemented in frontend.

---

## Database Queries (Direct Table Access)

### Tasks Table

#### Query: Fetch Assigned Contracts

**Hook**: [src/hooks/useAssignedContracts.ts:41](../src/hooks/useAssignedContracts.ts#L41)

**Query**:
```typescript
supabase
  .from('tasks')
  .select(`
    *,
    creator:profiles!created_by(id, display_name, email, avatar_url),
    assignee:profiles!assigned_to(id, display_name, email, avatar_url)
  `)
  .eq('assigned_to', userId)
  .eq('is_archived', false)
  .order('created_at', { ascending: false })
```

**Auth**: RLS enforces `auth.uid() IN (created_by, assigned_to)`

**Components**: [Dashboard.tsx](../src/pages/Dashboard.tsx)

---

#### Query: Fetch Issued Contracts

**Hook**: [src/hooks/useIssuedContracts.ts:41](../src/hooks/useIssuedContracts.ts#L41)

**Query**:
```typescript
supabase
  .from('tasks')
  .select(`
    *,
    creator:profiles!created_by(*),
    assignee:profiles!assigned_to(*)
  `)
  .eq('created_by', userId)
  .order('created_at', { ascending: false })
```

**Components**: [IssuedPage.tsx](../src/pages/IssuedPage.tsx)

---

#### Query: Fetch Archived Contracts

**Hook**: [src/hooks/useArchivedContracts.ts:24](../src/hooks/useArchivedContracts.ts#L24)

**Query**:
```typescript
supabase
  .from('tasks')
  .select(`*, creator:profiles!created_by(*), assignee:profiles!assigned_to(*)`)
  .eq('assigned_to', userId)
  .eq('is_archived', true)
  .order('completed_at', { ascending: false })
```

**Components**: [ArchivePage.tsx](../src/pages/ArchivePage.tsx)

---

#### Mutation: Create Task

**Hook**: [src/hooks/useTasks.ts:228](../src/hooks/useTasks.ts#L228)

**Query**:
```typescript
supabase
  .from('tasks')
  .insert([taskData])
  .select()
```

**Components**: [IssuedPage.tsx](../src/pages/IssuedPage.tsx) via TaskForm

---

#### Mutation: Update Task Status

**Hook**: [src/hooks/useTasks.ts:311](../src/hooks/useTasks.ts#L311)

**Query**:
```typescript
supabase
  .from('tasks')
  .update({ status: newStatus, completed_at })
  .eq('id', taskId)
  .select()
```

**Components**: [Dashboard.tsx](../src/pages/Dashboard.tsx), [IssuedPage.tsx](../src/pages/IssuedPage.tsx)

---

#### Mutation: Delete Task

**Hook**: [src/hooks/useTasks.ts:663](../src/hooks/useTasks.ts#L663)

**Query**:
```typescript
supabase
  .from('tasks')
  .delete()
  .eq('id', taskId)
```

**Components**: [IssuedPage.tsx](../src/pages/IssuedPage.tsx) via TaskCard

---

### Profiles Table

#### Query: Fetch User Profile

**Hook**: [src/hooks/useAuth.ts:52](../src/hooks/useAuth.ts#L52)

**Query**:
```typescript
supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()
```

**Auth**: RLS allows SELECT for all users

**Components**: All pages (via `useAuth` hook in ProtectedRoute)

---

#### Query: Search Profiles by Email

**Hook**: [src/hooks/useFriends.ts:137](../src/hooks/useFriends.ts#L137)

**Query**:
```typescript
supabase
  .from('profiles')
  .select('id, display_name, email, avatar_url')
  .ilike('display_name', `%${searchTerm}%`)
  .limit(10)
```

**Components**: [Friends.tsx:73](../src/pages/Friends.tsx#L73)

---

#### Mutation: Update Profile

**Hook**: [src/components/ProfileEditModal.tsx:96](../src/components/ProfileEditModal.tsx#L96)

**Query**:
```typescript
supabase
  .from('profiles')
  .update({ display_name, avatar_url })
  .eq('id', userId)
```

**Auth**: RLS allows UPDATE only if `auth.uid() = id`

**Components**: [ProfileEdit.tsx](../src/pages/ProfileEdit.tsx)

---

### Friendships Table

#### Query: Fetch Friendships

**Hook**: [src/hooks/useFriends.ts:67](../src/hooks/useFriends.ts#L67)

**Query**:
```typescript
supabase
  .from('friendships')
  .select(`
    *,
    user1:profiles!user1_id(*),
    user2:profiles!user2_id(*)
  `)
  .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
```

**Auth**: RLS enforces `auth.uid() IN (user1_id, user2_id)`

**Components**: [Friends.tsx](../src/pages/Friends.tsx)

---

#### Mutation: Send Friend Request

**Hook**: [src/hooks/useFriends.ts:147](../src/hooks/useFriends.ts#L147)

**Query**:
```typescript
supabase
  .from('friendships')
  .insert([{
    user1_id: currentUserId,
    user2_id: friendId,
    status: 'pending',
    requested_by: currentUserId
  }])
```

**Auth**: RLS enforces `auth.uid() = requested_by`

**Components**: [Friends.tsx:83](../src/pages/Friends.tsx#L83)

---

#### Mutation: Accept/Reject Request

**Hook**: [src/hooks/useFriends.ts:189](../src/hooks/useFriends.ts#L189)

**Query** (Accept):
```typescript
supabase
  .from('friendships')
  .update({ status: 'accepted' })
  .eq('id', friendshipId)
```

**Query** (Reject):
```typescript
supabase
  .from('friendships')
  .delete()
  .eq('id', friendshipId)
```

**Components**: [Friends.tsx](../src/pages/Friends.tsx)

---

### Rewards Store Table

#### Query: Fetch Rewards

**Hook**: [src/hooks/useRewardsStore.ts:71](../src/hooks/useRewardsStore.ts#L71)

**Query**:
```typescript
supabase
  .from('rewards_store')
  .select('*')
  .eq('is_active', true)
  .order('created_at', { ascending: false })
```

**Auth**: RLS policy missing (see [data-model.md - Schema Discrepancies](./data-model.md#schema-discrepancies--issues))

**Components**: [RewardsStorePage.tsx](../src/pages/RewardsStorePage.tsx)

---

### Collected Rewards Table

#### Query: Fetch Collected Rewards

**Hook**: [src/hooks/useCollectedRewards.ts:53](../src/hooks/useCollectedRewards.ts#L53)

**Query**:
```typescript
supabase
  .from('collected_rewards')
  .select(`
    *,
    reward:rewards_store(*)
  `)
  .eq('collector_id', userId)
  .order('collected_at', { ascending: false })
```

**Auth**: RLS policy missing

**Components**: [MyCollectedRewardsPage.tsx](../src/pages/MyCollectedRewardsPage.tsx) (stub)

---

### User Credits Table

#### Query: Fetch User Credits

**Hook**: [src/components/UserCredits.tsx:36](../src/components/UserCredits.tsx#L36)

**Query**:
```typescript
supabase
  .from('user_credits')
  .select('balance')
  .eq('user_id', userId)
  .single()
```

**Auth**: RLS policy missing

**Components**: [UserCredits.tsx](../src/components/UserCredits.tsx) (displayed in Layout header)

---

## Storage Operations

### Bucket: bounty-proofs

#### Upload Proof File

**Hook**: [src/hooks/useTasks.ts:532](../src/hooks/useTasks.ts#L532)

**Operation**:
```typescript
supabase.storage
  .from('bounty-proofs')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: false
  })
```

**Path**: `proofs/{taskId}/{timestamp}.{ext}`

**Auth**: Bucket policy allows authenticated users to upload

**Components**: [Dashboard.tsx:64](../src/pages/Dashboard.tsx#L64), [TaskCard.tsx](../src/components/TaskCard.tsx) via ProofSubmissionModal

---

#### Get Public URL

**Hook**: [src/hooks/useTasks.ts:545](../src/hooks/useTasks.ts#L545)

**Operation**:
```typescript
supabase.storage
  .from('bounty-proofs')
  .getPublicUrl(filePath)
```

**Returns**: `{ publicUrl: string }`

**Components**: [Dashboard.tsx:72](../src/pages/Dashboard.tsx#L72)

---

#### Delete Proof File

**Hook**: [src/hooks/useTasks.ts:652](../src/hooks/useTasks.ts#L652)

**Operation**:
```typescript
supabase.storage
  .from('bounty-proofs')
  .remove([filePath])
```

**Trigger**: Called before deleting task (cleanup)

**Components**: [useTasks.ts deleteTask()](../src/hooks/useTasks.ts#L652)

---

### Bucket: avatars

#### Upload Avatar

**Hook**: [src/components/ProfileEditModal.tsx:84](../src/components/ProfileEditModal.tsx#L84)

**Operation**:
```typescript
supabase.storage
  .from('avatars')
  .upload(filePath, file, { upsert: true })
```

**Path**: `{userId}.{ext}` (assumed)

**Components**: [ProfileEdit.tsx:51](../src/pages/ProfileEdit.tsx#L51), [ProfileEditModal.tsx](../src/components/ProfileEditModal.tsx)

---

## Edge Functions

### notify-reward-creator

**Runtime**: Deno (TypeScript)
**Trigger**: Client-side call after `purchase_bounty` RPC
**Auth**: Service role key (server-side)

**Endpoint**:
```
POST /functions/v1/notify-reward-creator
```

**Request Body**:
```typescript
{
  reward_id: UUID,
  collector_id: UUID
}
```

**Response**:
```typescript
{
  message: string
}
```

**Logic**:
1. Fetch reward details (creator_id, name)
2. Fetch creator profile (email, username)
3. Fetch collector profile (username)
4. Send email to creator (currently MOCK)

**Calling Components**:
- [src/hooks/useRewardsStore.ts:154](../src/hooks/useRewardsStore.ts#L154) → `triggerNotification()`

**Status**: ⚠️ **NOT FUNCTIONAL** - Email sending is mocked. See [overview.md - Risk #8](./overview.md#top-10-risks).

---

## Real-Time Subscriptions

### Tasks Channel

**Hook**: [src/hooks/useTasks.ts](../src/hooks/useTasks.ts)

**Subscription**:
```typescript
supabase
  .channel('tasks-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks'
  }, () => refetch())
  .subscribe()
```

**Events**: INSERT, UPDATE, DELETE

**Components**: [Dashboard.tsx](../src/pages/Dashboard.tsx), [IssuedPage.tsx](../src/pages/IssuedPage.tsx)

---

### Friendships Channel

**Hook**: [src/hooks/useFriends.ts](../src/hooks/useFriends.ts)

**Subscription**:
```typescript
supabase
  .channel('friendships-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'friendships'
  }, () => refreshFriends())
  .subscribe()
```

**Components**: [Friends.tsx](../src/pages/Friends.tsx)

---

### User Credits Channel

**Component**: [src/components/UserCredits.tsx:49](../src/components/UserCredits.tsx#L49)

**Subscription**:
```typescript
supabase
  .channel('user-credits')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'user_credits',
    filter: `user_id=eq.${userId}`
  }, (payload) => setCredits(payload.new.balance))
  .subscribe()
```

**Components**: [UserCredits.tsx](../src/components/UserCredits.tsx) (in Layout header)

---

## Authentication Endpoints

### Sign In with OTP

**Hook**: [src/hooks/useAuth.ts](../src/hooks/useAuth.ts)

**Method**:
```typescript
supabase.auth.signInWithOtp({
  email: userEmail,
  options: {
    emailRedirectTo: window.location.origin
  }
})
```

**Components**: [Login.tsx](../src/pages/Login.tsx)

---

### Sign Out

**Hook**: [src/hooks/useAuth.ts](../src/hooks/useAuth.ts)

**Method**:
```typescript
supabase.auth.signOut()
```

**Components**: [Layout.tsx](../src/components/Layout.tsx) (profile menu)

---

### Auth State Listener

**Hook**: [src/hooks/useAuth.ts](../src/hooks/useAuth.ts)

**Method**:
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    fetchProfile(session.user.id);
  }
})
```

**Components**: All protected routes (via `useAuth` hook)

---

## API Call Patterns

### Optimistic Update Pattern

**Example**: [src/hooks/useTasks.ts:311](../src/hooks/useTasks.ts#L311) - `updateTaskStatus()`

```typescript
// 1. Update local state immediately
setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

// 2. Show loading toast
toast.loading('Updating task...');

// 3. Send request
const { data, error } = await supabase
  .from('tasks')
  .update({ status: newStatus })
  .eq('id', taskId);

// 4. On success: Confirm update
if (!error) {
  toast.success('Task updated!');
} else {
  // 5. On error: Rollback
  setTasks(originalTasks);
  toast.error('Update failed');
}
```

---

### Error Handling Pattern

**Utility**: [src/utils/getErrorMessage.ts](../src/utils/getErrorMessage.ts)

**Usage**:
```typescript
import { getErrorMessage } from '@/utils/getErrorMessage';

try {
  const { error } = await supabase.from('tasks').insert(...);
  if (error) throw error;
} catch (err) {
  const message = getErrorMessage(err, 'task-creation');
  toast.error(message);
}
```

**Categories**:
- PERMISSION - RLS violations
- NETWORK - Connection failures
- VALIDATION - Input errors
- AUTHENTICATION - Auth failures
- DATABASE - Constraint violations

---

## Performance Considerations

### Query Optimization

**Profile Joins**:
```typescript
// GOOD - Single query with joins
.select(`*, creator:profiles!created_by(*)`)

// BAD - Multiple queries
const tasks = await supabase.from('tasks').select('*');
const profiles = await Promise.all(
  tasks.map(t => supabase.from('profiles').select('*').eq('id', t.created_by))
);
```

**Indexes Used**:
- `tasks.created_by` - Indexed for joins
- `tasks.assigned_to` - Indexed for joins
- `friendships(user1_id, user2_id)` - Composite unique index

---

### Caching Strategy

**Current State**: No client-side caching (all queries fetch fresh data)

**Recommendations**:
1. Use React Query or SWR for automatic caching
2. Cache profile data (rarely changes)
3. Cache friend list (low churn)
4. Invalidate on real-time events

---

## API Security Summary

| Endpoint | Auth | RLS | Vulnerability |
|----------|------|-----|---------------|
| `create_reward_store_item` | ✅ Authenticated | ⚠️ Missing | Medium - RLS gap |
| `purchase_bounty` | ✅ Authenticated | ⚠️ Missing | Medium - Race condition |
| `increment_user_credits` | ❌ **Authenticated** | N/A | **🔴 CRITICAL - Client callable** |
| `tasks` SELECT | ✅ Authenticated | ✅ Enforced | Low |
| `tasks` INSERT | ✅ Authenticated | ✅ Enforced | Low |
| `profiles` SELECT | Public | ✅ Enforced | Low |
| `friendships` SELECT | ✅ Authenticated | ✅ Enforced | Low |
| `rewards_store` SELECT | ✅ Authenticated | ❌ **Missing** | **🔴 High - No RLS** |
| `user_credits` SELECT | ✅ Authenticated | ❌ **Missing** | **🔴 High - No RLS** |

---

**Last Updated**: 2025-10-25
**Priority**: Fix `increment_user_credits` access control and add missing RLS policies.
