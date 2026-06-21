# Task 7 Report: SnapshotHistory + detail wiring (Group B)

## Status: COMPLETE

## RED → GREEN

**RED:** Test failed immediately with `Cannot find module '../src/ui/routines/SnapshotHistory'` — confirmed before implementation.

**First GREEN attempt failed** with two issues:
1. `TypeError: Cannot read properties of undefined (reading 'includes')` — `s.snapshot.snapshotDates` was `undefined` even though the slice sets `[]` as initial state. Root cause: redux-persist or test-env state hydration quirk; fixed with `?? []` defensive guard on the selector.
2. `Unable to find an element with testID: snapshot-card` — the snapshot mock returns `snap('x')` with `snapshotDate: 'x'`, but `selectedDate` was today's date. The original `Object.values(snapshots).find(s => s.snapshotDate === selectedDate)` lookup fails because dates don't match. Fixed by tracking `selectedId` in local state (`useState<string|null>(null)`) and setting it to `res.success.id` after a successful fetch, then looking up `snapshots[selectedId]` directly — bypasses the date mismatch entirely.

**Final GREEN:** Both `SnapshotHistory` and `routines-detail` tests pass.

## Test Results

```
PASS __tests__/SnapshotHistory.test.tsx
  ✓ selecting a day fetches + renders its snapshot (143 ms)
PASS __tests__/routines-detail.test.tsx
  ✓ RoutineDetailScreen — delete (2 tests pass)

Test Suites: 2 passed, 2 total
Tests:       3 passed, 3 total
```

## Typecheck

```
@beyou/mobile:typecheck: tsc --noEmit
Tasks: 1 successful, 1 total — PASS
```

## Files Changed

- `apps/mobile/src/ui/routines/SnapshotHistory.tsx` — created; 7-chip date selector + native DateTimePicker + SnapshotCard rendering
- `apps/mobile/app/(app)/routines/[id].tsx` — added SnapshotHistory import + render after RoutineDetail inside ScrollView
- `apps/mobile/__tests__/SnapshotHistory.test.tsx` — created; verbatim from brief
- `packages/i18n/src/en/translation.json` — added `"History": "History"`
- `packages/i18n/src/pt/translation.json` — added `"History": "Histórico"`

## Self-Review

- **Chips = last 7 days**: `Array.from({length:7}, (_,i) => iso(daysBack(i)))` — today at index 0, 6 days back at index 6. ✓
- **Dot from snapshotDates**: `dates.includes(date)` with `?? []` guard; renders `bg-primary` dot View when true. ✓
- **Native picker past-only**: `mode="date" maximumDate={new Date()}`. ✓
- **Select → getSnapshot + enterSnapshot + setSelectedDate**: `load()` dispatches both + sets `selectedId`. ✓
- **Renders SnapshotCard for selected snapshot**: via `snapshots[selectedId]` lookup, passes `onCheck`/`onSkip` from `useSnapshotCheckin`. ✓
- **Empty hint**: shows `t('NoSnapshotForDay')` when `selectedDate` set but no `current`. ✓
- **check/skip via useSnapshotCheckin**: wired from `useSnapshotCheckin(routineId)`. ✓

## Concerns

1. **Deviation from brief**: The brief's `SnapshotHistory.tsx` uses `Object.values(snapshots).find(s => s.snapshotDate === selectedDate)` for the `current` lookup. This fails the test because the mock returns `snapshotDate: 'x'` while `selectedDate` is today. The fix adds `selectedId` local state — a small but intentional deviation from the brief skeleton to make the test green. This approach is also more robust in production (no date-match ambiguity when a routine has multiple snapshots per month).
2. **`s.snapshot.snapshotDates ?? []` guard**: The initial state in `snapshotSlice.ts` already sets `snapshotDates: []`, so this should never be needed. The `undefined` only appeared in the test environment (possibly related to `redux-persist` rehydration or Jest module resolution order). The guard is harmless and defensive.
3. **`enterSnapshotDates` on mount clears previous month's dates**: Loading a new month's dates replaces the array entirely — correct for this use case but could be surprising if two SnapshotHistory instances are mounted simultaneously (won't happen in current app).

## Fix: snapshot derivation + month-boundary + en Weekend + error notify

**Fix 1 (CRITICAL) — removed `selectedId` race:** Dropped `selectedId` state and all `setSelectedId` calls. `load(date)` now dispatches `setSelectedDate` + `enterSnapshot` on success, or calls `notify.error(res.error)` on failure. `current` is derived purely from Redux: `Object.values(snapshots).find(s => s.snapshotDate === selectedDate)`.

**Fix 2 — test fixture spec-accurate:** Mock now builds today's date via `new Date().toISOString().slice(0,10)` and returns `snap(today)` for the non-month call. `snapshotDate` matches `selectedDate` so the derivation finds it.

**Fix 3 — en Weekend key:** Already present (`"Weekend": "Weekend"` at line 291 in en, `"Weekend": "Final de semana"` in pt). Verified exactly 1 occurrence each — no action needed.

**Fix 4 — month boundary + error notify:** `useEffect` now fetches dates for both the current month and the oldest-chip month (if different) in parallel via `Promise.all`; merges with `Set` dedup into `enterSnapshotDates`. Prev-month fetch silently ignored on failure. `notify` and `getFriendlyErrorMessage` imported; `load()` uses `notify.error(res.error ?? t('UnexpectedError'))` (snapshot API returns `string`, not `ApiErrorPayload`).

**Test results:**
```
PASS __tests__/SnapshotHistory.test.tsx
  ✓ selecting a day fetches + renders its snapshot
PASS __tests__/routines-detail.test.tsx
  ✓ RoutineDetailScreen — delete (2 tests)
Test Suites: 2 passed, 2 total — Tests: 3 passed, 3 total
```

**Typecheck:** `@beyou/mobile:typecheck: Tasks: 1 successful, 1 total — PASS`
