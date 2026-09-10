/**
 * The goal viewer: one goal per page, ordered by status by default, opened on the goal the
 * deep link names, and walked with the footer arrows. The deck is grouped by default (main
 * goals only, a sub-goal opens on top of its parent) and can be switched to a flat list.
 * Boundary mocked = @beyou/api HttpClient + expo-router + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: mockReplace, canGoBack: () => false }),
  useLocalSearchParams: () => mockParams,
}));
let mockParams: Record<string, string> = {};

import { BackHandler } from 'react-native';
import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import { enterGoals } from '@beyou/state/goal/goalsSlice';
import { setViewSort } from '@beyou/state';
import type { goal } from '@beyou/types/goals/goalType';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import GoalViewerScreen from '../app/goals-view';

const g = (id: string, over: Partial<goal> = {}): goal =>
  ({
    id, name: id, iconId: 'lucide:book', targetValue: 10, unit: 'km', currentValue: 0, complete: false,
    categories: {}, startDate: '2026-01-01', endDate: '2026-12-31', xpReward: 50, status: 'NOT_STARTED',
    term: 'LONG_TERM', parentId: null, ...over,
  }) as goal;

const done = g('done', { name: 'Done goal', status: 'COMPLETED', complete: true, currentValue: 10 });
const fresh = g('fresh', { name: 'Fresh goal' });
const active = g('active', { name: 'Active goal', status: 'IN_PROGRESS', currentValue: 4, parentId: 'fresh' });
const leaf = g('leaf', { name: 'Leaf goal', parentId: 'active' });

const position = () => screen.getByTestId('goal-viewer-position').props.children;

beforeEach(() => {
  const noop = async () => ({ data: [] });
  setHttpClient({ get: noop, post: noop, put: noop, delete: noop } as never);
  setLogger({ error: () => {} });
  mockParams = {};
});

async function renderViewer(goals: goal[], layout?: 'grouped' | 'list', store = makeStore()) {
  store.dispatch(enterGoals(goals));
  if (layout) store.dispatch(setViewSort({ view: 'goalsViewerLayout', sortBy: layout }));
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <GoalViewerScreen />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  return store;
}

describe('GoalViewerScreen', () => {
  describe('grouped layout (the default)', () => {
    it('the deck holds the main goals only and lists a sub-goal under its parent', async () => {
      await renderViewer([done, fresh, active]);

      expect(screen.getByTestId('goal-viewer')).toBeTruthy();
      // Two roots, so the position counts two. The sub-goal has no slide of its own.
      expect(position()).toBe('1 of 2');
      expect(screen.getByTestId('goal-viewer-slide-fresh')).toBeTruthy();
      expect(screen.queryByTestId('goal-viewer-slide-active')).toBeNull();
      // The main goal lists it.
      expect(screen.getByTestId('goal-viewer-child-active')).toBeTruthy();
    });

    it('tapping a sub-goal shows its full slide and the deck position stays put', async () => {
      await renderViewer([done, fresh, active, leaf]);

      await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-child-active')); });
      const open = within(screen.getByTestId('goal-viewer-open'));
      expect(open.getByTestId('goal-viewer-slide-active')).toBeTruthy();
      expect(open.getByText('Active goal')).toBeTruthy();
      expect(open.getByText('4/10 km')).toBeTruthy();
      expect(screen.getByTestId('goal-viewer-counter-active')).toBeTruthy();
      expect(screen.getByTestId('goal-viewer-increase-active')).toBeTruthy();
      expect(position()).toBe('1 of 2');

      // Its own sub-goal opens from inside it, one level deeper.
      await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-child-leaf')); });
      expect(screen.getByTestId('goal-viewer-slide-leaf')).toBeTruthy();
      expect(screen.queryByTestId('goal-viewer-slide-active')).toBeNull();
      expect(position()).toBe('1 of 2');
    });

    it('the parent control returns to the parent, one level at a time', async () => {
      mockParams = { goal: 'leaf' };
      await renderViewer([done, fresh, active, leaf]);

      // A deep link to a grandchild lands on the root's slide with the grandchild open.
      await waitFor(() => expect(screen.getByTestId('goal-viewer-slide-leaf')).toBeTruthy());
      expect(position()).toBe('1 of 2');

      await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-parent-leaf')); });
      expect(screen.getByTestId('goal-viewer-slide-active')).toBeTruthy();
      expect(screen.queryByTestId('goal-viewer-slide-leaf')).toBeNull();

      await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-parent-active')); });
      expect(screen.queryByTestId('goal-viewer-open')).toBeNull();
      expect(screen.queryByTestId('goal-viewer-slide-active')).toBeNull();
      expect(screen.getByTestId('goal-viewer-slide-fresh')).toBeTruthy();
    });

    it('the hardware back button closes the open sub-goal before it leaves the screen', async () => {
      const handlers: Array<() => boolean | null | undefined> = [];
      const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
        handlers.push(handler);
        return { remove: () => handlers.splice(handlers.indexOf(handler), 1) };
      });
      try {
        await renderViewer([done, fresh, active]);
        // Nothing open, nothing registered: the route's own back behaviour is untouched.
        expect(handlers).toHaveLength(0);

        await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-child-active')); });
        expect(handlers).toHaveLength(1);

        let handled: boolean | null | undefined;
        await act(async () => { handled = handlers[0]!(); });
        expect(handled).toBe(true);
        expect(screen.queryByTestId('goal-viewer-open')).toBeNull();
        expect(handlers).toHaveLength(0);
      } finally {
        spy.mockRestore();
      }
    });

    it('Next from an open sub-goal closes it and moves the deck', async () => {
      await renderViewer([done, fresh, active]);

      await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-child-active')); });
      await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-next')); });
      expect(screen.queryByTestId('goal-viewer-open')).toBeNull();
      expect(position()).toBe('2 of 2');
    });

    it('switching to the list layout gives the sub-goal a slide of its own', async () => {
      const store = makeStore();
      const dispatch = jest.spyOn(store, 'dispatch');
      await renderViewer([done, fresh, active], undefined, store);
      expect(screen.queryByTestId('goal-viewer-slide-active')).toBeNull();

      await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-layout')); });
      await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-layout-option-list')); });

      // The choice is the shared viewFilters preference, the one the web reads too.
      expect(dispatch).toHaveBeenCalledWith(setViewSort({ view: 'goalsViewerLayout', sortBy: 'list' }));
      expect(store.getState().viewFilters.goalsViewerLayout).toBe('list');
      // In progress first: the sub-goal is now the first of three slides.
      expect(screen.getByTestId('goal-viewer-slide-active')).toBeTruthy();
      expect(position()).toBe('1 of 3');
    });
  });

  describe('list layout', () => {
    it('opens on the first slide of the status order: in progress before not started before done', async () => {
      await renderViewer([done, fresh, active], 'list');

      expect(position()).toBe('1 of 3');
      // The whole deck is mounted by the pager; the position says which one is current.
      expect(screen.getByTestId('goal-viewer-slide-active')).toBeTruthy();
      // A sub-goal in the deck offers the way back to its main goal.
      expect(screen.getByTestId('goal-viewer-parent-active')).toBeTruthy();
      // The main goal lists it.
      expect(screen.getByTestId('goal-viewer-child-active')).toBeTruthy();
    });

    it('the goal param picks the opening slide', async () => {
      mockParams = { goal: 'done' };
      await renderViewer([done, fresh, active], 'list');

      await waitFor(() => expect(position()).toBe('3 of 3'));
      // A completed goal reads its completion date, not a countdown.
      expect(screen.getByTestId('goal-viewer-deadline-done').props.children).toMatch(/^Completed on /);
      expect(screen.getByTestId('goal-viewer-next').props.accessibilityState.disabled).toBe(true);
    });

    it('Next advances and Previous goes back', async () => {
      await renderViewer([done, fresh, active], 'list');

      await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-next')); });
      expect(position()).toBe('2 of 3');

      await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-prev')); });
      expect(position()).toBe('1 of 3');
    });
  });

  it('leaving with nothing beneath goes to the goals list', async () => {
    await renderViewer([fresh]);
    await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-leave')); });
    expect(mockReplace).toHaveBeenCalledWith('/goals');
  });

  it('an empty deck says so and offers to clear the filters', async () => {
    await renderViewer([fresh]);
    await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-status')); });
    await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-status-option-COMPLETED')); });
    expect(screen.getByTestId('goal-viewer-empty')).toBeTruthy();
  });
});
