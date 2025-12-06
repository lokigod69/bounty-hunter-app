# Profile Pipeline Analysis (R15)

This document maps all code paths that read from or write to the `public.profiles` table.

---

## WRITERS (places that INSERT/UPDATE/UPSERT profiles)

### 1. profileBootstrap.ts - `ensureProfileForUser()`
- **When**: Called on every login/session change via AuthContext
- **What it writes**:
  - ONLY if no profile exists: `{ id, email, display_name: derivedFromEmail, avatar_url: null }`
  - If profile exists: does NOT write, just returns existing
- **Risk**: Low - only creates defaults for brand new users

### 2. ProfileEditModal.tsx - `handleSubmit()`
- **When**: User clicks Save in Edit Profile modal
- **What it writes**: `{ id, email, display_name, avatar_url }` via UPSERT
- **Risk**: This is the INTENDED mutator for display_name/avatar_url
- **Potential issue**: If `profile` is null when submit runs, `avatarUrl` starts as undefined

### 3. ProfileEdit.tsx - `handleSubmit()`
- **When**: User clicks Save on standalone ProfileEdit page
- **What it writes**: `{ display_name, avatar_url }` via UPDATE
- **Risk**: Same as ProfileEditModal - if profile not loaded, could write null

---

## READERS (places that query profiles)

### 1. AuthContext.tsx - `loadProfile()` and `refreshProfile()`
- **What**: Calls `ensureProfileForUser()`, stores result in React state
- **Consumers**: All components via `useAuth()` hook
- **This is the canonical profile state for the app**

### 2. Layout.tsx - Header identity
- **Source**: `const { profile } = useAuth()`
- **Fallbacks**: Uses `user.email` or placeholder if `profile.display_name`/`profile.avatar_url` is null
- **IMPORTANT**: Fallbacks are for RENDERING only, never written back to DB

### 3. Friends.tsx
- **Source**: `useAuth()` for current user identity
- **Also**: Queries profiles for partner lookup via `usePartnerState`

### 4. useFriends.ts
- **Queries**: `supabase.from('profiles').select('*').eq('id', friendId)` to get friend details
- **Read-only**: Never writes

### 5. usePartnerState.ts
- **Queries**: `supabase.from('profiles').select('*').eq('id', finalPartnerId)` for partner profile
- **Read-only**: Never writes
- **NOTE**: This does a DIRECT DB query, so shows fresh data even if AuthContext is stale

### 6. OnboardingStep3Invite.tsx
- **Queries**: `supabase.from('profiles').select('id, display_name, email').eq('email', ...)` for invite lookup
- **Read-only**: Never writes

---

## THE BUG: Why header shows stale data after reload

### Observed behavior:
1. User saves avatar in ProfileEditModal → header updates immediately ✓
2. User reloads page → header shows DEFAULT avatar, partner view shows CORRECT avatar
3. This means: DB has correct data, but AuthContext.profile has wrong data

### Root cause analysis:

The issue is likely in the timing/sequence of profile loading in AuthContext:

1. On page load, AuthContext Effect 1 runs `getSession()`
2. AuthContext Effect 2 runs `loadProfile()` with `ensureProfileForUser()`
3. `ensureProfileForUser()` should SELECT the existing profile with correct avatar_url
4. But something is causing it to return stale/default data

Possible causes:
- **Supabase query caching** at network level
- **Race condition** where an older request completes after a newer one
- **Profile not yet in DB** when ensureProfile runs (but this would cause INSERT, not return)

### Why partner view shows correct data:
- `usePartnerState` does a DIRECT `supabase.from('profiles').select('*')` query
- This bypasses any potential caching in the ensureProfile path
- The direct query always gets fresh DB data

---

## FIXES NEEDED (R15)

### 1. Add diagnostic logging to trace the issue
- Log the exact avatar_url returned by ensureProfileForUser
- Log timestamps to detect race conditions

### 2. Ensure ensureProfile NEVER overwrites existing values
- Current code is correct (only INSERTs if no profile)
- Add explicit guard comments

### 3. Add cache-busting to ensureProfile query
- Force fresh fetch on every call

### 4. Verify ProfileEditModal preserves avatar_url
- When no new file is selected, must use existing profile.avatar_url
- Add null-check logging

---

## Timeline of profile pipeline execution

```
LOGIN/RELOAD:
1. supabase.auth.getSession() → session available
2. AuthContext Effect 2 fires (session dependency)
3. ensureProfileForUser(session.user) called
4. SELECT * FROM profiles WHERE id = user.id
5. If exists: return existing profile (with avatar_url from DB)
6. If not: INSERT default, return new profile
7. setProfile(profileData) → React state updated
8. Layout.tsx re-renders with new profile
9. Header shows profile.avatar_url or fallback

PROFILE SAVE:
1. User opens ProfileEditModal
2. Modal hydrates: setAvatarPreview(profile?.avatar_url)
3. User optionally selects new file
4. User clicks Save
5. UPSERT to profiles table
6. refreshProfile() called
7. ensureProfileForUser runs again
8. Header updates with new avatar_url
```
