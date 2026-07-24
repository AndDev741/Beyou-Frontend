/**
 * HabitsTasksStep (AI onboarding — Task 4) — suggestion cards in two groups
 * (habits / tasks) with per-group select-all, card toggling, a free-text
 * "ask for more" input that appends fetched items pre-selected (deduped by
 * name), zero-selection continue (skip semantics) and freeTexts accumulation.
 * Mirrors the web HabitsTasksStep contract.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import HabitsTasksStep from '../src/ui/aiOnboarding/HabitsTasksStep';
import type { HabitSuggestion, TaskSuggestion } from '@beyou/types/onboarding/suggestions';

const habit: HabitSuggestion = {
  name: 'Run',
  description: 'd',
  motivationalPhrase: '',
  iconId: 'lucide:zap',
  categoryName: 'Health',
  importance: 3,
  difficulty: 2,
};
const task: TaskSuggestion = {
  name: 'Buy shoes',
  description: 'd',
  iconId: 'lucide:zap',
  categoryName: 'Health',
  importance: 2,
  difficulty: 1,
};

interface Overrides {
  initial?: { habits: HabitSuggestion[]; tasks: TaskSuggestion[] };
  loading?: boolean;
  fetchMore?: jest.Mock;
  onContinue?: jest.Mock;
}

const wrap = async (over: Overrides = {}) => {
  const props = {
    categories: [{ id: 'c', name: 'Health' }],
    initial: { habits: [habit], tasks: [task] },
    loading: false,
    fetchMore: jest.fn(),
    onContinue: jest.fn(),
    ...over,
  };
  await render(
    <BeyouThemeProvider>
      <HabitsTasksStep {...props} />
    </BeyouThemeProvider>
  );
  return props;
};

const press = async (element: ReturnType<typeof screen.getByTestId>) => {
  await act(async () => {
    fireEvent.press(element);
  });
};

const selectedOf = (testID: string) =>
  screen.getByTestId(testID).props.accessibilityState?.selected;

describe('AiOnboarding HabitsTasksStep', () => {
  it('renders title, hint, group labels and the suggestion cards', async () => {
    await wrap();
    expect(screen.getByText('Habits & tasks for you')).toBeTruthy();
    expect(
      screen.getByText(
        'Habits repeat and build streaks; tasks are things you do once or when needed.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Habits')).toBeTruthy();
    expect(screen.getByText('Tasks')).toBeTruthy();
    expect(screen.getByText('Run')).toBeTruthy();
    expect(screen.getByText('Buy shoes')).toBeTruthy();
  });

  it('select-all habits selects every habit card; Continue reports the selection', async () => {
    const { onContinue } = await wrap();
    await press(screen.getByTestId('ai-onboarding-select-all-habits'));
    expect(selectedOf('ai-onboarding-suggestion-Run')).toBe(true);
    expect(selectedOf('ai-onboarding-suggestion-Buy shoes')).toBe(false);

    await press(screen.getByTestId('ai-onboarding-continue'));
    expect(onContinue).toHaveBeenCalledWith({ habits: [habit], tasks: [], freeTexts: [] });
  });

  it('select-all toggles off again; zero selection is allowed on Continue', async () => {
    const { onContinue } = await wrap();
    await press(screen.getByTestId('ai-onboarding-select-all-tasks'));
    await press(screen.getByTestId('ai-onboarding-select-all-tasks'));
    expect(selectedOf('ai-onboarding-suggestion-Buy shoes')).toBe(false);

    await press(screen.getByTestId('ai-onboarding-continue'));
    expect(onContinue).toHaveBeenCalledWith({ habits: [], tasks: [], freeTexts: [] });
  });

  it('tapping a card toggles its selection', async () => {
    const { onContinue } = await wrap();
    await press(screen.getByTestId('ai-onboarding-suggestion-Buy shoes'));
    expect(selectedOf('ai-onboarding-suggestion-Buy shoes')).toBe(true);

    await press(screen.getByTestId('ai-onboarding-continue'));
    expect(onContinue).toHaveBeenCalledWith({ habits: [], tasks: [task], freeTexts: [] });
  });

  it('free input + add calls fetchMore and appends the fetched item pre-selected', async () => {
    const fetchMore = jest
      .fn()
      .mockResolvedValue({ habits: [{ ...habit, name: 'Meditate' }], tasks: [] });
    const { onContinue } = await wrap({ fetchMore });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('ai-onboarding-free-input'), 'something calm');
    });
    await press(screen.getByTestId('ai-onboarding-free-add'));

    expect(fetchMore).toHaveBeenCalledWith('something calm');
    expect(await screen.findByText('Meditate')).toBeTruthy();
    expect(selectedOf('ai-onboarding-suggestion-Meditate')).toBe(true);
    // Input clears after a successful add.
    expect(screen.getByTestId('ai-onboarding-free-input').props.value).toBe('');

    await press(screen.getByTestId('ai-onboarding-continue'));
    expect(onContinue).toHaveBeenCalledWith({
      habits: [{ ...habit, name: 'Meditate' }],
      tasks: [],
      freeTexts: ['something calm'],
    });
  });

  it('dedupes fetched items by name against the existing lists', async () => {
    const fetchMore = jest.fn().mockResolvedValue({
      habits: [habit, { ...habit, name: 'Meditate' }],
      tasks: [task],
    });
    await wrap({ fetchMore });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('ai-onboarding-free-input'), 'more');
    });
    await press(screen.getByTestId('ai-onboarding-free-add'));

    expect(screen.getAllByText('Run')).toHaveLength(1);
    expect(screen.getAllByText('Buy shoes')).toHaveLength(1);
    expect(screen.getByText('Meditate')).toBeTruthy();
  });

  it('keeps the input value when fetchMore fails (wizard banner takes over)', async () => {
    const fetchMore = jest.fn().mockRejectedValue(new Error('down'));
    await wrap({ fetchMore });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('ai-onboarding-free-input'), 'something calm');
    });
    await press(screen.getByTestId('ai-onboarding-free-add'));

    expect(fetchMore).toHaveBeenCalledWith('something calm');
    expect(screen.getByTestId('ai-onboarding-free-input').props.value).toBe('something calm');
  });
});
