/**
 * The spotlight overlay must live in WINDOW space.
 *
 * Target rects come from `measureInWindow` — always window-absolute. The overlay
 * frames its hole with those numbers, so it is only correct while it fills the
 * window. When the bottom bar moved into the (app) layout, the screen area
 * stopped at the bar's top edge; an overlay mounted inside a screen therefore
 * spanned `H - barHeight`, and `nav-categories` (dashboard tutorial step 2, the
 * one target that lives in the bar) fell outside it entirely: hole off the
 * bottom, bar undimmed, tooltip displaced by the bar's height because
 * `tooltipPositionStyle` measures `bottom` from a parent that is no longer the
 * window.
 *
 * These tests pin the overlay's coordinate space structurally, because jest runs
 * no layout engine: a container's pixel height is never computed, so the only
 * way to assert "these numbers are window coordinates" is to assert which
 * container they are resolved against. `StyleSheet.absoluteFill` resolves
 * against the nearest ancestor, so the overlay is in window space exactly when
 * it is a child of the layout root (the window) rather than of `app-screen-area`
 * (the window minus the bar).
 *
 * NOTE: no JSX inside hoisted jest.mock factories — this project's babel config
 * rewrites element creation there to reference the injected
 * _ReactNativeCSSInterop helper, which babel-plugin-jest-hoist rejects as
 * out-of-scope. `mock`-prefixed variable references are allowed, and
 * `require('react').createElement` is not JSX so it survives. (Same constraint
 * documented at length in `_layout.test.tsx` / `app-layout-chrome.test.tsx`.)
 */
var mockScreenComponent: unknown = null;
// Deterministic target rects keyed by registry id — the values `measureInWindow`
// would report: window-absolute, y below the status bar.
var mockRects: Record<string, { x: number; y: number; width: number; height: number }> = {};

jest.mock('expo-router', () => ({
  // Stands in for the navigator: renders whichever screen the test mounted.
  Stack: () => (mockScreenComponent ? require('react').createElement(mockScreenComponent) : null),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
  usePathname: () => '/',
  useSegments: () => [],
  useFocusEffect: () => {},
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaInsetsContext: React.createContext({ top: 0, right: 0, bottom: 0, left: 0 }),
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
  };
});

jest.mock('react-native-toast-message', () => {
  const S = () => null;
  (S as unknown as { show: unknown }).show = jest.fn();
  (S as unknown as { hide: unknown }).hide = jest.fn();
  return { __esModule: true, default: S };
});

// Opens a chat modal + SSE plumbing on mount; irrelevant to the overlay's space.
jest.mock('../src/ui/agent/AgentWidget', () => ({ __esModule: true, default: () => null }));

jest.mock('../src/tutorial/TutorialProvider', () => {
  const actual = jest.requireActual('../src/tutorial/TutorialProvider');
  return {
    ...actual,
    useTutorialRegistry: () => ({
      register: () => {},
      unregister: () => {},
      measure: async (id: string) => mockRects[id] ?? null,
    }),
  };
});

import { Provider } from 'react-redux';
import { Dimensions } from 'react-native';
import { render, screen, fireEvent, act, within } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AppLayout from '../app/(app)/_layout';
import AppHome from '../app/(app)/index';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

// The bar sits flush against the bottom of the window, so `nav-categories` —
// one of its six items — reports a window rect inside the bar's band: past the
// bottom edge of `app-screen-area`, which stops where the bar begins.
const BAR_HEIGHT = 64;
const NAV_CATEGORIES_RECT = { x: 8, y: WINDOW_HEIGHT - BAR_HEIGHT, width: 56, height: 48 };
// An in-screen target near the top — the path that already worked, kept here so
// the hoist cannot trade one broken case for another.
const PROFILE_RECT = { x: 16, y: 72, width: 320, height: 96 };

const PAD = 8; // SpotlightOverlay's hole padding
const TOOLTIP_GAP = 12; // SpotlightOverlay's tooltip offset from the hole

const user = { name: 'Alice', xp: 100, level: 3, constance: 7, widgetsId: [], actualLevelXp: 0, nextLevelXp: 200 };

beforeEach(() => {
  // The overlay re-measures on a 400ms interval; fake timers keep it from
  // firing into a torn-down environment after the test ends.
  jest.useFakeTimers();
  mockScreenComponent = AppHome;
  mockRects = { 'nav-categories': NAV_CATEGORIES_RECT, 'dashboard-profile': PROFILE_RECT };
  const get = async (url: string) => {
    if (url === '/user') return { data: user };
    if (url === '/routine/today') return { data: null };
    return { data: [] };
  };
  const noop = async () => ({ data: null });
  setHttpClient({ get, post: noop, put: noop, delete: noop } as never);
  setLogger({ error: () => {} });
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

/** RN styles arrive as an object, an array, or nested arrays. */
const flattenStyle = (style: unknown): Record<string, number | undefined> => {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return (style ?? {}) as Record<string, number | undefined>;
};

const geometryOf = (testID: string) => flattenStyle(screen.getByTestId(testID).props.style);

type JsonNode = { type: string; props: Record<string, unknown>; children: (JsonNode | string)[] | null };

/** testIDs of a rendered node's direct children, in tree order. */
const childTestIDs = (node: JsonNode): (string | undefined)[] =>
  (node.children ?? [])
    .filter((c): c is JsonNode => typeof c === 'object' && c !== null)
    .map((c) => (c.props as { testID?: string })?.testID);

/** True when the bar lives anywhere under this node. */
const containsBar = (node: JsonNode | string | null): boolean => {
  if (!node || typeof node === 'string') return false;
  if ((node.props as { testID?: string })?.testID === 'bottom-nav') return true;
  return (node.children ?? []).some(containsBar);
};

/**
 * The layout root: the node whose children are the bar's branch and the
 * overlay. The bar is no longer a DIRECT child — it sits inside a wrapper that
 * also anchors the "More" panel above it — so the search is by branch.
 */
const findBarParent = (node: JsonNode | string | null): JsonNode | null => {
  if (!node || typeof node === 'string') return null;
  const children = (node.children ?? []).filter(
    (c): c is JsonNode => typeof c === 'object' && c !== null,
  );
  if (children.some(containsBar) && childTestIDs(node).includes('spotlight-overlay')) return node;
  for (const child of children) {
    const hit = findBarParent(child);
    if (hit) return hit;
  }
  return null;
};

/** Index of the child whose branch holds the bar. */
const barBranchIndex = (node: JsonNode): number =>
  (node.children ?? [])
    .filter((c): c is JsonNode => typeof c === 'object' && c !== null)
    .findIndex(containsBar);

/**
 * Mounts the (app) layout with the dashboard inside it, then settles the
 * dashboard's parallel fetches (they clear its loading gate) and the overlay's
 * first `measure` tick.
 *
 * `makeUi` returns a FRESH element every call: re-rendering the identical
 * element reference makes React bail out of the subtree, so the navigator mock
 * would never be asked for the new screen.
 */
const renderDashboardInLayout = async () => {
  const store = makeStore();
  store.dispatch({ type: 'tutorial/setPhase', payload: 'dashboard' });
  const makeUi = () => (
    <Provider store={store}><BeyouThemeProvider><AppLayout /></BeyouThemeProvider></Provider>
  );
  const view = await render(makeUi());
  await act(async () => {});
  await act(async () => {});
  return { store, makeUi, ...view };
};

/** Walks the dashboard tutorial from step 1 (profile) to step 2 (nav-categories). */
const advanceToNavCategoriesStep = async () => {
  await act(async () => { fireEvent.press(screen.getByTestId('spotlight-next')); });
  await act(async () => {});
};

describe('spotlight overlay coordinate space', () => {
  it('frames the bar-hosted nav-categories target against its window rect', async () => {
    await renderDashboardInLayout();
    await advanceToNavCategoriesStep();

    // The numbers the overlay computed, straight off the rendered ring.
    const ring = geometryOf('spotlight-ring');
    expect(ring.top).toBe(NAV_CATEGORIES_RECT.y - PAD);
    expect(ring.left).toBe(NAV_CATEGORIES_RECT.x - PAD);
    expect(ring.width).toBe(NAV_CATEGORIES_RECT.width + PAD * 2);
    expect(ring.height).toBe(NAV_CATEGORIES_RECT.height + PAD * 2);

    // ...and the container those numbers resolve against. A ring at
    // `WINDOW_HEIGHT - BAR_HEIGHT - PAD` only lands on the bar from a container
    // that reaches the bottom of the window; inside `app-screen-area` the same
    // number points at the screen area's own last pixels, above the bar, and the
    // hole's lower half falls off the container entirely.
    expect(within(screen.getByTestId('app-screen-area')).queryByTestId('spotlight-overlay')).toBeNull();

    // The scrim reaches the bar's row too — the other five items are dimmed,
    // which is only possible from a container that extends over the bar.
    const dimLeft = geometryOf('spotlight-dim-left');
    expect(dimLeft.top).toBe(NAV_CATEGORIES_RECT.y - PAD);
    expect(dimLeft.height).toBe(NAV_CATEGORIES_RECT.height + PAD * 2);

    // A target this low puts the tooltip above the hole, anchored by `bottom` —
    // i.e. measured from the container's bottom edge. The value only means
    // "just above the hole" when that edge is the window's.
    const tooltip = geometryOf('spotlight-tooltip');
    expect(tooltip.bottom).toBe(WINDOW_HEIGHT - (NAV_CATEGORIES_RECT.y - PAD) + TOOLTIP_GAP);
  });

  it('renders the overlay above the bottom bar in the layout tree', async () => {
    await renderDashboardInLayout();
    await advanceToNavCategoriesStep();

    const barParent = findBarParent(screen.toJSON() as JsonNode);
    expect(barParent).not.toBeNull();

    const order = childTestIDs(barParent as JsonNode);
    expect(order).toContain('spotlight-overlay');
    // Later sibling ⇒ painted on top: the bar gets dimmed and the ring draws
    // over it instead of under it.
    expect(order.indexOf('spotlight-overlay')).toBeGreaterThan(barBranchIndex(barParent as JsonNode));
  });

  it('still frames an in-screen target correctly (the path that already worked)', async () => {
    await renderDashboardInLayout();

    // Step 1 of the dashboard tutorial targets `dashboard-profile`, in-screen.
    const ring = geometryOf('spotlight-ring');
    expect(ring.top).toBe(PROFILE_RECT.y - PAD);
    expect(ring.left).toBe(PROFILE_RECT.x - PAD);
    expect(ring.width).toBe(PROFILE_RECT.width + PAD * 2);
    expect(ring.height).toBe(PROFILE_RECT.height + PAD * 2);

    // A high target puts the tooltip below the hole, anchored by `top` — an
    // origin both mounts share (the physical top), so this is precisely the case
    // the hoist must leave untouched.
    const tooltip = geometryOf('spotlight-tooltip');
    expect(tooltip.top).toBe(PROFILE_RECT.y + PROFILE_RECT.height + PAD + TOOLTIP_GAP);

    expect(within(screen.getByTestId('app-screen-area')).queryByTestId('spotlight-overlay')).toBeNull();
  });

  it('clears the overlay when the screen that owns it unmounts', async () => {
    const { makeUi, rerender } = await renderDashboardInLayout();
    expect(screen.getByTestId('spotlight-overlay')).toBeTruthy();

    // Navigate away: the navigator swaps the screen out from under the layout.
    mockScreenComponent = null;
    await rerender(makeUi());
    await act(async () => {});

    expect(screen.queryByTestId('spotlight-overlay')).toBeNull();
    // The bar outlives the screen — the layout itself is still mounted.
    expect(screen.getByTestId('bottom-nav')).toBeTruthy();
  });
});
