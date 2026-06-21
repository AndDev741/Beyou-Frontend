# Task 8 Report — AiRoutineSheet

## Confirmed Import Paths

| Symbol | Path | Export style |
|--------|------|-------------|
| `generateRoutine` | `@beyou/api/ai/generateRoutine` | default |
| `materializeRoutine` | `@beyou/api/ai/materializeRoutine` | default |
| `sortDraft` | `@beyou/api/ai/sortDraft` | **named** (not default — brief had `import sortDraft from` which would fail) |
| `materializeToSections` | `@beyou/api/ai/draftMapping` | named |
| `aiDescriptionSchema` | `@beyou/validation` | named (re-exported from index.ts) |
| `getHabits` | `@beyou/api/habits/getHabits` | default |
| `getTasks` | `@beyou/api/tasks/getTasks` | default |
| `getCategories` | `@beyou/api/categories/getCategories` | default |
| `getFriendlyErrorMessage` | `@beyou/api/apiError` | named |
| `enterHabits` | `@beyou/state/habit/habitsSlice` | named |
| `enterTasks` | `@beyou/state/task/tasksSlice` | named |
| `enterCategories` | `@beyou/state/category/categoriesSlice` | named |
| `RoutineSection` | `@beyou/types/routine/routineSection` | named type |
| `RoutineDraft` | `@beyou/types/ai/routineDraft` | named type |
| `MaterializeResponse` | `@beyou/types/ai/materialize` | named type |
| `store` | `../../store` (mobile app store) | named |

## Deviations from Brief

### 1. `sortDraft` is a named export
Brief showed `import sortDraft from '@beyou/api/ai/sortDraft'` (default import). The actual export is `export const sortDraft = ...` (named). Fixed to `import { sortDraft } from '@beyou/api/ai/sortDraft'`.

### 2. Redux dispatch — no Provider in test
The brief used `useDispatch<AppDispatch>()` hook, which requires a Redux `<Provider>` wrapper. The test wraps only in `<BeyouThemeProvider>` (no Provider), so `useDispatch` throws at render. Fixed by importing `store` directly and calling `store.dispatch(...)` — consistent with how other non-screen components avoid requiring Provider in tests.

### 3. HTTP-layer response unwrapping (the critical subtlety)
`generateRoutine` returns `{ success: response.data }`. The test mock returns `{ data: { success: { draft } } }`, so `response.data = { success: { draft } }`, making `gen.success = { success: { draft } }` (not `{ draft: ... }`). Similarly for `materializeRoutine`. Implemented dual-path unwrapping:
- Draft: `genSuccess.draft ?? genSuccess.success?.draft` — handles both direct `{ draft }` shape (production) and nested `{ success: { draft } }` shape (test HTTP mock).
- Materialize result: `(mat.success as { success?: MaterializeResponse }).success ?? mat.success` — same dual-path.

This matches the brief's test fixture verbatim while remaining correct for the real HTTP layer.

## RED → GREEN

- **RED:** `Cannot find module '../src/ui/routines/AiRoutineSheet'` — expected, file did not exist.
- **GREEN:** Both tests pass in 1.55s.

## Test Results

```
PASS __tests__/AiRoutineSheet.test.tsx
  ✓ blocks generate when the description is too short (320 ms)
  ✓ generate → materialize → onReady with mapped sections (20 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

## Typecheck Results

```
npx turbo run typecheck --filter=@beyou/mobile
Tasks: 1 successful, 1 total
Time:  4.112s
```

No type errors.

## Files Changed

- Created: `apps/mobile/src/ui/routines/AiRoutineSheet.tsx`
- Created: `apps/mobile/__tests__/AiRoutineSheet.test.tsx`

## Self-Review

| Check | Status |
|-------|--------|
| Validation blocks short desc (< 10 chars) | ✓ — `aiDescriptionSchema(t).safeParse` gates before any API call |
| generate → sortDraft → materialize → refresh slices → onReady with materializeToSections | ✓ |
| Loading state during (up to 180s) calls | ✓ — `setLoading(true)` before generate, `setLoading(false)` on all exit paths |
| Error notify on generate failure | ✓ — `notify.error(getFriendlyErrorMessage(...))` |
| Error notify on materialize failure | ✓ |
| `if (!visible) return null` | ✓ — early return at top |
| slice refresh (habits + tasks + categories) | ✓ — `Promise.all([getHabits, getTasks, getCategories])` |
| No `useDispatch` hook (Provider-free) | ✓ — uses `store.dispatch` directly |
| Theme token only (no hardcoded hex) | ✓ — `color={theme.primary}` for ActivityIndicator |

## Concerns

1. **Response unwrapping is a code smell.** The dual-path unwrap (`genSuccess.draft ?? genSuccess.success?.draft`) exists because `generateRoutine` wraps `response.data` in a `success` key, but the test mock simulates a backend that itself returns `{ success: { draft } }`. In production with the real nativeHttpClient, `response.data` from `POST /ai/routine/generate` should be `{ draft: ... }` (not `{ success: { draft } }`) — meaning `gen.success.draft` works directly and the `?? genSuccess.success?.draft` fallback never fires. This is correct but worth noting: if the backend response shape changes, revisit.

2. **`store.dispatch` instead of `useDispatch` hook.** This is a pragmatic choice to avoid requiring Provider in the test. It's a known pattern in this codebase (the module-level singleton store is exported). In a future refactor, passing dispatch as a prop or using a context would be cleaner.

---

## Fix: simplify AI unwrap + correct test mock to real contract

The initial implementation used dual-path unwrapping (`genSuccess.draft ?? genSuccess.success?.draft`
and the `(mat.success as { success? }).success ?? mat.success` cast) to accommodate a test mock that
returned double-wrapped data (`{ data: { success: { draft } } }`). This was wrong: the api wrappers
already wrap `response.data` in `{ success }`, so the HTTP mock should return the HTTP-body shape
only (`{ data: { draft } }` and `{ data: materialized }`).

**Changes made:**
- `apps/mobile/src/ui/routines/AiRoutineSheet.tsx`: removed dual-path casts; now uses `gen.success.draft` and `mat.success` directly. Removed now-unused `MaterializeResponse` type import.
- `apps/mobile/__tests__/AiRoutineSheet.test.tsx`: corrected post mock — `/generate` → `{ data: { draft } }`, `/materialize` → `{ data: materialized }`.

**Test result:** 2/2 pass (PASS __tests__/AiRoutineSheet.test.tsx, 1.706s)
**Typecheck result:** `npx turbo run typecheck --filter=@beyou/mobile` — Tasks: 1 successful, 1 total (4.201s), no errors.
