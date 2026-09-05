/**
 * Nested goals on native: the card shows its sub-goals as a count, a fold and rows, nudges
 * the parent once every sub-goal is done, and the form offers a parent picker that never
 * lists the goal itself. Boundary mocked = @beyou/api HttpClient + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import type { goal } from '@beyou/types/goals/goalType';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import GoalCard from '../src/ui/goals/GoalCard';
import GoalForm from '../src/ui/goals/GoalForm';
import AddSubGoalModal from '../src/ui/goals/AddSubGoalModal';

const g = (id: string, over: Partial<goal> = {}): goal =>
  ({
    id, name: id, iconId: 'lucide:book', targetValue: 10, unit: 'km', currentValue: 0, complete: false,
    categories: {}, startDate: '2026-01-01', endDate: '2026-12-31', xpReward: 50, status: 'IN_PROGRESS',
    term: 'LONG_TERM', parentId: null, ...over,
  }) as goal;

const marathon = g('marathon', { name: 'Run a marathon', targetValue: 42 });
const tenK = g('tenk', { name: 'Run 10 km', parentId: 'marathon', currentValue: 5 });
const weekly = g('weekly', { name: 'Run 3x a week', parentId: 'tenk', currentValue: 10, complete: true, status: 'COMPLETED' });
const all = [marathon, tenK, weekly];

let put: jest.Mock;
beforeEach(() => {
  put = jest.fn(async (url: string) => (url.includes('/complete') ? { data: {} } : { data: { id: 'tenk', currentValue: 6 } }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post: noop, put, delete: noop } as never);
  setLogger({ error: () => {} });
});

const wrap = async (node: React.ReactElement) => {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>{node}</BeyouThemeProvider>
      </Provider>,
    );
  });
};

describe('GoalCard with sub-goals', () => {
  it('shows the count chip and folds the rows behind the toggle', async () => {
    await wrap(
      <GoalCard goal={marathon} subGoals={[tenK]} allGoals={all} depth={1}
        onEdit={jest.fn()} onDelete={jest.fn()} onChanged={jest.fn()} onAddSubGoal={jest.fn()} />,
    );

    expect(screen.getByTestId('goal-subgoals-marathon')).toBeTruthy();
    expect(screen.getByText('0/1 sub-goals')).toBeTruthy();
    expect(screen.queryByTestId('goal-subgoal-row-tenk')).toBeNull();

    await act(async () => { fireEvent.press(screen.getByTestId('goal-subgoals-toggle-marathon')); });

    expect(screen.getByTestId('goal-subgoal-row-tenk')).toBeTruthy();
    // The third level renders indented under its own parent row.
    expect(screen.getByTestId('goal-subgoal-row-weekly')).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByTestId('goal-subgoal-increase-tenk')); });
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith('/goal/increase', { goalId: 'tenk', value: 1 }, expect.anything()),
    );
  });

  it('nudges the parent once every sub-goal is complete, and offers Add sub-goal only below the cap', async () => {
    const onAddSubGoal = jest.fn();
    await wrap(
      <GoalCard goal={tenK} subGoals={[weekly]} allGoals={all} depth={2} parentName="Run a marathon"
        onEdit={jest.fn()} onDelete={jest.fn()} onChanged={jest.fn()} onAddSubGoal={onAddSubGoal} />,
    );

    expect(screen.getByText('Sub-goal of Run a marathon')).toBeTruthy();
    expect(screen.getByText('Every sub-goal is done. Complete this goal?')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByTestId('goal-complete-parent-tenk')); });
    await waitFor(() => expect(put).toHaveBeenCalledWith('/goal/complete', 'tenk', expect.anything()));

    // Add sub-goal sits in the fold, with its name next to the icon.
    await act(async () => { fireEvent.press(screen.getByTestId('goal-card-tenk')); });
    await act(async () => { fireEvent.press(screen.getByTestId('goal-add-sub-tenk')); });
    expect(onAddSubGoal).toHaveBeenCalledWith(tenK);
  });

  it('a third-level goal cannot get sub-goals of its own', async () => {
    await wrap(
      <GoalCard goal={weekly} allGoals={all} depth={3}
        onEdit={jest.fn()} onDelete={jest.fn()} onChanged={jest.fn()} onAddSubGoal={jest.fn()} />,
    );
    await act(async () => { fireEvent.press(screen.getByTestId('goal-card-weekly')); });
    expect(screen.queryByTestId('goal-add-sub-weekly')).toBeNull();
    expect(screen.queryByTestId('goal-subgoals-weekly')).toBeNull();
  });
});

describe('GoalForm parent picker', () => {
  const categories = [] as never[];

  it('lists the eligible parents and never the goal itself', async () => {
    await wrap(
      <GoalForm visible mode="edit" goal={weekly} categories={categories} allGoals={all}
        onClose={jest.fn()} onSaved={jest.fn()} />,
    );

    await act(async () => { fireEvent.press(screen.getByTestId('goal-parent')); });
    expect(screen.getByTestId('goal-parent-option-')).toBeTruthy();
    expect(screen.getByTestId('goal-parent-option-marathon')).toBeTruthy();
    expect(screen.getByTestId('goal-parent-option-tenk')).toBeTruthy();
    expect(screen.queryByTestId('goal-parent-option-weekly')).toBeNull();
  });

  it('hides the picker when nothing could be the parent', async () => {
    // marathon already carries two levels below it: under anything else it would be four.
    await wrap(
      <GoalForm visible mode="edit" goal={marathon} categories={categories} allGoals={all}
        onClose={jest.fn()} onSaved={jest.fn()} />,
    );
    expect(screen.queryByTestId('goal-parent')).toBeNull();
  });

  it('pre-selects the parent handed in by "Add sub-goal" and sends it on create', async () => {
    const post = jest.fn(async () => ({ data: { success: true } }));
    setHttpClient({ get: async () => ({ data: null }), post, put, delete: async () => ({ data: null }) } as never);

    await wrap(
      <GoalForm visible mode="create" categories={categories} allGoals={all} defaultParentId="marathon"
        onClose={jest.fn()} onSaved={jest.fn()} />,
    );

    // The picker reads the parent's name, and the deadline was borrowed from it.
    expect(screen.getByTestId('goal-parent').props.accessibilityValue.text).toBe('Run a marathon');

    await act(async () => { fireEvent.changeText(screen.getByTestId('goal-title'), 'Run 5 km'); });
    await act(async () => { fireEvent.press(screen.getByTestId('goal-icon')); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('icon-picker-search'), 'house'); });
    await act(async () => { fireEvent.press(screen.getAllByLabelText(/^Icon: /)[0]); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('goal-target'), '5'); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('goal-unit'), 'km'); });
    await act(async () => { fireEvent.press(screen.getByTestId('goal-start')); });
    await act(async () => { fireEvent(screen.getByTestId('goal-start-picker'), 'onChange', { type: 'set' }, new Date(2026, 0, 1)); });
    await act(async () => { fireEvent.press(screen.getByTestId('goal-form-submit')); });

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const [, body] = post.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(body).toMatchObject({ name: 'Run 5 km', parentId: 'marathon', endDate: '2026-12-31' });
  }, 20000);
});

describe('AddSubGoalModal', () => {
  it('explains the move, offers only goals that fit, and moves one through PUT /goal', async () => {
    const onMoved = jest.fn();
    const onCreateNew = jest.fn();
    // `other` is a root with no children: fits under tenK (level 2) as a third level.
    // `marathon` is tenK's ancestor and `weekly` already its child: neither is offered.
    const other = g('other', { name: 'Learn French' });
    await wrap(
      <AddSubGoalModal parent={tenK} allGoals={[...all, other]} onClose={jest.fn()} onCreateNew={onCreateNew} onMoved={onMoved} />,
    );

    expect(screen.getByText('A sub-goal sits under “Run 10 km” and shows its progress there. Pick one of your goals to move here, or create a new one.')).toBeTruthy();
    expect(screen.getByTestId('add-subgoal-modal-pick-other')).toBeTruthy();
    expect(screen.queryByTestId('add-subgoal-modal-pick-marathon')).toBeNull();
    expect(screen.queryByTestId('add-subgoal-modal-pick-weekly')).toBeNull();

    await act(async () => { fireEvent.press(screen.getByTestId('add-subgoal-modal-pick-other')); });
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith('/goal', expect.objectContaining({ goalId: 'other', parentId: 'tenk', name: 'Learn French' })),
    );
    expect(onMoved).toHaveBeenCalled();

    await act(async () => { fireEvent.press(screen.getByTestId('add-subgoal-modal-create')); });
    expect(onCreateNew).toHaveBeenCalledWith(tenK);
  });

  it('says so when nothing can go under a third-level goal', async () => {
    await wrap(
      <AddSubGoalModal parent={weekly} allGoals={all} onClose={jest.fn()} onCreateNew={jest.fn()} onMoved={jest.fn()} />,
    );
    expect(screen.getByTestId('add-subgoal-modal-none')).toBeTruthy();
  });
});
