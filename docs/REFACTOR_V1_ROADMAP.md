# V1 Refactor Roadmap

These are cleanup items identified during V1 stabilization. **Do not implement now** – this is a parking lot for post-launch work.

---

## 1. Unify Modal/ActiveLayer Layout Logic

**Files**: `Dashboard.tsx`, `IssuedPage.tsx`

**Problem**: Both pages have duplicated render paths for `activeLayer === 'modal'` vs non-modal states. This was done to disable PullToRefresh when a modal is open, but creates maintenance burden where any layout change must be made in two places.

**Suggested Fix**: Create a `<ConditionalPullToRefresh>` wrapper component that checks `activeLayer` internally and conditionally wraps children in PullToRefresh. This would allow a single render path per page.

---

## 2. Bundle Size Reduction

**Current**: 682KB main bundle (warning threshold: 500KB)

**Options**:
- Lazy-load modal components (`TaskCard` expanded view, `ProofModal`, `CreateBountyModal`, etc.)
- Code-split by route using React.lazy
- Move onboarding flow to a separate chunk
- Consider dynamic imports for heavy dependencies (e.g., `react-dropzone`)

---

## 3. Lint Error Cleanup

**Count**: 47 pre-existing errors

**Categories**:
- `@typescript-eslint/no-explicit-any` – Replace `any` with proper types
- `no-useless-escape` in Supabase functions – Remove unnecessary escapes
- Various hook dependency warnings – Review and fix

---

## 4. Consolidate Confirm Dialogs

**Files**: Multiple confirm modal components (`ConfirmDeleteModal`, `ConfirmDialog`, `ConfirmationModal`)

**Problem**: Similar functionality spread across multiple components with slightly different APIs.

**Suggested Fix**: Create a single `<ConfirmDialog>` component with flexible props for title, message, confirm/cancel labels, and danger mode styling. Replace all variants.

---

## 5. ProfileEdit Architecture

**Current**: Two components (`ProfileEdit.tsx` page and `ProfileEditModal.tsx`)

**Problem**: Feature duplication – both have avatar upload, display name editing, but different flows (page has theme selector/system status, modal has language/sound settings).

**Suggested Fix**: Either unify into one component that can be rendered as page or modal, or clearly separate concerns (settings modal vs full profile page).

---

## 6. Sound Manager Type Safety

**File**: `utils/soundManager.ts`

**Problem**: Uses `any` types that trigger lint errors.

**Suggested Fix**: Define proper types for sound names and Howl configuration.

---

## Priority Order (Post-Launch)

1. Lint cleanup (low effort, reduces noise)
2. Bundle size reduction (user-facing performance)
3. Modal/layout unification (developer productivity)
4. Confirm dialog consolidation (code cleanliness)
5. ProfileEdit architecture (nice-to-have)

---

*Last updated: 2025-12-02 by Rose*
