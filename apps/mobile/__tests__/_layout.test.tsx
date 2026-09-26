/**
 * Root-layout integration smoke test (Expo Router edition).
 * Replaces the old App.test.tsx.
 *
 * WHY THIS LIVES IN __tests__/ AND NOT app/_layout.test.tsx (spec asked for the
 * latter): Expo Router builds its route table with `require.context('./app')`,
 * which has no built-in exclusion for `.test.tsx`. A test file colocated inside
 * `app/` is picked up as a route and breaks things in TWO places, both verified
 * against SDK 56:
 *   1. `renderRouter('.')` -> "The layouts ./app/_layout.tsx and
 *      ./app/_layout.test.tsx conflict on the route /app/_layout".
 *   2. `npx expo export` pulls the test file into the production bundle and then
 *      fails resolving `expo-router/testing-library` (it imports node's `path`).
 * The official Expo docs say so explicitly (docs.expo.dev/router/reference/testing):
 * "test files should not be placed inside the app directory ... use a __tests__
 * directory". So the test lives here; the layout under test is imported.
 *
 * WHY THE MOCK FALLBACK (not renderRouter): with the test outside `app/`,
 * `renderRouter` would still need to scan `./app` relative to THIS file and mount
 * the full in-memory router. The spec's documented fallback is simpler and
 * deterministic: mock only expo-router's navigation primitives (Stack /
 * useRouter / useSegments) and render <RootLayout/> directly. Everything else is
 * the REAL wiring the old test kept:
 *   - react-redux (real Provider + store + useSelector/useDispatch)
 *   - react-i18next (real i18n initialized from src/i18n)
 *   - the real bootstrap() thunk and the real Gate redirect logic
 * useSegments() returns ['(auth)'] so the Gate considers us "in auth" and does
 * NOT redirect once status resolves to unauthenticated; the mocked <Stack/>
 * renders the real LoginRoute so its testIDs are assertable.
 *
 * Mocks carried over verbatim from the old App.test.tsx (required):
 *   - expo-secure-store: getItemAsync -> null (no token -> unauthenticated)
 *   - expo-localization: getLocales -> [{languageCode:'en'}]
 *   - global.fetch: silent 401 stub
 *   - ../src/lib/nativeHttpClient: module-level singleton wired at import time
 */

// 1. expo-secure-store: no token stored -> bootstrap resolves unauthenticated
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// 2. expo-localization: unavailable in jest env
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

// 3. global.fetch: silence network I/O
global.fetch = jest.fn().mockResolvedValue({
  ok: false,
  status: 401,
  headers: { forEach: jest.fn() },
  json: jest.fn().mockResolvedValue({}),
}) as unknown as typeof fetch;

// 4. nativeHttpClient: module-level side effects in _layout.tsx call
//    setRefreshHandler / setOnUnauthenticated at import time; stub the singleton.
//    Path is relative to THIS file (__tests__/_layout.test.tsx) -> ../src/lib/...
jest.mock('../src/lib/nativeHttpClient', () => ({
  nativeHttpClient: {},
  setAccessToken: jest.fn(),
  setRefreshHandler: jest.fn(),
  setOnUnauthenticated: jest.fn(),
  getApiBaseUrl: () => 'http://localhost:8099/api/v1',
  getAccessToken: () => null,
  refreshAccessToken: jest.fn(),
}));

// 5. react-native-safe-area-context: in jest, the real SafeAreaProvider waits for
//    an onLayout frame measurement before rendering its children, so its subtree
//    (the Gate) never renders. Replace it with a pass-through provider that
//    renders children immediately. A displayName is set because nativewind's
//    react-native-css-interop wraps SafeAreaProvider and reads its displayName.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const PassThrough = ({ children }: { children?: unknown }) => children;
  PassThrough.displayName = 'SafeAreaProvider';
  return {
    SafeAreaProvider: PassThrough,
    SafeAreaView: PassThrough,
    SafeAreaInsetsContext: React.createContext({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    },
  };
});

// 6. expo-router navigation primitives. Stack IS the real login route component,
//    so the Gate's authenticated <Stack/> output is the real LoginRoute and its
//    testIDs are assertable. useSegments reports the auth group so the Gate does
//    not navigate away from login.
//    NOTE: the factory body contains NO JSX / React.createElement. With this
//    project's babel config (babel-preset-expo + jsxImportSource:'nativewind'),
//    any element creation inside a hoisted jest.mock() factory gets rewritten to
//    reference the injected _ReactNativeCSSInterop helper, which jest's
//    babel-plugin-jest-hoist rejects as an out-of-scope variable. Returning the
//    component reference (not an element) keeps the factory transform-clean; the
//    actual element is created by <Stack/> inside the real RootLayout at render
//    time.
// expo-font resolves a native module that jest can't load, and the .ttf assets
// are not mapped by the transformer. The layout only needs `fontsLoaded` true.
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));

jest.mock('expo-router', () => ({
  // The real module's focus hook: screens use it to refresh on the way back.
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
  Stack: require('../app/(auth)/login').default,
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSegments: () => ['(auth)'],
}));

// 7. react-native-toast-message: RootLayout mounts <Toast/>, whose Animated
//    loop/timers never settle under jest + React 19's async act() — render()
//    then hangs to the 5s test timeout (flaky locally, consistently fails in
//    CI with "active timers / worker failed to exit gracefully"). Toast is not
//    under test here; stub it to a no-op component. (No JSX in the factory — see
//    the expo-router note above re: babel-plugin-jest-hoist.)
jest.mock('react-native-toast-message', () => {
  const ToastStub = () => null;
  ToastStub.show = jest.fn();
  ToastStub.hide = jest.fn();
  return { __esModule: true, default: ToastStub };
});

import { act, render } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { neutrals } from '@beyou/theme';
import RootLayout from '../app/_layout';

// Heavy integration smoke: full RootLayout + real Provider/store/i18n + the real
// bootstrap() thunk + the RHF login form. bootstrap() dispatches setStatus('loading')
// then setStatus('unauthenticated') after secureStore.getRefreshToken() -> null;
// once status leaves 'loading' the Gate renders the (mocked) <Stack/> = real
// LoginRoute, so its testIDs are assertable.
//
// TTRN v14: render() is async (React 19 act() is async) — await it; findByTestId
// then waits for the post-bootstrap re-render. The explicit timeout covers slow CI
// runners: the first babel transform + render of this large module graph runs in
// ~2s locally but well over jest's 5s default on the GitHub runner. (Toast is
// stubbed above so its Animated timers don't keep the test from settling.)
test('renders the login route when bootstrap finds no stored token', async () => {
  const { findByTestId } = await render(<RootLayout />);
  await findByTestId('login-screen');
  await findByTestId('login-email-input');
  await findByTestId('login-submit-button');
}, 30000);

// The cold-start flash (kanban: "Mobile ao carregar pela primeira vez tem um background color
// diferente"). The account's theme only arrives with the profile, two network calls in; until
// then the app painted the default. The device now remembers the last theme and the layout opens
// in it, holding the splash until that one local read has answered.
describe('cold start opens in the theme this device showed last', () => {
  const getItem = SecureStore.getItemAsync as jest.Mock;
  afterEach(() => {
    getItem.mockReset();
    getItem.mockResolvedValue(null);
  });

  const hasBackground = (node: unknown, colour: string): boolean => {
    if (!node || typeof node !== 'object') return false;
    if (Array.isArray(node)) return node.some((child) => hasBackground(child, colour));
    const n = node as { props?: { style?: unknown }; children?: unknown };
    const flat = ([] as unknown[]).concat(n.props?.style ?? []).flat(Infinity) as Array<{ backgroundColor?: string } | null>;
    if (flat.some((style) => style?.backgroundColor === colour)) return true;
    return hasBackground(n.children, colour);
  };

  test('a saved dark theme is the background from the first frame, on a light phone', async () => {
    getItem.mockImplementation(async (key: string) => (key === 'beyou.theme' ? 'dark:beyou' : null));

    const { findByTestId, toJSON } = await render(<RootLayout />);
    await findByTestId('login-screen');

    expect(hasBackground(toJSON(), neutrals.dark.bg)).toBe(true);
    expect(hasBackground(toJSON(), neutrals.light.bg)).toBe(false);
  }, 30000);

  test('the splash waits for the saved theme to be read', async () => {
    let answer: (value: string | null) => void = () => {};
    getItem.mockImplementation((key: string) =>
      key === 'beyou.theme' ? new Promise((resolve) => { answer = resolve; }) : Promise.resolve(null),
    );
    (SplashScreen.hideAsync as jest.Mock).mockClear();

    const { findByTestId } = await render(<RootLayout />);
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();

    await act(async () => {
      answer('light:beyou');
    });
    await findByTestId('login-screen');
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  }, 30000);
});
