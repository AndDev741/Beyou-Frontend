/**
 * DashboardGoals — reads goals from the slice, buckets them by end date, shows
 * filter chips + read-only rows, and renders nothing when there are no goals.
 */
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

import { Provider } from 'react-redux';
import { render, screen, act } from '@testing-library/react-native';
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
  return render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <DashboardGoals />
      </BeyouThemeProvider>
    </Provider>,
  );
};

test('renders the goals view with a bucket + read-only row', async () => {
  await renderWith([goal()]); // endDate today → This Week
  expect(screen.getByTestId('dash-goals-header')).toBeTruthy();
  expect(screen.getAllByText('This Week').length).toBeGreaterThanOrEqual(1); // chip + section title
  expect(screen.getByTestId('dash-goal-g1')).toBeTruthy();
  expect(screen.getByText('Read books')).toBeTruthy();
  expect(screen.getByText('3 / 10 books')).toBeTruthy(); // steps (current / target unit)
});

test('renders nothing when there are no goals', async () => {
  await renderWith([]);
  expect(screen.queryByTestId('dash-goals-header')).toBeNull();
});
