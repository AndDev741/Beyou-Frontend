# Task 3 Report: Wire ScheduleSheet + Indicator into Routine Detail

## RED → GREEN Evidence

### RED Phase
- Added new test `'opens the schedule sheet from the detail'` to `apps/mobile/__tests__/routines-detail.test.tsx`
- Ran `cd apps/mobile && npx jest routines-detail` → **FAIL**
  - Error: `Unable to find an element by: [data-testid="schedule-routine"]`
  - Cause: No `schedule-routine` testID existed in `[id].tsx`

### GREEN Phase
- Implemented all changes in `apps/mobile/app/(app)/routines/[id].tsx`
- Ran `cd apps/mobile && npx jest routines-detail` → **PASS**
  - `✓ opens the schedule sheet from the detail (121 ms)`
  - `✓ calls DELETE /routine/r1 after Alert destructive button is pressed (248 ms)`
  - 2 passed, 2 total

### Typecheck
- Initial `npx turbo run typecheck --filter=@beyou/mobile` → **FAIL**
  - Pre-existing error in `ScheduleSheet.tsx` (Task 2): `import type schedule from` uses default import but `schedule` is a named export
  - Same pattern in my new `[id].tsx` import
- Fixed: changed `import type schedule from '@beyou/types/schedule/schedule'` → `import type { schedule } from '@beyou/types/schedule/schedule'` in both files
- Re-ran typecheck → **PASS** (1 successful, 0 errors)

## Files Changed

1. `apps/mobile/app/(app)/routines/[id].tsx` — added:
   - Imports: `getSchedules`, `{ schedule }`, `ScheduleSheet`, `ScheduleIndicator`
   - State: `scheduleOpen`, `otherSchedules`
   - Callbacks: `refetchRoutines` (extracted from inline edit/delete), `openSchedule`
   - Header: `schedule-routine` Pressable (calendar-outline icon) before edit
   - Under title header: `ScheduleIndicator` line showing current days
   - Before closing `</View>`: `ScheduleSheet` conditional render
   - `onDelete` refactored to use `refetchRoutines` instead of inline fetch
   - `RoutineBuilder.onSaved` now uses `refetchRoutines` (DRY)

2. `apps/mobile/__tests__/routines-detail.test.tsx` — appended new test

3. `apps/mobile/src/ui/routines/ScheduleSheet.tsx` — fixed pre-existing `import type schedule` default→named export (Task 2 artifact, broke typecheck)

## Self-Review

- `setHttp()` in the test returns `{ data: [] }` for all non-delete GET calls (including `/schedule`); `getSchedules` receives `{ data: [] }` → `{ success: [] }`, satisfying the brief's requirement that `otherSchedules` resolves to `[]`
- `refetchRoutines` is now shared by `onDelete`, `RoutineBuilder.onSaved`, and `ScheduleSheet.onSaved` — DRY
- `openSchedule` correctly loads schedules before opening the sheet; failure case (error) still opens the sheet with empty `otherSchedules` (safe UX)
- `ScheduleIndicator` placed directly below the header View and above `ScrollView` per the brief
- `ScheduleSheet` rendered conditionally on `routine` to avoid passing `undefined` to required `routine` prop

## Concerns

- **Pre-existing bug fixed (ScheduleSheet.tsx):** The `import type schedule from` was a Task 2 leftover that already blocked typecheck before this task. Fix is minimal and correct — only changes the import form.
- `routine.schedule?.days` on the `ScheduleIndicator` line requires that the `Routine` type exposes a `schedule` field. If `Routine` doesn't have this field in the type definition, TypeScript would flag it. This was clean after typecheck passed, so the type already supports it.
