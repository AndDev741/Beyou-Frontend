/**
 * DashboardWidgets (P5-B) — renders the configured widgets in perfil order,
 * skips unknown ids, and shows the NoWidgets CTA when the list is empty.
 * Also asserts the DailyProgress ring + task count and the CategoryBalance
 * fallback (<3 categories) vs radar (>=3). Boundary mocked: notify, expo-router.
 */
jest.mock('react-native-toast-message', () => {
  const S = () => null;
  (S as unknown as { show: unknown }).show = jest.fn();
  (S as unknown as { hide: unknown }).hide = jest.fn();
  return { __esModule: true, default: S };
});
// The two area widgets read the week of XP; the rest of the file gets "no window",
// which is also what a fresh account sees.
jest.mock('@beyou/api/xp/getXpHistory', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ error: 'none' })),
}));
jest.mock('expo-router', () => ({
  // The real module's focus hook: screens use it to refresh on the way back.
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import getXpHistory from '@beyou/api/xp/getXpHistory';
import type category from '@beyou/types/category/categoryType';
import { widgetsIdInUseEnter, constanceEnter } from '@beyou/state/user/perfilSlice';
import {
  checkedItemsInScheduledRoutineEnter,
  totalItemsInScheduledRoutineEnter,
} from '@beyou/state/user/perfilSlice';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import DashboardWidgets from '../src/ui/widgets/DashboardWidgets';

function makeCategory(name: string, xp: number): category {
  return {
    id: name,
    name,
    description: '',
    iconId: 'lucide:dumbbell',
    xp,
    actualLevelXp: 0,
    nextLevelXp: 100,
    level: 1,
    // Serializable stand-in — the slice stores categories verbatim and RTK warns
    // on a live Date in state. The widget never reads createdAt.
    createdAt: '2026-01-01' as unknown as Date,
  };
}

async function renderWith(store: ReturnType<typeof makeStore>) {
  const view = await render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <DashboardWidgets />
      </BeyouThemeProvider>
    </Provider>,
  );

  // The carousel sizes its slides from the measured width, and jest computes no
  // layout — without this event it renders only the first widget.
  const track = screen.queryByTestId('dashboard-widgets');
  if (track) {
    await act(async () => {
      fireEvent(track, 'layout', { nativeEvent: { layout: { width: 358, height: 200 } } });
    });
  }
  return view;
}

describe('DashboardWidgets', () => {
  it('renders the configured widgets in order and skips unknown ids', async () => {
    const store = makeStore();
    store.dispatch(constanceEnter(9));
    store.dispatch(
      widgetsIdInUseEnter(['constance', 'levelProgress', 'bogusWidget', 'dailyProgress']),
    );
    await renderWith(store);

    expect(screen.getByTestId('dashboard-widgets')).toBeTruthy();
    expect(screen.getByTestId('widget-constance')).toBeTruthy();
    expect(screen.getByTestId('widget-level-progress')).toBeTruthy();
    expect(screen.getByTestId('widget-daily-progress')).toBeTruthy();
    // Unknown id "bogusWidget" renders nothing — no crash, just skipped.
  });

  it('shows the NoWidgets empty state + CTA when nothing is configured', async () => {
    const store = makeStore();
    store.dispatch(widgetsIdInUseEnter([]));
    await renderWith(store);

    expect(screen.getByTestId('no-widgets-empty-state')).toBeTruthy();
    expect(screen.getByTestId('no-widgets-empty-state-action')).toBeTruthy();
    expect(screen.queryByTestId('dashboard-widgets')).toBeNull();
  });

  /** The invitation is dismissible: closed, it goes and stays gone. */
  it('hides the invite for good once dismissed', async () => {
    const store = makeStore();
    store.dispatch(widgetsIdInUseEnter([]));
    await renderWith(store);

    await act(async () => {
      fireEvent.press(screen.getByTestId('no-widgets-empty-state-dismiss'));
    });

    expect(screen.queryByTestId('no-widgets-empty-state')).toBeNull();
  });

  it('DailyProgress widget shows the ring percentage + what it means', async () => {
    const store = makeStore();
    store.dispatch(checkedItemsInScheduledRoutineEnter(2));
    store.dispatch(totalItemsInScheduledRoutineEnter(5));
    store.dispatch(widgetsIdInUseEnter(['dailyProgress']));
    await renderWith(store);

    expect(screen.getByTestId('daily-progress-ring')).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy();
    expect(screen.getByText('2 of 5')).toBeTruthy();
  });

  /** More than one widget: the carousel shows its page dots. */
  it('shows page dots with more than one widget', async () => {
    const store = makeStore();
    store.dispatch(widgetsIdInUseEnter(['constance', 'levelProgress']));
    await renderWith(store);

    expect(screen.getByTestId('widget-constance')).toBeTruthy();
    expect(screen.getByTestId('widget-level-progress')).toBeTruthy();
  });

  it('CategoryBalance shows the fallback under 3 categories', async () => {
    const store = makeStore();
    store.dispatch(enterCategories([makeCategory('A', 10), makeCategory('B', 20)]));
    store.dispatch(widgetsIdInUseEnter(['categoryBalance']));
    await renderWith(store);

    expect(screen.getByTestId('category-balance-fallback')).toBeTruthy();
    expect(screen.queryByTestId('category-balance-radar')).toBeNull();
  });

  it('CategoryBalance shows the radar at >= 3 categories', async () => {
    const store = makeStore();
    store.dispatch(
      enterCategories([makeCategory('A', 10), makeCategory('B', 20), makeCategory('C', 30)]),
    );
    store.dispatch(widgetsIdInUseEnter(['categoryBalance']));
    await renderWith(store);

    expect(screen.getByTestId('category-balance-radar')).toBeTruthy();
    expect(screen.queryByTestId('category-balance-fallback')).toBeNull();
  });

  /**
   * The chart the web's area widgets gained with GET /xp/history and the native ones
   * never did: the best area draws its category's week, the worst its own.
   */
  it('area widgets draw the week of XP of their category', async () => {
    (getXpHistory as jest.Mock).mockResolvedValueOnce({
      success: {
        from: '2026-08-09',
        to: '2026-08-15',
        days: ['2026-08-09', '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15'],
        series: [
          { ownerType: 'CATEGORY', ownerId: 'A', values: [0, 1, 2, 3, 4, 5, 6] },
          { ownerType: 'CATEGORY', ownerId: 'C', values: [6, 5, 4, 3, 2, 1, 0] },
        ],
      },
    });
    const store = makeStore();
    store.dispatch(enterCategories([makeCategory('A', 10), makeCategory('C', 30)]));
    store.dispatch(widgetsIdInUseEnter(['betterArea', 'worstArea']));
    await renderWith(store);

    await waitFor(() => expect(screen.getByTestId('widget-better-area-sparkline')).toBeTruthy());
    expect(screen.getByTestId('widget-worst-area-sparkline')).toBeTruthy();
    expect(screen.getAllByTestId('xp-bar')).toHaveLength(14);
    expect(screen.getByTestId('widget-better-area-name').props.children).toBe('C');
  });

  /** Without a window (request still out, or no history) the level bar stays. */
  it('area widgets fall back to the level bar without a window', async () => {
    const store = makeStore();
    store.dispatch(enterCategories([makeCategory('A', 10), makeCategory('C', 30)]));
    store.dispatch(widgetsIdInUseEnter(['betterArea']));
    await renderWith(store);

    await waitFor(() => expect(getXpHistory).toHaveBeenCalled());
    expect(screen.queryByTestId('widget-better-area-sparkline')).toBeNull();
    expect(screen.queryAllByTestId('xp-bar')).toHaveLength(0);
  });

  /**
   * The endpoint omits a category that earned nothing in the window. Once the response
   * is in that means "zero all week", and the chart shows it as seven slivers instead of
   * hiding behind the level bar — the best area is often exactly that category.
   */
  it('area widgets draw a flat week for a category the response left out', async () => {
    (getXpHistory as jest.Mock).mockResolvedValueOnce({
      success: {
        from: '2026-08-09',
        to: '2026-08-15',
        days: ['2026-08-09', '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15'],
        series: [{ ownerType: 'CATEGORY', ownerId: 'A', values: [1, 1, 1, 1, 1, 1, 1] }],
      },
    });
    const store = makeStore();
    store.dispatch(enterCategories([makeCategory('A', 10), makeCategory('Pet', 892)]));
    store.dispatch(widgetsIdInUseEnter(['betterArea']));
    await renderWith(store);

    await waitFor(() => expect(screen.getByTestId('widget-better-area-sparkline')).toBeTruthy());
    expect(screen.getByTestId('widget-better-area-name').props.children).toBe('Pet');
    expect(screen.getAllByTestId('xp-bar')).toHaveLength(7);
    expect(screen.getAllByTestId('xp-bar')[6].props.accessibilityLabel).toContain('0 XP');
  });
});
