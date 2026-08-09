/**
 * GoalCard — mirror of the web's goalBox. The stepper lives on the closed card;
 * "Complete" only appears once the target is hit (it is what pays the XP) and,
 * once complete, becomes "Undo" without the card losing its design.
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

const reachedGoal = { ...(goal as object), currentValue: 12 } as never;
const completedGoal = { ...(goal as object), currentValue: 12, status: 'COMPLETED', complete: true } as never;

let put: jest.Mock;
beforeEach(() => {
  // increase/decrease return the updated goal; the card reads from props (not the
  // slice), so a minimal stub is enough — and avoids spreading the `as never` fixture.
  put = jest.fn(async (url: string) => (url.includes('/complete') ? { data: {} } : { data: { id: 'g1', currentValue: 4 } }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post: noop, put, delete: noop } as never);
  setLogger({ error: () => {} });
});

// Inside `act`: the theme provider settles after the first render, and a loose
// update would corrupt the next test in the file (see AGENTS.md).
const wrap = async (node: React.ReactElement) => {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>{node}</BeyouThemeProvider>
      </Provider>,
    );
  });
};

describe('GoalCard', () => {
  it('shows the count and steps the progress up', async () => {
    await wrap(<GoalCard goal={goal} onEdit={jest.fn()} onDelete={jest.fn()} onChanged={jest.fn()} />);

    expect(screen.getByText('3/12 books')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('goal-increase-g1'));
    });
    await waitFor(() => expect(put).toHaveBeenCalledWith('/goal/increase', 'g1', expect.anything()));
  });

  it('withholds Complete until the target is reached', async () => {
    await wrap(<GoalCard goal={goal} onEdit={jest.fn()} onDelete={jest.fn()} onChanged={jest.fn()} />);

    expect(screen.queryByTestId('goal-complete-g1')).toBeNull();
    expect(screen.getByTestId('goal-increase-g1')).toBeTruthy();
    // With the target unmet there is no XP to announce.
    expect(screen.queryByTestId('goal-xp-g1')).toBeNull();
  });

  it('swaps the plus for Complete once the target is reached', async () => {
    const onChanged = jest.fn();
    await wrap(<GoalCard goal={reachedGoal} onEdit={jest.fn()} onDelete={jest.fn()} onChanged={onChanged} />);

    expect(screen.queryByTestId('goal-increase-g1')).toBeNull();
    expect(screen.getByTestId('goal-xp-g1')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('goal-complete-g1'));
    });
    await waitFor(() => expect(put).toHaveBeenCalledWith('/goal/complete', 'g1', expect.anything()));
    expect(onChanged).toHaveBeenCalled();
  });

  it('keeps the whole card once completed, with Undo in place of Complete', async () => {
    await wrap(<GoalCard goal={completedGoal} onEdit={jest.fn()} onDelete={jest.fn()} onChanged={jest.fn()} />);

    expect(screen.getByTestId('goal-completed-g1')).toBeTruthy();
    expect(screen.getByTestId('goal-xp-g1')).toBeTruthy();
    expect(screen.getByText('Undo')).toBeTruthy();
    // The design stays whole: name, categories and the deadline footer.
    expect(screen.getByText('Read books')).toBeTruthy();
    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByText('Long Term')).toBeTruthy();
  });

  it('fires edit and delete from the top row, without expanding', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    await wrap(<GoalCard goal={goal} onEdit={onEdit} onDelete={onDelete} onChanged={jest.fn()} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('goal-edit-g1'));
      fireEvent.press(screen.getByTestId('goal-delete-g1'));
    });

    expect(onEdit).toHaveBeenCalledWith(goal);
    expect(onDelete).toHaveBeenCalledWith(goal);
  });

  it('hides the detail until the chevron is tapped', async () => {
    await wrap(<GoalCard goal={goal} onEdit={jest.fn()} onDelete={jest.fn()} onChanged={jest.fn()} />);

    expect(screen.queryByText('Motivation: learn')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('goal-card-g1'));
    });

    expect(screen.getByText('Motivation: learn')).toBeTruthy();
    expect(screen.getByText('In Progress')).toBeTruthy();
  });

  it('starts expanded when initialExpanded is set (opened from the dashboard)', async () => {
    await wrap(
      <GoalCard goal={goal} initialExpanded onEdit={jest.fn()} onDelete={jest.fn()} onChanged={jest.fn()} />,
    );

    expect(screen.getByText('Motivation: learn')).toBeTruthy();
  });
});
