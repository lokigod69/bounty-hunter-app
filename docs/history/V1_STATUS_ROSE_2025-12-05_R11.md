# V1 Status Report – Rose (Round 11)
**Date**: 2025-12-05
**Status**: Modal Refinements + Card Styling + Quote Unification + RLS Diagnosis

---

## Session Summary

Follow-up refinements based on live testing feedback:

1. **Modal copy refinements** - Shortened guild creator label
2. **Modal layout improvements** - CSS grid for aligned description/reward panels
3. **Issued card color tuning** - Dark backgrounds with subtle accent borders
4. **Quote/Creed unification** - Created PageQuote component, unified placement
5. **RLS diagnosis** - Documented Supabase profiles RLS issue and recommended policies

---

## Files Created

| File | Purpose |
|------|---------|
| `src/components/layout/PageQuote.tsx` | Unified quote component for consistent placement |
| `docs/SUPABASE_PROFILES_RLS.md` | RLS issue diagnosis and recommended SQL policies |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/theme/modalTheme.ts` | Guild creator label: "You issued this contract" → "Your contract" |
| `src/components/modals/MissionModalShell.tsx` | CSS grid layout for description/reward alignment |
| `src/components/TaskCard.tsx` | Dark card backgrounds (`bg-[#1a1625]/80`) with accent borders |
| `src/pages/Dashboard.tsx` | Replaced HuntersCreed with PageQuote |
| `src/pages/IssuedPage.tsx` | Added PageQuote at bottom, removed inline quote |

---

## Part 1: Modal Copy & Layout

### 1.1 Guild Creator Label

```diff
- creator: { headerLabel: 'You issued this contract', headerIcon: 'Stamp' },
+ creator: { headerLabel: 'Your contract', headerIcon: 'Stamp' },
```

### 1.2 CSS Grid Layout

Replaced flex-based layout with CSS grid for aligned panels:

```tsx
<div
  className="grid gap-4"
  style={{
    gridTemplateColumns: isMobile
      ? '1fr'
      : reward
      ? 'minmax(0, 2fr) minmax(0, 1fr)'
      : '1fr',
    maxHeight: isMobile ? '60vh' : '50vh',
  }}
>
  {/* Description panel - scrolls internally */}
  {/* Reward panel - same height as description */}
</div>
```

**Benefits**:
- Both panels same height on desktop
- Description scrolls within its container
- Mobile stacks properly
- maxHeight increased: 50vh desktop, 60vh mobile

---

## Part 2: Issued Card Color Tuning

### Before
Cards had bright tinted backgrounds based on status:
- Pending: `bg-red-500/10` (very red)
- Review: `bg-yellow-500/10`
- Completed: `bg-green-500/10`

### After
Dark unified surface with accent borders only:

```typescript
const collapsedCardBgColor = isArchived
  ? 'bg-slate-800/60 border-slate-600/40 hover:border-slate-500'
  : status === 'pending'
  ? 'bg-[#1a1625]/80 border-red-500/40 hover:border-red-400'
  : status === 'review'
  ? 'bg-[#1a1625]/80 border-yellow-500/40 hover:border-yellow-400'
  : 'bg-[#1a1625]/80 border-green-500/40 hover:border-green-400';
```

**Result**: "Dark cards with colored accents" instead of "solid colored blocks"

---

## Part 3: PageQuote Component

### Component

```tsx
// src/components/layout/PageQuote.tsx
export function PageQuote({ text, author }: PageQuoteProps) {
  return (
    <div className="mt-8 text-center text-sm text-white/60">
      <p className="italic">"{text}"</p>
      {author && <p className="mt-1 text-xs text-white/40">– {author}</p>}
    </div>
  );
}
```

### Usage

Both Dashboard and IssuedPage now use identical placement:

```tsx
{dailyQuote && (
  <PageQuote text={dailyQuote.text} author={dailyQuote.author} />
)}
```

**Placement**: Bottom of PageBody, just above page padding

### Removed

- `HuntersCreed` import from Dashboard (component still exists for backwards compatibility)
- Inline quote paragraph from IssuedPage header

---

## Part 4: RLS Diagnosis

### Issue

Profile upsert fails with:
```
code: "42501"
message: "new row violates row-level security policy for table 'profiles'"
```

### Cause

R10 changed profile save from `.update()` to `.upsert()`. When no profile row exists, upsert attempts INSERT, which is blocked by RLS if only UPDATE is allowed.

### Impact

| Area | Symptom |
|------|---------|
| Profile Edit | Save fails silently |
| Header Identity | Shows email instead of name |
| Friends/Family/Partner | Stuck loading |

### Recommended Policies

See [SUPABASE_PROFILES_RLS.md](../SUPABASE_PROFILES_RLS.md) for full SQL:

```sql
-- INSERT policy
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- UPDATE policy
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

**Note**: Frontend cannot bypass RLS. Environment owner must apply policies in Supabase Dashboard.

---

## Verification Checklist

### Modal Refinements
- [ ] Open mission as creator in Guild mode
- [ ] Header shows "Your contract" (not "You issued this contract")
- [ ] Description and reward panels aligned (desktop)
- [ ] Description scrolls within container for long text

### Card Styling
- [ ] Open Issued/Missions page
- [ ] Cards have dark purple/navy background
- [ ] Red/yellow/green borders subtle, not overwhelming
- [ ] Page reads as "dark cards with colored accents"

### Quote Placement
- [ ] Dashboard shows quote at bottom of page
- [ ] IssuedPage shows quote at bottom of page
- [ ] Both quotes use same styling (centered, italic)
- [ ] No quote at top of IssuedPage anymore

### RLS (After Supabase Fix)
- [ ] New user can create profile
- [ ] Existing user can update profile
- [ ] Friends page loads without stalling
- [ ] Console shows `[useFriends] subscribing to channel`

---

## Remaining UI Issues Observed

1. **Profile persistence blocked by RLS** - Documented, requires Supabase action
2. **Friends/Family/Partner stall** - Caused by missing profile, will resolve with RLS fix
3. **HuntersCreed component** - Still exists but unused, can be removed in cleanup phase

---

## Next Steps

1. Apply RLS policies in Supabase Dashboard
2. Re-test profile creation and update
3. Verify Friends/Family/Partner pages load correctly
4. Consider cleanup: remove unused HuntersCreed component

---

*Rose – 2025-12-05 R11*
