/**
 * Goals screen — self-fetches goals + categories, renders cards from the slice,
 * shows the empty state when none, exposes a sort control, and deletes (Alert confirm
 * → deleteGoal → refetch). Boundary mocked = @beyou/api HttpClient + expo-router +
 * notify + RN Alert.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
  useLocalSearchParams: () => ({}),
}));

import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import GoalsScreen from '../app/(app)/goals';

const goal = {
  id: 'g1', name: 'Read books', iconId: 'lucide:book', targetValue: 12, unit: 'books', currentValue: 3,
  complete: false, categories: {}, startDate: '2026-01-01', endDate: '2026-12-31', xpReward: 50,
  status: 'IN_PROGRESS', term: 'LONG_TERM',
};

let del: jest.Mock;
function setHttp(goals: unknown[]) {
  const get = async (url: string) => (url === '/goal' ? { data: goals } : { data: [] });
  del = jest.fn(async () => ({ data: { success: true } }));
  setHttpClient({ get, post: get, put: get, delete: del } as never);
  setLogger({ error: () => {} });
}

const renderScreen = () =>
  render(
    <Provider store={makeStore()}>
      <BeyouThemeProvider>
        <GoalsScreen />
      </BeyouThemeProvider>
    </Provider>,
  );

describe('GoalsScreen', () => {
  it('renders fetched goals as cards + a sort control', async () => {
    setHttp([goal]);
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('goal-card-g1')).toBeTruthy());
    expect(screen.getByText('Read books')).toBeTruthy();
    expect(screen.getByTestId('goals-sort')).toBeTruthy();
  });

  it('shows the empty state when there are no goals', async () => {
    setHttp([]);
    await renderScreen();
    await waitFor(() => expect(screen.getByText('No goals yet')).toBeTruthy());
    expect(screen.getByTestId('empty-create-goal')).toBeTruthy();
    expect(screen.queryByTestId('goals-sort')).toBeNull();
  });

  it('deletes a goal after Alert confirmation', async () => {
    setHttp([goal]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      (buttons ?? []).find((b) => b.style === 'destructive')?.onPress?.();
    });
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('goal-card-g1')).toBeTruthy());

    await act(async () => { fireEvent.press(screen.getByTestId('goal-card-g1')); }); // expand
    await act(async () => { fireEvent.press(screen.getByTestId('goal-delete-g1')); });

    await waitFor(() => expect(del).toHaveBeenCalledWith('/goal/g1'));
    alertSpy.mockRestore();
  });
});
