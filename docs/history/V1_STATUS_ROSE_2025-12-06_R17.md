# V1 Status Report – Rose (Round 17)
**Date**: 2025-12-06
**Status**: Profile Reality Check - Debug Infrastructure

---

## Session Summary

This round adds comprehensive debugging infrastructure to trace the exact code path where profile data diverges after reload.

**New Components:**
1. `ProfileDebugger` - Dev-only component that reads directly from DB
2. Enhanced logging throughout the profile pipeline with full URLs

---

## Problem Statement

After R12-R16, the profile pipeline has these observed behaviors:

| Action | Header | Partner View | DB Row |
|--------|--------|--------------|--------|
| After save | NEW data | NEW data | NEW data |
| After reload | OLD data | Sometimes NEW | NEW (assumed) |
| After re-save | NEW data | NEW data | NEW data |

This pattern indicates:
- The DB row is correct (partner view sees it via direct query)
- AuthContext / ensureProfileForUser is returning stale data after reload

---

## Debug Infrastructure Added

### 1. ProfileDebugger Component

Location: `src/components/dev/ProfileDebugger.tsx`

Visible in DEV mode only (bottom-left corner). Features:
- **Fetch DB** button: Reads profile directly from Supabase, logs `[DB PROFILES ROW]`
- **Compare** button: Logs side-by-side comparison of Context vs DB values
- Real-time display of context profile vs DB profile

### 2. Enhanced Logging

All logs now include FULL URLs (not truncated) for accurate comparison.

| Log Tag | Location | What It Shows |
|---------|----------|---------------|
| `[AuthContext] loadProfile start` | AuthContext.tsx | User ID/email before fetch |
| `[ensureProfile:*] select result` | profileBootstrap.ts | Full DB row from SELECT |
| `[AuthContext] Profile loaded successfully` | AuthContext.tsx | Profile set to React state |
| `[Layout] RENDER identity` | Layout.tsx | Values being rendered |
| `[DB PROFILES ROW]` | ProfileDebugger | Direct DB query result |

---

## Testing Procedure

### Phase 1: Prove DB Ground Truth

1. Login with the test account (e148a9fe...)
2. Open Edit Profile
3. Change display name AND avatar
4. Click Save
5. Confirm header + partner view show new values
6. **Click "Fetch DB" button in ProfileDebugger** (bottom-left)
7. Open browser console, find `[DB PROFILES ROW]` log
8. **Copy this log** - this is the ground truth

### Phase 2: Reload and Compare

9. **Hard reload** the page (Ctrl+Shift+R or Cmd+Shift+R)
10. Wait for page to fully load
11. **Click "Fetch DB" button** again
12. Find and copy these console logs:
    - `[AuthContext] loadProfile start`
    - `[ensureProfile:*] select result`
    - `[AuthContext] Profile loaded successfully`
    - `[Layout] RENDER identity`
    - `[DB PROFILES ROW]`
13. **Click "Compare" button** in ProfileDebugger
14. Find `[COMPARISON RESULT]` log - look for any `false` values

### Phase 3: Document Findings

Answer these questions based on the logs:

| Question | Answer (from logs) |
|----------|-------------------|
| What is `[DB PROFILES ROW].avatar_url` after reload? | |
| What is `[ensureProfile:*] select result.avatarUrl` after reload? | |
| What is `[AuthContext] Profile loaded successfully.avatar_url` after reload? | |
| What is `[Layout] RENDER identity.avatarUrlBase` after reload? | |

If all four match and contain the correct URL → The issue is elsewhere (rendering fallback?)
If they diverge at some point → We found where the bug is

---

## Expected Log Sequence (After Reload)

```
[AuthContext] loadProfile start { userId: 'e148a9fe-...', userEmail: '...' }
[ensureProfile:1733500000000] enter { userId: 'e148a9fe', userEmail: '...' }
[ensureProfile:1733500000000] Querying profiles table...
[ensureProfile:1733500000000] select result {
  hasData: true,
  id: 'e148a9fe-...',
  displayName: 'NewName',
  avatarUrl: 'https://...avatars/e148a9fe.../avatar-1733500000000.png',
  ...
}
[ensureProfile:1733500000000] RETURNING EXISTING profile (no modification) { id: 'e148a9fe', hasAvatar: true }
[AuthContext] Profile loaded successfully {
  id: 'e148a9fe-...',
  display_name: 'NewName',
  avatar_url: 'https://...avatars/e148a9fe.../avatar-1733500000000.png',
  ...
}
[Layout] RENDER identity {
  displayName: 'NewName',
  avatarUrlBase: 'https://...avatars/e148a9fe.../avatar-1733500000000.png',
  hasProfile: true,
  ...
}
```

If instead you see `avatarUrlBase: 'NULL'` in Layout RENDER but correct URL in ensureProfile, the bug is between AuthContext and Layout.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/dev/ProfileDebugger.tsx` | NEW - debug component |
| `src/components/Layout.tsx` | Import ProfileDebugger, enhanced logging |
| `src/lib/profileBootstrap.ts` | Enhanced logging with full URLs |
| `src/context/AuthContext.tsx` | Enhanced logging with full URLs |

---

## Hypothesis

Based on the symptoms, the most likely causes are:

1. **React state timing issue**: Effect 2 in AuthContext might be completing with stale data from a previous async operation
2. **Supabase session caching**: The session object might have stale user metadata that's being used somewhere
3. **Race condition in loadProfile**: Multiple concurrent calls overwriting each other

The debug infrastructure will reveal which hypothesis is correct.

---

## Next Steps After Testing

Once you have the logs, we can:

1. If DB differs after reload → Find what's overwriting the row
2. If ensureProfile returns wrong data → Check Supabase query/caching
3. If AuthContext sets wrong data → Check for race conditions
4. If Layout renders wrong data → Check rendering logic/fallbacks

---

*Rose – 2025-12-06 R17*
