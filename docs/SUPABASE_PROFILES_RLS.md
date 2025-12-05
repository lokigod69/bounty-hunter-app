# Supabase Profiles RLS Issue Diagnosis

**Date**: 2025-12-05
**Status**: Requires Supabase Dashboard Action

---

## Error Observed

When saving a profile in `ProfileEditModal`, the following error occurs:

```
Failed to load resource: 403
{
  code: "42501",
  message: "new row violates row-level security policy for table \"profiles\""
}
```

---

## Root Cause

In **R10**, the profile save logic was changed from `.update()` to `.upsert()` to handle cases where a profile row doesn't exist yet:

```typescript
// ProfileEditModal.tsx
const { data, error } = await supabase
  .from('profiles')
  .upsert(
    { id: user.id, display_name: displayName, avatar_url: avatarUrl },
    { onConflict: 'id' }
  )
  .select('*')
  .single();
```

The problem is that **upsert** attempts an **INSERT** when no matching row exists. If the RLS policy on `profiles` only allows `UPDATE` and not `INSERT`, the operation fails with error `42501`.

---

## Current Behavior

1. User logs in → `useAuth` fetches profile
2. If no profile row exists → `profile` is `null` → `hasProfile` is `false`
3. Pages like **Friends**, **Family**, or **Partner** check `hasProfile` before rendering
4. Result: **Pages stall in loading state** because profile never gets created

---

## Impact

| Area | Symptom |
|------|---------|
| Profile Edit | "Save" button fails silently with RLS error |
| Header Identity | Shows email instead of display name |
| Friends/Family/Partner | Stuck on loading spinner |
| useFriends hook | Channel subscription skipped (no userId) |

---

## Recommended SQL Policies

Apply these policies in the **Supabase Dashboard** under:
**Database → Tables → profiles → RLS Policies**

### 1. Allow users to INSERT their own profile

```sql
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);
```

### 2. Allow users to UPDATE their own profile

```sql
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

### 3. Allow users to SELECT their own profile

```sql
CREATE POLICY "Users can read their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);
```

### 4. (Optional) Allow users to read other profiles for friend display

```sql
CREATE POLICY "Users can read profiles of friends"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR
  EXISTS (
    SELECT 1 FROM friendships
    WHERE (user_id = auth.uid() AND friend_id = profiles.id)
       OR (friend_id = auth.uid() AND user_id = profiles.id)
  )
);
```

---

## Verification Steps

After applying the policies:

1. **Test Profile Creation**
   - Log in as a new user (one without a profile row)
   - Open Profile Edit modal
   - Enter display name and save
   - Check console for `[ProfileEditModal] Upsert result` log
   - Verify no `42501` error

2. **Test Profile Update**
   - Log in as existing user
   - Change display name or avatar
   - Save and verify changes persist

3. **Test Friends Page**
   - Navigate to Friends/Guild Roster
   - Verify page loads without stalling
   - Check console for `[useFriends] subscribing to channel` log

---

## Frontend Code (Already Implemented)

The frontend already has proper logging to diagnose this issue:

```typescript
// ProfileEditModal.tsx
console.log('[ProfileEditModal] Saving profile', {
  userId: user.id,
  display_name: displayName,
  avatar_url: avatarUrl?.substring(0, 50),
});

console.log('[ProfileEditModal] Upsert result', { data, error });
```

---

## Important Notes

- **Frontend cannot bypass RLS** - This is by design for security
- The environment owner must apply these policies via:
  - Supabase Dashboard (SQL Editor or Table Policies UI)
  - Database migrations (if using Supabase CLI)
- Once policies are applied, the existing frontend code will work without changes

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- R10 commit: ProfileEditModal changed to upsert

---

*Rose – 2025-12-05 R11*
