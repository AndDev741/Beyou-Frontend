/**
 * GoalCard — shows progress, fires increase/decrease/complete against the API, and
 * (expanded) fires edit/delete. Wrapped in a real store since useGoalActions reads
 * perfil + dispatches updateGoal/applyRefreshUi.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import GoalCard from '../src/ui/goals/GoalCard';

const goal = {
  id: 'g1', name: 'Read books', iconId: 'lucide:book', description: 'grow', targetValue: 12, unit: 'books',
  currentValue: 3, complete: false, categories: { c1: { name: 'Health', iconId: 'lucide:heart' } },
  motivation: 'learn', startDate: '2026-01-01', endDate: '2026-12-31', xpReward: 50, status: 'IN_PROGRESS', term: 'LONG_TERM',
} as never;

let put: jest.Mock;
beforeEach(() => {
  put = jest.fn(async (url: string) => (url.includes('/complete') ? { data: {} } : { data: { ...goal, currentValue: 4 } }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post: noop, put, delete: noop } as never);
  setLogger({ error: () => {} });
});

const wrap = (node: React.ReactElement) =>
  render(<Provider store={makeStore()}><BeyouThemeProvider>{node}</BeyouThemeProvider></Provider>);

describe('GoalCard', () => {
  it('shows progress and runs increase + complete', async () => {
    const onChanged = jest.fn();
    await wrap(<GoalCard goal={goal} onEdit={jest.fn()} onDelete={jest.fn()} onChanged={onChanged} />);

    expect(screen.getByText('3/12 books')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy(); // 3/12

    await act(async () => { fireEvent.press(screen.getByTestId('goal-increase-g1')); });
    await waitFor(() => expect(put).toHaveBeenCalledWith('/goal/increase', 'g1', expect.anything()));

    await act(async () => { fireEvent.press(screen.getByTestId('goal-complete-g1')); });
    await waitFor(() => expect(put).toHaveBeenCalledWith('/goal/complete', 'g1', expect.anything()));
    expect(onChanged).toHaveBeenCalled();
  });

  it('expands to fire edit/delete callbacks', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    await wrap(<GoalCard goal={goal} onEdit={onEdit} onDelete={onDelete} onChanged={jest.fn()} />);

    expect(screen.queryByTestId('goal-edit-g1')).toBeNull();
    await act(async () => { fireEvent.press(screen.getByTestId('goal-card-g1')); });
    await act(async () => { fireEvent.press(screen.getByTestId('goal-edit-g1')); });
    expect(onEdit).toHaveBeenCalledWith(goal);
    await act(async () => { fireEvent.press(screen.getByTestId('goal-delete-g1')); });
    expect(onDelete).toHaveBeenCalledWith(goal);
  });
});
