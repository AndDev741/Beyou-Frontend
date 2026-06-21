## Task 9 Report — Wire AI wizard into routines list + docs

### New test: RED → GREEN

Added to `apps/mobile/__tests__/routines-screen.test.tsx`:

```tsx
test('the AI button opens the AI sheet', async () => {
  setHttp([]);
  await renderScreen();
  await waitFor(() => expect(screen.getByTestId('ai-routine')).toBeTruthy());
  await act(async () => { fireEvent.press(screen.getByTestId('ai-routine')); });
  expect(screen.getByTestId('ai-description')).toBeTruthy();
});
```

- **Before implementation:** FAIL — `ai-routine` testID not found
- **After implementation:** PASS

---

### Gate results

| Gate | Result |
|------|--------|
| `cd apps/mobile && npx jest` | **131/131 tests, 56/56 suites — PASS** |
| `npx turbo run typecheck` | **10/10 packages — PASS** (9.698s) |
| `npx turbo run test` | **6/6 packages, all tests pass** — mobile 131/131, web 177/177, api, icons, validation, state — PASS |
| `npx expo export --platform android` | **SUCCESS** — 3747 modules, 7.3MB HBC bundle produced; `dist/` removed |

---

### Dead-import cleanup

Both confirmed genuinely unused and removed:

1. **`apps/mobile/src/ui/routines/AiRoutineSheet.tsx`**
   - Removed: `import type { RoutineDraft } from '@beyou/types/ai/routineDraft';`
   - Verification: only appeared on the import line; never referenced in the file body

2. **`apps/mobile/src/ui/routines/SnapshotHistory.tsx`**
   - Removed: `import { getFriendlyErrorMessage } from '@beyou/api/apiError';`
   - Verification: the `load()` function uses `res.error ?? t('UnexpectedError')` directly; `getFriendlyErrorMessage` not called anywhere in the file

---

### Files changed

- `apps/mobile/__tests__/routines-screen.test.tsx` — added AI button test (4th test case)
- `apps/mobile/app/(app)/routines.tsx` — added `AiRoutineSheet` import, `RoutineSection` type import, `aiOpen`/`aiSeed` state, AI header button (testID `ai-routine`, `sparkles-outline` icon, `accessibilityLabel={t('CreateWithAi')}`), seeded `RoutineBuilder` instance; `onReady` closes the sheet and seeds the builder
- `apps/mobile/src/ui/routines/AiRoutineSheet.tsx` — removed dead `RoutineDraft` import
- `apps/mobile/src/ui/routines/SnapshotHistory.tsx` — removed dead `getFriendlyErrorMessage` import
- `apps/mobile/AGENTS.md` — added "Routines schedule/snapshot/AI (Phase 7 Group C)" subsection

---

### Self-review

- The AI button sits in a `flex-row` alongside the `+` create button in the header, matching the brief's layout intent.
- `onReady` calls `setAiOpen(false)` before `setAiSeed(...)` to ensure the AI sheet closes before the seeded builder opens — prevents two modals visible simultaneously.
- The seeded `RoutineBuilder` uses a dedicated state (`aiSeed`) rather than reusing the `builder` bool, keeping the two create paths independent (no state bleed if the user cancels the AI flow mid-way).
- TypeScript is fully satisfied: `aiSeed` is typed as `{ name: string; iconId: string; routineSections: RoutineSection[] } | null` matching `RoutineBuilder`'s `routine` prop shape.
- The seeded builder passes `routine={aiSeed ?? undefined}` — the `?? undefined` handles the null→undefined conversion required by the prop type.

### Concerns

- **Orphan-on-cancel (web parity):** `materializeRoutine` creates habits/tasks/categories in the backend before the user sees the builder. Cancelling the seeded builder leaves those entities orphaned. This is documented in `AGENTS.md` as an accepted web-parity design decision, not a bug — but it is a real UX concern for a future cleanup ticket.
- **Two `RoutineBuilder` modals in the tree:** Having two `RoutineBuilder` instances mounted simultaneously is an accepted trade-off for simplicity. Only one is visible at a time (controlled by `builder` vs `aiSeed !== null`). Performance impact is minimal; both builders are hidden when their `visible` prop is false.

Final-review fix: corrected AGENTS.md Group-C API names/paths/testIDs + removed stale Deferred line
