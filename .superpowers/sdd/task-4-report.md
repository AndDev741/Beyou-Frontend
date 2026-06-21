# Task 4 Report: Routines list screen + detail route + delete (Phase 7 PR1)

## What was done

Implemented the routines read-side feature (PR1) following the brief's TDD steps exactly.

### Files changed

| File | Action |
|------|--------|
| `packages/i18n/src/en/translation.json` | Added `NoRoutinesYet`, `DeleteRoutine`, `ConfirmDeleteRoutine` keys |
| `packages/i18n/src/pt/translation.json` | Added PT equivalents for the same 3 keys |
| `apps/mobile/__tests__/routines-screen.test.tsx` | Created: 2 tests (lists routines, shows empty state) |
| `apps/mobile/app/(app)/routines.tsx` | Replaced `ComingSoon` stub with the real list screen |
| `apps/mobile/app/(app)/routines/[id].tsx` | Created: detail route reading from slice + delete via Alert |

---

## RED → GREEN evidence

### Step 3 — RED (test failed against the stub)

```
FAIL __tests__/routines-screen.test.tsx
  ✗ lists fetched routines
  ✗ shows the empty state
Tests: 2 failed, 2 total  Time: 3.59s
```

Both tests failed as expected: the stub renders `ComingSoon` with no `routine-card` testID.

### Step 6 — GREEN (tests pass with implementation)

```
PASS __tests__/routines-screen.test.tsx
  ✓ lists fetched routines (331 ms)
  ✓ shows the empty state (16 ms)
Tests: 2 passed, 2 total  Time: 1.838s
```

---

## Gate results

### Typecheck
```
@beyou/mobile:typecheck: tsc --noEmit
Tasks: 1 successful, 1 total  Time: 4.387s
```
PASS — no type errors.

### Expo export
```
android bundles (1):
_expo/static/js/android/entry-602682b61262d5d2e4ee7b4355ffc12e.hbc (7.2MB)
Exported: dist
```
PASS — production bundle built successfully. `dist/` cleaned up.

---

## Self-review against habits screen pattern

| Concern | habits.tsx | routines.tsx | Match? |
|---------|-----------|-------------|--------|
| `useState(true)` loading gate | ✓ | ✓ | ✓ |
| `useCallback` + `load()` | ✓ | ✓ | ✓ |
| `useEffect` with `active` flag | ✓ | ✓ | ✓ |
| `router.canGoBack()` back-button pattern | ✓ | ✓ | ✓ |
| `Promise.all` for parallel fetches | ✓ | ✓ | ✓ |
| `testID="back-button"` | ✓ | ✓ | ✓ |
| Theme tokens only (no hardcoded hex) | ✓ | ✓ | ✓ |

Detail route `[id].tsx`:
- Back-button uses `router.replace('/routines')` as fallback (correct for nested route)
- Delete follows the same Alert.alert + destructive button pattern as habits
- Reads routine from slice by `id` via `useLocalSearchParams` (no extra API call on open)

---

## Fix: detail delete test

Review finding: the detail route had no test covering the delete flow. Added `apps/mobile/__tests__/routines-detail.test.tsx` to close the gap.

**Test command:**
```
cd apps/mobile && npx jest routines-detail --no-coverage
```

**Output:**
```
PASS __tests__/routines-detail.test.tsx
  RoutineDetailScreen — delete
    ✓ calls DELETE /routine/r1 after Alert destructive button is pressed (227 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        1.48 s
```

1 test, 1 passing, pristine output.

---

## Concerns / known limitations

1. **Detail route `[id].tsx` test added** — `routines-detail.test.tsx` covers the delete-via-Alert flow (see "Fix: detail delete test" section above).

2. **No `h.success as habit[]` cast in routines.tsx** — the brief notes `enterHabits(h.success as habit[])`. The current implementation passes `h.success` without the cast to mirror how `habits.tsx` actually reads (it uses the same uncast form there for categories). TypeScript accepted both; no cast needed for `enterHabits` since its payload type is `any` in the RTK slice.

3. **`keyExtractor` fallback** — `item.id ?? item.name` is used because `Routine.id` is typed as `string | undefined`. This is consistent with the brief's prescription.

4. **Create button omitted** — intentional per brief. PR2 will wire the `+` button to the builder.
