/**
 * AiOnboardingWizard (AI onboarding — Task 3) — mobile wizard shell: async
 * SecureStore hydration, categories flow (fetch suggestions → create → next
 * step), error banner with Retry + take-tour fallback, and take-tour exits
 * that clear progress and call onClosed. Boundary mocked = the suggestions
 * endpoint + the shared entity-creation helper + SecureStore.
 */
jest.mock('expo-secure-store', () => {
  const m = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => m.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      m.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      m.delete(k);
    }),
  };
});
jest.mock('@beyou/api/onboarding/fetchOnboardingSuggestions', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@beyou/state/onboarding/createFromSuggestions', () => ({
  __esModule: true,
  createCategoriesFromSuggestions: jest.fn(),
  createHabitsFromSuggestions: jest.fn(),
  createTasksFromSuggestions: jest.fn(),
  createRoutineFromSuggestion: jest.fn(),
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import fetchOnboardingSuggestions from '@beyou/api/onboarding/fetchOnboardingSuggestions';
import {
  createCategoriesFromSuggestions,
  createHabitsFromSuggestions,
  createRoutineFromSuggestion,
  createTasksFromSuggestions,
} from '@beyou/state/onboarding/createFromSuggestions';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AiOnboardingWizard from '../src/ui/aiOnboarding/AiOnboardingWizard';

const PROGRESS_KEY = 'beyou.aiOnboarding.progress';
const fetchMock = fetchOnboardingSuggestions as jest.Mock;
const createCategoriesMock = createCategoriesFromSuggestions as jest.Mock;
const createHabitsMock = createHabitsFromSuggestions as jest.Mock;
const createTasksMock = createTasksFromSuggestions as jest.Mock;
const createRoutineMock = createRoutineFromSuggestion as jest.Mock;

const renderWizard = async (over: Record<string, unknown> = {}) => {
  const props = {
    onFinish: jest.fn(),
    onTakeTour: jest.fn(),
    onClosed: jest.fn(),
    ...over,
  };
  await render(
    <Provider store={makeStore()}>
      <BeyouThemeProvider>
        <AiOnboardingWizard visible {...props} />
      </BeyouThemeProvider>
    </Provider>
  );
  return props;
};

const CATEGORIES_QUESTION = 'Which parts of your life do you want to improve?';

const routineSuggestion = {
  name: 'Morning flow',
  iconId: 'lucide:sun',
  scheduleDays: ['Monday'],
  sections: [
    {
      name: 'Wake',
      iconId: 'lucide:sun',
      startTime: '07:00',
      endTime: '08:00',
      habits: [{ name: 'Run', startTime: '07:00', endTime: '07:30' }],
      tasks: [],
    },
  ],
};

const selectHealthAndContinue = async () => {
  await screen.findByText(CATEGORIES_QUESTION);
  await act(async () => {
    fireEvent.press(screen.getByText('Health'));
  });
  await act(async () => {
    fireEvent.press(screen.getByTestId('ai-onboarding-continue'));
  });
};

beforeEach(async () => {
  jest.clearAllMocks();
  await SecureStore.deleteItemAsync(PROGRESS_KEY);
});

describe('AiOnboardingWizard', () => {
  it('categories continue fetches suggestions and creates categories, then advances', async () => {
    fetchMock.mockResolvedValue({
      success: {
        categories: [{ name: 'Health', description: 'd', iconId: 'lucide:heart-pulse' }],
      },
    });
    createCategoriesMock.mockResolvedValue([{ id: 'c1', name: 'Health' }]);

    await renderWizard();
    await selectHealthAndContinue();

    expect(fetchMock).toHaveBeenCalledWith(
      { step: 'CATEGORIES', categoryNames: ['Health'] },
      expect.any(Function)
    );
    expect(createCategoriesMock).toHaveBeenCalledWith(
      [{ name: 'Health', description: 'd', iconId: 'lucide:heart-pulse' }],
      expect.any(Function),
      expect.any(Function)
    );
    // Advanced past categories (habitsTasks step is a placeholder until Task 4).
    expect(screen.queryByText(CATEGORIES_QUESTION)).toBeNull();
    expect(screen.getByText('Habits & Tasks')).toBeTruthy();
    // Progress persisted with the created refs.
    const raw = await SecureStore.getItemAsync(PROGRESS_KEY);
    expect(JSON.parse(raw as string)).toMatchObject({
      step: 'habitsTasks',
      data: { categories: [{ id: 'c1', name: 'Health' }] },
    });
  });

  it('suggestion error shows the banner; fallback exits to the tour and clears progress', async () => {
    fetchMock.mockResolvedValue({ error: { message: 'down' } });

    const props = await renderWizard();
    await selectHealthAndContinue();

    expect(await screen.findByText('AI setup is unavailable right now')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-take-tour-fallback'));
    });
    expect(props.onTakeTour).toHaveBeenCalled();
    expect(props.onClosed).toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(PROGRESS_KEY);
  });

  it('Retry re-runs the failed action and recovers', async () => {
    fetchMock.mockResolvedValueOnce({ error: { message: 'down' } });

    await renderWizard();
    await selectHealthAndContinue();
    await screen.findByText('AI setup is unavailable right now');

    fetchMock.mockResolvedValue({
      success: { categories: [{ name: 'Health', description: 'd', iconId: 'lucide:heart-pulse' }] },
    });
    createCategoriesMock.mockResolvedValue([{ id: 'c1', name: 'Health' }]);
    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-retry'));
    });

    expect(screen.queryByText('AI setup is unavailable right now')).toBeNull();
    expect(screen.getByText('Habits & Tasks')).toBeTruthy();
  });

  it('header take-tour clears progress, calls onTakeTour and onClosed', async () => {
    const props = await renderWizard();
    await screen.findByText(CATEGORIES_QUESTION);
    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-take-tour'));
    });
    expect(props.onTakeTour).toHaveBeenCalled();
    expect(props.onClosed).toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(PROGRESS_KEY);
  });

  it('resumes from stored progress and only then fires the resumed step fetch', async () => {
    await SecureStore.setItemAsync(
      PROGRESS_KEY,
      JSON.stringify({
        step: 'habitsTasks',
        data: {
          categories: [{ id: 'c1', name: 'Health' }],
          habits: [],
          tasks: [],
          goals: [],
          freeTexts: [],
        },
      })
    );
    fetchMock.mockResolvedValue({ success: { habits: [], tasks: [] } });

    await renderWizard();

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        { step: 'HABITS_TASKS', context: { categories: ['Health'] } },
        expect.any(Function)
      )
    );
    expect(screen.getByText('Habits & Tasks')).toBeTruthy();
    expect(screen.queryByText(CATEGORIES_QUESTION)).toBeNull();
  });

  it('habitsTasks continue creates the selected habits/tasks and advances to routine', async () => {
    const storedData = {
      categories: [{ id: 'c1', name: 'Health' }],
      habits: [],
      tasks: [],
      goals: [],
      freeTexts: [],
    };
    await SecureStore.setItemAsync(
      PROGRESS_KEY,
      JSON.stringify({ step: 'habitsTasks', data: storedData })
    );
    const habit = {
      name: 'Run',
      description: 'd',
      motivationalPhrase: '',
      iconId: 'lucide:zap',
      categoryName: 'Health',
      importance: 3,
      difficulty: 2,
    };
    // The same mock serves the habitsTasks fetch AND the routine step's
    // one-shot fetch that fires after the advance.
    fetchMock.mockResolvedValue({
      success: { habits: [habit], tasks: [], routine: routineSuggestion },
    });
    createHabitsMock.mockResolvedValue([{ id: 'h1', name: 'Run' }]);
    createTasksMock.mockResolvedValue([]);

    await renderWizard();
    await screen.findByText('Run');

    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-select-all-habits'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-continue'));
    });

    expect(createHabitsMock).toHaveBeenCalledWith(
      [habit],
      [{ id: 'c1', name: 'Health' }],
      expect.any(Function),
      expect.any(Function)
    );
    expect(createTasksMock).toHaveBeenCalledWith(
      [],
      [{ id: 'c1', name: 'Health' }],
      expect.any(Function),
      expect.any(Function)
    );
    // Advanced to the routine step and persisted the refs.
    expect(screen.getByText('Routine')).toBeTruthy();
    expect(await screen.findByTestId('ai-onboarding-routine-accept')).toBeTruthy();
    const raw = await SecureStore.getItemAsync(PROGRESS_KEY);
    expect(JSON.parse(raw as string)).toMatchObject({
      step: 'routine',
      data: { habits: [{ id: 'h1', name: 'Run' }], tasks: [] },
    });
  });

  it('fetchMore failure routes to the banner; Retry re-runs the base habitsTasks fetch', async () => {
    await SecureStore.setItemAsync(
      PROGRESS_KEY,
      JSON.stringify({
        step: 'habitsTasks',
        data: {
          categories: [{ id: 'c1', name: 'Health' }],
          habits: [],
          tasks: [],
          goals: [],
          freeTexts: [],
        },
      })
    );
    const habit = {
      name: 'Run',
      description: 'd',
      motivationalPhrase: '',
      iconId: 'lucide:zap',
      categoryName: 'Health',
      importance: 3,
      difficulty: 2,
    };
    fetchMock
      .mockResolvedValueOnce({ success: { habits: [habit], tasks: [] } }) // initial step fetch
      .mockResolvedValueOnce({ error: { message: 'down' } }) // fetchMore fails
      .mockResolvedValue({ success: { habits: [habit], tasks: [] } }); // retry succeeds

    await renderWizard();
    await screen.findByText('Run');

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('ai-onboarding-free-input'), 'something calm');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-free-add'));
    });
    expect(await screen.findByText('AI setup is unavailable right now')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      { step: 'HABITS_TASKS', context: { categories: ['Health'] }, newRequest: 'something calm' },
      expect.any(Function)
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-retry'));
    });
    // Retry re-ran the BASE fetch (no newRequest) and recovered the step.
    expect(fetchMock).toHaveBeenLastCalledWith(
      { step: 'HABITS_TASKS', context: { categories: ['Health'] } },
      expect.any(Function)
    );
    expect(screen.queryByText('AI setup is unavailable right now')).toBeNull();
    expect(screen.getByText('Run')).toBeTruthy();
  });

  it('routine step fetches with the full context on entry; accept creates the routine and advances to goals', async () => {
    await SecureStore.setItemAsync(
      PROGRESS_KEY,
      JSON.stringify({
        step: 'routine',
        data: {
          categories: [{ id: 'c1', name: 'Health' }],
          habits: [{ id: 'h1', name: 'Run' }],
          tasks: [],
          goals: [],
          freeTexts: ['something calm'],
        },
      })
    );
    fetchMock.mockResolvedValue({ success: { routine: routineSuggestion } });
    createRoutineMock.mockResolvedValue({ routineId: 'r1', name: 'Morning flow' });

    await renderWizard();

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        {
          step: 'ROUTINE',
          context: {
            categories: ['Health'],
            habits: [{ name: 'Run' }],
            tasks: [],
            freeTexts: ['something calm'],
          },
        },
        expect.any(Function)
      )
    );
    expect(await screen.findByTestId('ai-onboarding-routine-accept')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-routine-accept'));
    });

    // The edited draft is created with the selected days folded into scheduleDays.
    expect(createRoutineMock).toHaveBeenCalledWith(
      { ...routineSuggestion, scheduleDays: ['Monday'] },
      [{ id: 'h1', name: 'Run' }],
      [],
      expect.any(Function),
      expect.any(Function)
    );
    // Advanced to the goals step (placeholder until Task 6) with routineName persisted.
    expect(screen.getByText('Goals')).toBeTruthy();
    const raw = await SecureStore.getItemAsync(PROGRESS_KEY);
    expect(JSON.parse(raw as string)).toMatchObject({
      step: 'goals',
      data: { routineName: 'Morning flow' },
    });
  });

  it('routine regenerate is an in-step action: feedback in the request, no full-screen overlay', async () => {
    await SecureStore.setItemAsync(
      PROGRESS_KEY,
      JSON.stringify({
        step: 'routine',
        data: {
          categories: [{ id: 'c1', name: 'Health' }],
          habits: [{ id: 'h1', name: 'Run' }],
          tasks: [],
          goals: [],
          freeTexts: [],
        },
      })
    );
    fetchMock.mockResolvedValueOnce({ success: { routine: routineSuggestion } });

    await renderWizard();
    await screen.findByTestId('ai-onboarding-routine-accept');

    // Keep the regenerate request pending so the busy state is observable.
    let resolveRegenerate: (v: unknown) => void = () => {};
    fetchMock.mockImplementationOnce(
      () => new Promise((resolve) => (resolveRegenerate = resolve))
    );

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('ai-onboarding-feedback'), 'I wake at 6');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-onboarding-regenerate'));
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      {
        step: 'ROUTINE',
        context: {
          categories: ['Health'],
          habits: [{ name: 'Run' }],
          tasks: [],
          freeTexts: [],
          feedback: 'I wake at 6',
        },
      },
      expect.any(Function)
    );
    // overlay: false — the step stays visible, no full-screen busy overlay.
    expect(screen.queryByTestId('ai-onboarding-busy')).toBeNull();
    expect(screen.getByTestId('ai-onboarding-routine-accept')).toBeTruthy();

    // A fresh draft replaces the old one and clears the feedback.
    await act(async () => {
      resolveRegenerate({
        success: { routine: { ...routineSuggestion, name: 'Fresh flow' } },
      });
    });
    expect(screen.getByText('Fresh flow')).toBeTruthy();
    expect(screen.getByTestId('ai-onboarding-feedback').props.value).toBe('');
  });
});
