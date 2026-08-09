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
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
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
});
