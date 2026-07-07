# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Dual-React setup — do not run `npm dedupe`

This workspace intentionally ships two React versions side-by-side:

- **`apps/mobile`** — React 19.2.3 + react-native 0.85.3 (Expo SDK 56 requirement)
- **root / `apps/web`** — React 18.3.1

The root `package.json` carries an `overrides` block that pins `@beyou/mobile`'s `react`
and `react-native` to their required versions so npm never hoists them out of
`apps/mobile/node_modules`:

```json
"overrides": {
  "@beyou/mobile": {
    "react": "19.2.3",
    "react-native": "0.85.3"
  }
}
```

In `metro.config.js`, `nodeModulesPaths` lists `apps/mobile/node_modules` first, and
`resolver.extraNodeModules` explicitly pins `react` + `react-native` to the mobile copy —
so the bundler always resolves React 19 from `apps/mobile/node_modules`, not the root.

> **Do NOT set `disableHierarchicalLookup: true`.** It was tried and broke the bundle:
> Expo installs some transitive deps nested (e.g. `expo` → `expo-asset` under
> `apps/mobile/node_modules/expo/node_modules/`), and disabling hierarchical lookup makes
> Metro unable to resolve them. Hierarchical lookup must stay ENABLED; the `extraNodeModules`
> pin above is what guarantees the single React, not the lookup flag.

Running `npm dedupe` would collapse the two React installs into one and break the mobile
bundler at runtime. Do not run it. If you must tidy the lock file, run
`npm install --prefer-dedupe` and immediately verify with:

```bash
cat apps/mobile/node_modules/react/package.json | grep '"version"'   # must be 19.x
cat node_modules/react/package.json | grep '"version"'               # must be 18.x
```

## NativeWind v4 — metro config WRAPS, it does not replace

`metro.config.js` ends with `module.exports = withNativeWind(config, { input: './global.css' })`.
The monorepo `config` (watchFolders, `nodeModulesPaths`, `extraNodeModules` React pin) is built
first and PASSED INTO `withNativeWind`. Keep that order — if you regenerate metro config, re-apply
the wrap around the existing monorepo config, don't overwrite it. `babel.config.js` uses
`['babel-preset-expo', { jsxImportSource: 'nativewind' }]` + the `nativewind/babel` preset. Theme
colors are CSS variables set at runtime by `src/theme/ThemeProvider.tsx` (`vars()` from nativewind);
never hardcode hex — use the Tailwind tokens (`bg-background`, `text-primary`, …) wired in
`tailwind.config.js`.

## Expo Router — test files must NOT live under `app/`

Expo Router builds its route table via `require.context('./app')`, which has no `.test.tsx`
exclusion. A test colocated in `app/` is (a) treated as a route and (b) pulled into the production
bundle — `npx expo export` then fails resolving test-only deps. **Put route tests in `__tests__/`**
(see `__tests__/_layout.test.tsx`, `login.test.tsx`, `register.test.tsx`). Always run
`npx expo export --platform android` as part of verification — `npm test` passing does NOT catch a
broken production bundle.

## Jest — act environment + async-thunk tests

`jest.setup.js` sets `globalThis.IS_REACT_ACT_ENVIRONMENT = true` (wired via `setupFilesAfterEnv`).
For any test that dispatches an async redux thunk on a user event, wrap the interaction in
`await act(async () => { fireEvent...; })` so the thunk's trailing re-render settles inside that act
scope — otherwise it leaks into the next test and corrupts its render ("overlapping act() calls").
Use a fresh store per test (`makeStore()` from `src/store.ts`); Redux state is not reset between
Jest cases. `@expo/vector-icons` is mocked globally in `__mocks__/@expo/vector-icons.js` (the real
package pulls `expo-asset`, an Expo-nested transitive dep jest can't resolve).

Tests that import `expo-router` directly (`useRouter`, `Stack`, …) must `jest.mock('expo-router', …)`
— the real module is ESM that fails to parse under jest. Tests that mount `react-native-toast-message`
must stub it (its Animated loop leaves active timers); see `_layout.test.tsx`.

## Jest — react-native-reanimated mock (hand-rolled)

`react-native-reanimated` v4 throws at import under jest — *"Native part of Worklets doesn't seem to
be initialized"* — because `react-native-worklets`' native module isn't present. Its bundled
`react-native-reanimated/mock` does NOT help: it re-imports the real index, re-triggering worklets
init. So `jest.setup.js` registers a **self-contained** `jest.mock('react-native-reanimated', …)` that
requires nothing real — passthrough `Animated.View`/`Text`, `useSharedValue`/`useAnimatedStyle`/
`withTiming`/`withSpring`/`useReducedMotion` no-ops, an `Easing` Proxy, and chainable entering presets
(`FadeInDown`…). NativeWind only uses reanimated lazily for static `className` styling, so this does
not affect the other tests. `npx expo export` uses the REAL reanimated, so always run it to validate
the production bundle. The reanimated babel plugin must stay LAST in `babel.config.js`.

## Dashboard (Phase 3)

The dashboard reuses the shared `@beyou/*` data layer end-to-end: slices wired in `src/store.ts`,
loaded by `src/dashboard/useDashboardData.ts`, check-in via `src/dashboard/useRoutineCheckin.ts` →
`@beyou/state` `applyRefreshUi` (the gamification brain, shared with web). UI lives in
`src/ui/dashboard/` (ProfileHeader, RoutineDay/RoutineItem, Shortcuts, XpFloat, CelebrationOverlay,
RoutineCompleteSummary, ProgressRing). Section screens (categories/habits/…) are `ComingSoon` stubs;
logout lives on the configuration stub.

## Icons (Phase 4 — shared `@beyou/icons` + Lucide)

Icons resolve through the platform-neutral `@beyou/icons` package: `resolveIcon(id)` →
`{ lucide:name | emoji:char | fallback }` (ids: `lucide:<kebab>`, `emoji:<short_name>`, raw emoji
char; legacy react-icons `ri:*` → fallback). Render saved icons with `src/ui/BeyouIcon.tsx`:
emoji → `<Text>` char; lucide → `lucide-react-native` PascalCase component (kebab→Pascal via
`import * as`); fallback → nothing (unless `showFallback`). `lucide-react-native` is mocked in
`jest.setup.js` (a Proxy of no-op components) — it ships ~1754 icon modules; don't transform it in
jest, and `expo export` validates it bundles for real. Web uses `lucide-react`'s `DynamicIcon`
(code-split); the registry/search/picker live in `@beyou/icons` (data) + each app's `BeyouIcon`
(render). Data is generated: `packages/icons/scripts/generate-data.mjs` (lucide names + slim emoji
char map).

## Configuration + widgets (Phase 5)

Settings live at `app/(app)/configuration.tsx` as `ConfigSection`s (`src/ui/config/`): Profile
(rhf + shared `profileSchema`, photo via URL modal), Appearance (`ThemeSelector` + persist),
Preferences (Language/`RoutineSettings`/`Constance`), and Dashboard (`WidgetsSection` picker). Every
control persists via `editUser` (`@beyou/api/user/editUser`) + a `perfilSlice` action + `notify`;
`constanceConfiguration` is editUser-only (no slice field). Saved theme/language apply on boot via
`src/theme/ThemeSync.tsx` / `src/i18n/LanguageSync.tsx` (in `_layout`, keyed on the saved value so a
live pick isn't overridden). NativeWind `mt-*` didn't reliably apply to the config section divider —
use an inline `style` margin there.

Dashboard widgets (`src/ui/widgets/`): `WIDGET_IDS`/`BIG_WIDGETS` come from `@beyou/state`.
`DashboardWidgets` renders `perfil.widgetsIdsInUse` (full-width stack; empty → CTA to config). The 7
widgets mirror web; charts are hand-drawn with `react-native-svg` (`CategoryBalanceWidget` radar,
`DailyProgressWidget` reuses `ProgressRing`) — NOT chart.js. The picker (`config/WidgetsSection`) is
add/remove + ↑↓ reorder (no drag-drop) → `editUser({widgetsId})`.

## Icon picker + Habits (Phase 6)

Icon picker (`src/ui/icons/`): `IconPicker` is a bottom-sheet `Modal` mirroring the web `iconsBox`
(search + All/Recents/Icons/Emoji tabs + a `FlatList` grid of `BeyouIcon` tiles); it `searchIcons`
from `@beyou/icons` and emits the canonical id (`normalizeIconId`) on select. It **early-returns null
when `!visible`** — RN `Modal` renders children regardless of `visible` under jest, so the gate keeps
closed-picker tests deterministic and skips mounting the grid. `IconPickerField` is the labeled form
field. Recents use `iconRecents.ts` = an **in-memory sync** adapter for `createIconRecents` (the shared
storage interface is sync; AsyncStorage is async → recents are session-scoped for v1).

Habits (`app/(app)/habits.tsx` + `src/ui/habits/`): real CRUD on the shared `@beyou/api/habits` +
`@beyou/state/habit` + `@beyou/validation` habit schemas. The screen self-fetches habits + categories
(direct nav needs it; the dashboard also loads them) and refetches after every mutation via an
`onSaved` callback. `HabitForm` is a full-screen modal (rhf + `habitCreate/EditSchema`); the schema
field is `difficulty` (correct) but the wire field is `dificulty` (keep the typo) — the api fns take
positional args so just pass the value. Importance/Difficulty are 1–5 segments; experience (create
only) maps 0/1/2 → BEGINNER/INTERMEDIARY/ADVANCED via the api's `experienceToEnum`. Delete confirms
with the **native `Alert.alert`** (no custom modal). Create/edit return `{success?|error?|validation?}`
→ `getFriendlyErrorMessage` + `notify`. Inline category-create is deferred (pick existing only).

**Jest act note (reinforced):** ANY `fireEvent` that toggles component/provider state must be wrapped
in `await act(async () => …)` — even on a *controlled* component (the `BeyouThemeProvider` settle
leaks otherwise), or the unwrapped update corrupts the NEXT test in the file ("overlapping act()").

## Routines (Phase 7)

Routines CRUD lives on one screen and a builder modal (the detail route `app/(app)/routines/[id].tsx` was removed during Task 6/7 polish — it does not exist):

- **`app/(app)/routines.tsx`** — list screen; self-fetches routines + habits + tasks into the store; the `+` create button (testID `create-routine`) opens `RoutineBuilder mode="create"`; `onSaved={load}` refetches everything.
- **`src/ui/routines/RoutineBuilder.tsx`** — full-page `Modal` slide; manages a working-copy of the routine (deep-cloned from prop on open); `routineFormSchema` validates name+sections before submit; calls `createRoutine`/`editRoutine`; `onSaved()` is called after success, `onClose()` dismisses.
- **`src/ui/routines/SectionSheet.tsx`** — bottom sheet for add/edit a section (name + time via `TimeField`).
- **`src/ui/routines/ItemPickerSheet.tsx`** — bottom sheet to assign habits + tasks to a section.
- **`src/ui/routines/SectionCard.tsx`** — row card for a section inside the builder (edit / assign / move / remove).
- **`src/ui/routines/TimeField.tsx`** — native `DateTimePicker` in time mode; exports `toHHmm`/`hhmmToDate`.

## Routines schedule/snapshot/AI (Phase 7 Group C)

**Schedule** — `src/ui/routines/ScheduleSheet.tsx` is a bottom sheet opened from the list screen
(`app/(app)/routines.tsx`) via a `Pressable` (testID `schedule-routine`). It renders
day-of-week checkboxes (`DAYS` exported from `src/ui/routines/ScheduleIndicator.tsx`) and calls
`createSchedule(days, routineId, t)` (default export of `@beyou/api/schedule/createSchedule`) or
`editSchedule(scheduleId, days, routineId, t)` (default export of `@beyou/api/schedule/editSchedule`).
The save button carries testID `schedule-save`. On success it refetches schedules and notifies.
A conflict hint is computed **client-side**: the detail screen fetches all schedules via `getSchedules`
and passes the other-routine list as `otherSchedules` to `ScheduleSheet`, which derives a `blockedBy`
map (day → routine name) locally — there is no `SCHEDULE_CONFLICT` backend error key.

**Snapshot history** — The routines list screen (`app/(app)/routines.tsx`) shows past-day snapshots when the user picks a past chip in `RoutinesOverview`. `RoutinesOverview` fetches `getSnapshotsForDay(date, t)` — ONE call returning all of the day's snapshots (`GET /routine/snapshot?date=`), not one-per-routine. Each `Snapshot` now carries its own `routineId`, so it builds a `{ snapshot, routineId }[]` pair array from `s.routineId` and renders a `SnapshotWithCheckin` wrapper per pair (defined in `RoutinesOverview.tsx`) that calls `useSnapshotCheckin(routineId)` with the correct routine id. (The per-routine month-dates fetch for the calendar dots is still a `Promise.all` over routines — separate endpoint, not yet batched.) The per-routine `SnapshotHistory.tsx` detail component and its test were removed (orphans after the detail route was cut in Task 6). `SnapshotCard` is pure presentation; `useSnapshotCheckin` calls `checkSnapshotItem`/`skipSnapshotItem`, pipes the `RefreshUiDTO` through `applyRefreshUi`, and dispatches `enterSnapshot` to re-sync display state.

**AI wizard** — `src/ui/routines/AiRoutineSheet.tsx` is a bottom-sheet `Modal` with a single text
input (testID `ai-description`). On submit it calls `generateRoutine` (draft → server AI), then
`materializeRoutine` (draft → creates real habits/tasks/categories in the backend). The returned
`MaterializeResponseDTO` is mapped to `RoutineSection[]` via `materializeToSections` from
`@beyou/api/ai/draftMapping`, and then passed to `onReady(name, sections)`. The list screen
(`app/(app)/routines.tsx`) wires it as follows: the AI button (testID `ai-routine`,
`sparkles-outline` icon) opens `AiRoutineSheet`; `onReady` closes the sheet and sets `aiSeed`
state (`{ name, iconId: '', routineSections }`); a dedicated seeded `RoutineBuilder mode="create"`
renders when `aiSeed !== null`, pre-populated via its `routine` prop. **Orphan-on-cancel quirk
(web parity):** `materializeRoutine` creates entities in the backend *before* the user saves the
builder. If the user cancels the seeded builder, those habits/tasks/categories are left orphaned —
this matches the web app's behaviour and is a known product decision, not a bug. The e2e profile
swaps in a `CannedRoutineDraftGenerator` (deterministic, no real API key needed).

## Tutorial / onboarding (Phase 8)

**Phase state + persistence + boot gate**

Tutorial phase lives in a MOBILE-LOCAL Redux slice `src/tutorial/tutorialSlice.ts` (NOT `@beyou/state`).
State is exactly `{ phase: TutorialPhase | null }` — only `phase`, no `stepIndex` or `completed` fields.
`TutorialPhase = 'intro' | 'dashboard' | 'categories' | 'habits' | 'routines' | 'config' | 'done'`.
Actions: `setPhase`, `clearPhase`. Per-screen step index is LOCAL `useState` inside each hook (not in
the slice). Completion is `perfil.isTutorialCompleted` (the shared `@beyou/state` perfilSlice),
persisted via `editUser`.

Phase is persisted to expo-secure-store by `src/lib/tutorialStore.ts` (its own key
`beyou.tutorial.phase` — SEPARATE from the auth refresh-token store in `src/auth/secureStore.ts`).
`TutorialSync` (`src/tutorial/TutorialSync.tsx`, mounted in `_layout`) hydrates the saved phase on
boot, persists on change, and gates the start: when `isTutorialCompleted === false` and
`phase === null` it sets `phase = 'intro'`. Mirrors the `ViewFiltersSync` pattern.

**Target registry + measure**

`TutorialProvider` (`src/tutorial/TutorialProvider.tsx`) holds a `Map<id, RefObject<View>>`.
`useTutorialTarget(id)` (`src/tutorial/useTutorialTarget.ts`) returns a ref to attach to the target
`View`; the overlay measures it with `measureInWindow`. Never call `useTutorialTarget` inside a
`.map()` — pass a `viewRef` prop into the row component (CategoryCard/HabitCard/RoutineCard do this
for the first item).

**SpotlightOverlay**

`SpotlightOverlay` (`src/ui/tutorial/SpotlightOverlay.tsx`) is an **in-tree absolute-fill `View`**
(NOT a Modal), rendered as the last child of each screen's root so `pointerEvents="box-none"` lets
taps in the hole pass through to the real UI (Model A). A Modal is a separate window and would
swallow those taps (that broke "create category"), and it cannot draw over other Modals (builder /
sheets), so those steps are avoided instead (see routines). The dimmer is **4 plain `View`s** framing
the measured target rect (rgba(0,0,0,0.6) scrim + transparent hole) — NOT SVG — plus a highlight ring.
The target `y` is shifted by the top safe-area inset (`SafeAreaInsetsContext`) because `measureInWindow`
reports y below the status bar while the overlay is anchored at the physical top. It re-measures on an
interval guarded by a rect-equality check (returns the prev reference when unchanged — no render loop).
The tooltip's primary Next auto-sizes (matches config Save buttons), is `disabled` until a step's data
condition flips (showing a `disabledHintKey` hint), and the ScrollView content is keyed by step to
avoid Android content-retain ghosting.

**Per-screen hooks**

Each returns `{ active, steps, stepIndex, next, prev, skip }` (all five screen hooks share this shape).
`active` gates on `phase`. `next()` is an EVENT HANDLER:
`if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1); else { dispatch(setPhase(nextPhase)); router.push(nextRoute); }`.
It is NOT a `setStepIndex` updater side-effect and NOT called from `useEffect` (that pattern was
rejected in review for a same-value-setState bail-out). `skip` calls `completeTutorial`. There are
NO `advanceStep`/`decrementStep`/`skipTutorial`/`resetTutorial` actions — only `setPhase`/`clearPhase`
plus local step state. `completeTutorial` (`src/tutorial/completeTutorial.ts`):
`editUser({ isTutorialCompleted: true })` + `tutorialCompletedEnter(true)` + `setPhase(null)` +
`saveTutorialPhase(null)`.

**Routines flow (only on-screen controls)**

Because the in-tree overlay View can't draw over the builder/schedule Modals, only the two on-screen
controls are spotlit: the **+** button (`routine-add`, copy guides the whole builder flow) and the
**schedule** button (`routine-schedule`). The builder + schedule sheet guide themselves. The hook
auto-advances past `add` once `hasRoutines` (the Next button is hidden while the builder Modal is open);
the `add` step's Next stays disabled until then. Finishing hops to `config`.

**Config walkthrough + finale**

`useConfigTutorial` is a step-driven walkthrough (`configSteps`) — one spotlight per settings section
(`config-profile/appearance/preferences/dashboard/tutorial`), reusing each section's own title/desc
i18n. `ConfigSection` takes a `viewRef` (spotlight target) + `onLayout` (records its y); the config
screen auto-scrolls each section into view as its step activates. Finishing sets `phase='done'` and
`router.replace('/')` back to the dashboard, which renders `TutorialFinale` (`src/ui/tutorial/`) — an
in-tree View (not a Modal) whose copy depends on `!!s.todayRoutine.routine` (scheduled-today message
vs "create an awesome life"); its button calls `completeTutorial`.

**Replay**

`TutorialSection` (`src/ui/config/TutorialSection.tsx`) renders in its OWN `ConfigSection` (title
`Tutorial`) on the configuration screen. Its Replay button dispatches `setPhase('intro')` +
`tutorialCompletedEnter(false)` + `saveTutorialPhase('intro')` + `editUser({ isTutorialCompleted: false })`,
then `router.replace('/')` so the intro starts on the dashboard.

## Offline (Phase 1 — read cache + Phase 2 — writes, outbox, sync)

All offline logic lives under `src/offline/` and the shared platform-neutral `@beyou/offline`
package (`packages/offline`). The design is network-first with offline fallback: online paths are
byte-identical to pre-offline code; offline mutations apply optimistically (Redux + SQLite mirror)
and queue a replay op in an outbox table.

### Shared package (`@beyou/offline` — `packages/offline/src/`)

- **`driver.ts`** — `SqlDriver` interface (execAsync/runAsync/getAllAsync/getFirstAsync/
  withTransactionAsync), exactly shaped like the expo-sqlite async API.
- **`schema.ts`** — `CACHE_TABLES` (categories/habits/tasks/goals/routines) + `kv` + `outbox`
  table; `migrate(db)` via `PRAGMA user_version` (v1=Phase-1 mirror, v2=outbox).
- **`cache.ts`** — `readCollection<T>(table)`, `writeCollection<T extends {id?}>(table, rows)`
  (replace-all, the pull path), `readKV<T>(key)`, `writeKV(key,value)`, `clearAll` (purging),
  `upsertRow(table,row)` / `deleteRow(table,id)` (optimistic single-row writes).
- **`swr.ts`** — `cachedList<T>({db,table,fetch,onRows,shouldWrite?})` stale-while-revalidate:
  emits cached rows instantly, fetches, persists best-effort; corrupt-row-safe, non-throwing.
- **`outbox.ts`** — `enqueueOp/peekOps/deleteOp/bumpAttempt/countOps` FIFO queue
  (AUTOINCREMENT + ORDER BY id ASC); `OutboxOp {id,opType,payload,entityId,createdAt,attempts,lastError}`.
- **`syncEngine.ts`** — `createSyncEngine({db,handlers,onCountChange?,onFlushEnd?})`: FIFO
  drain through INJECTED handlers; transient failure stops the flush (preserves order);
  `MAX_OP_ATTEMPTS=5` then drops; unknown-opType drops immediately; single-flight concurrent flush.
- **`date.ts`** — `localDateKey(d)` — Hermes-safe `YYYY-MM-DD` formatter.
- Package is platform-neutral (no expo/react-native/axios/@beyou/api imports);
  tests via vitest against real in-memory `better-sqlite3` (devDependency).

### Mobile wiring (`apps/mobile/src/offline/`)

- **`db.ts`** — expo-sqlite pass-through `SqlDriver` adapter; `getDb()` lazy retryable singleton
  (WAL, migrate-once); `clearOfflineCache()` (purges everything + bumps `cacheGeneration` to drop
  in-flight write-throughs — closes the logout race); `getCacheGeneration()`.
- **`connectivitySlice.ts`** — Redux state `{isOnline, bannerDismissed, pendingOps}` under store
  key `connectivity`. EPISODE SEMANTICS: `setOnline(false)` from a previously online (or null)
  state resets `bannerDismissed=false` — the banner reappears on every NEW offline episode;
  `dismissBanner()` hides for the current episode only; repeated offline reports are no-ops.
- **`ConnectivitySync.tsx`** — feeds the slice from `expo-network` (`getNetworkStateAsync` +
  `addNetworkStateListener`); fires `onOnline()` on each `false→true` transition. Mounted in root
  `app/_layout.tsx` beside `ThemeSync`/`ViewFiltersSync`.
- **`mutations.ts`** — `setOfflineStore(store)`, `getOfflineStore()`, `setSyncEngine(engine)`,
  `getSyncEngine()`, `isOffline()` (fail-open: unconfigured store counts as ONLINE — guards
  against a half-wired boot), `queueMutation(opts)` (optimistic mirror write + enqueue).
- **`ops/habitOps | categoryOps | taskOps | goalOps | routineOps | checkinOps.ts`** — one
  module per domain. Structure: network-first (`isOffline()?` → api delegate); offline path:
  uuid-based client id (crypto.getRandomValues polyfilled at boot) → optimistic Redux dispatch
  (bulk `enter*` or per-item `updateGoal`/`refreshItemGroup`) → `upsertRow`/`deleteRow` mirror
  → `queueMutation` with the **exact registry payload** from the plan. Returns `{success,
  queued:true}` on offline, `{error?,validation?,validation?}` online.
- **`syncSetup.ts`** — `initOfflineSync(store)` (idempotent; wires DB + engine + handlers +
  AppState listener; flushes at end-of-init if authenticated); `flushOutbox()` (safe no-op when
  engine absent; try/catch contained); `buildHandlers(store)` (22 opType handlers — exported for
  test isolation). Handlers call the api fns with payload fields in exact positional order + pass
  `payload.id` as the create trailing `id` param. Goal complete / routine check/skip pipe
  `res.success` through the shared `applyRefreshUi` (XP NEVER computed locally). Engine callbacks:
  `onCountChange→dispatch setPendingOps`, `onFlushEnd→notify` success/failure toast.

### Operation registry (source of truth — plan §op-type-registry)

Every mutation routes through an opType string (e.g. `habit.create`, `goal.complete`,
`routine.check`) whose payload shape and handler position are defined in the Phase 2 plan
`docs/superpowers/plans/2026-07-05-offline-writes-phase2.md` § "Op type registry".

### Ceilings (documented, not bugs)

- **Check/skip replay is a server-side toggle** — a response lost after server commit + retry
  can double-toggle (source: `// ponytail:` in `checkinOps.ts`). Op idempotency keys are Phase 3
  (backend item).
- **Offline-created routines can't be checked until their first sync** — the `todayRoutine` is
  server-generated, and the builder-assigned temp group ids never leave the device (source:
  `// ponytail:` in `routineOps.ts`).
- **Offline schedule create → immediate edit of that same schedule unsupported v1** — the
  schedule has no client id; the edit relies on the server-known schedule id (source:
  `// ponytail:` in `routineOps.ts`).

### Test strategy

- **jest:** `expo-sqlite` and `expo-network` stubs in `jest.setup.js` make the cache INERT and
  the network ONLINE by default — every pre-existing screen/form test exercises the unchanged
  online paths. Unit tests for ops (`*Ops.test.ts`) and the sync setup
  (`syncSetup.test.ts`) explicitly configure `setOfflineStore(makeStore())` +
  a recorder `setSyncEngine` and flip `setOnline(false)` to test offline branches.
- **vitest:** `packages/offline` is tested against real in-memory `better-sqlite3` — schema
  migration idempotency, cache round-trips, outbox FIFO ordering, sync engine drain semantics,
  all covered.
- **`npx expo export --platform android`** is a required gate whenever a new native module is
  added or when `@beyou/offline`/mobile-offline imports change — it validates the production
  bundle end-to-end.

### Backend contract (Beyou-backend-spring `feat/offline-sync-support`)

- Create endpoints accept an optional `"id": "<uuid>"` in the request body; when present the
  persisted entity keeps that id (making replay idempotent — same-id create is a no-op, not a
  duplicate). Cross-user id injection is rejected (`*_NOT_OWNED` BusinessException).
- `POST /routine/check` honors `date` in the request body (`CheckItemService` now mirrors the
  skip path: `dto.date() != null ? dto.date() : LocalDate.now()`). Constance/XP flags are already
  date-keyed — no cross-contamination between a backdated replay and today's completion markers.
- All id columns are plain `uuid NOT NULL` with no DB default — no Flyway migration needed.
