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
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import fetchOnboardingSuggestions from '@beyou/api/onboarding/fetchOnboardingSuggestions';
import { createCategoriesFromSuggestions } from '@beyou/state/onboarding/createFromSuggestions';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AiOnboardingWizard from '../src/ui/aiOnboarding/AiOnboardingWizard';

const PROGRESS_KEY = 'beyou.aiOnboarding.progress';
const fetchMock = fetchOnboardingSuggestions as jest.Mock;
const createCategoriesMock = createCategoriesFromSuggestions as jest.Mock;

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
});
