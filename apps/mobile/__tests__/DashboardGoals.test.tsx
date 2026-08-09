/**
 * DashboardGoals — mirror of the web's GoalsHorizon at phone width: compact cards
 * grouped by horizon, with the filter behind a summary. Nothing at all when there
 * are no goals.
 */
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
const mockPush = jest.fn();

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { makeStore } from '../src/store';
import { enterGoals } from '@beyou/state/goal/goalsSlice';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import DashboardGoals from '../src/ui/dashboard/DashboardGoals';

const goal = (over: Record<string, unknown> = {}) => ({
  id: 'g1', name: 'Read books', iconId: 'lucide:book', targetValue: 10, unit: 'books', currentValue: 3,
  complete: false, categories: {}, startDate: new Date(), endDate: new Date(), xpReward: 50,
  status: 'IN_PROGRESS', term: 'SHORT_TERM', ...over,
});

const renderWith = async (goals: unknown[]) => {
  const store = makeStore();
  if (goals.length) store.dispatch(enterGoals(goals as never));
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <DashboardGoals />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
};

beforeEach(() => mockPush.mockClear());

test('shows the compact card with progress and the short deadline', async () => {
  await renderWith([goal()]); // endDate hoje → esta semana

  expect(screen.getByTestId('goals-horizon')).toBeTruthy();
  expect(screen.getByTestId('dash-goal-g1')).toBeTruthy();
  expect(screen.getByText('Read books')).toBeTruthy();
  expect(screen.getByText('3/10 books')).toBeTruthy();
  // The short deadline, not the whole period: "until <day>".
  expect(screen.getByText(/until/i)).toBeTruthy();
});

test('keeps the filter behind a summary until it is opened', async () => {
  await renderWith([goal()]);

  expect(screen.queryByTestId('dash-goals-tag-thisWeek')).toBeNull();

  await act(async () => {
    fireEvent.press(screen.getByTestId('dash-goals-filter'));
  });

  expect(screen.getByTestId('dash-goals-tag-thisWeek')).toBeTruthy();
});

test('hiding every horizon says so instead of going blank', async () => {
  await renderWith([goal()]);

  await act(async () => {
    fireEvent.press(screen.getByTestId('dash-goals-filter'));
  });
  await act(async () => {
    fireEvent.press(screen.getByTestId('dash-goals-tag-thisWeek'));
  });

  expect(screen.queryByTestId('dash-goal-g1')).toBeNull();
  expect(screen.getByText(/no horizon selected/i)).toBeTruthy();
});

test('opens the Goals page with the goal in focus', async () => {
  await renderWith([goal()]);

  await act(async () => {
    fireEvent.press(screen.getByTestId('dash-goal-g1'));
  });

  expect(mockPush).toHaveBeenCalledWith({ pathname: '/goals', params: { expand: 'g1' } });
});

test('marks a reached goal with the success border and its XP', async () => {
  await renderWith([goal({ currentValue: 10 })]);

  expect(screen.getByText('+50')).toBeTruthy();
});

test('renders nothing when there are no goals', async () => {
  await renderWith([]);
  expect(screen.queryByTestId('goals-horizon')).toBeNull();
});
