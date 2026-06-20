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
