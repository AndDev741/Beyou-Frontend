/**
 * The goal viewer: one goal per page, ordered by status by default, opened on the goal the
 * deep link names, and walked with the footer arrows. Boundary mocked = @beyou/api
 * HttpClient + expo-router + notify.
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

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import { enterGoals } from '@beyou/state/goal/goalsSlice';
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

beforeEach(() => {
  const noop = async () => ({ data: [] });
  setHttpClient({ get: noop, post: noop, put: noop, delete: noop } as never);
  setLogger({ error: () => {} });
  mockParams = {};
});

async function renderViewer(goals: goal[]) {
  const store = makeStore();
  store.dispatch(enterGoals(goals));
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <GoalViewerScreen />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
}

describe('GoalViewerScreen', () => {
  it('opens on the first slide of the status order: in progress before not started before done', async () => {
    await renderViewer([done, fresh, active]);

    expect(screen.getByTestId('goal-viewer')).toBeTruthy();
    expect(screen.getByTestId('goal-viewer-position').props.children).toBe('1 of 3');
    // The whole deck is mounted by the pager; the position says which one is current.
    expect(screen.getByTestId('goal-viewer-slide-active')).toBeTruthy();
    // A sub-goal in the deck offers the way back to its main goal.
    expect(screen.getByTestId('goal-viewer-parent-active')).toBeTruthy();
    // The main goal lists it.
    expect(screen.getByTestId('goal-viewer-child-active')).toBeTruthy();
  });

  it('the goal param picks the opening slide', async () => {
    mockParams = { goal: 'done' };
    await renderViewer([done, fresh, active]);

    await waitFor(() => expect(screen.getByTestId('goal-viewer-position').props.children).toBe('3 of 3'));
    // A completed goal reads its completion date, not a countdown.
    expect(screen.getByTestId('goal-viewer-deadline-done').props.children).toMatch(/^Completed on /);
    expect(screen.getByTestId('goal-viewer-next').props.accessibilityState.disabled).toBe(true);
  });

  it('Next advances and Previous goes back', async () => {
    await renderViewer([done, fresh, active]);

    await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-next')); });
    expect(screen.getByTestId('goal-viewer-position').props.children).toBe('2 of 3');

    await act(async () => { fireEvent.press(screen.getByTestId('goal-viewer-prev')); });
    expect(screen.getByTestId('goal-viewer-position').props.children).toBe('1 of 3');
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
