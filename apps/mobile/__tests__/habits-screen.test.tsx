/**
 * Habits screen (P6-B1) — self-fetches habits + categories, renders cards from the
 * slice, shows the empty state when none, sorts via the shared viewFilters slice,
 * and deletes (Alert confirm → deleteHabit → refetch). Boundary mocked = @beyou/api
 * HttpClient + expo-router + notify + RN Alert.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
}));

import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { setOfflineStore } from '../src/offline/mutations';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import HabitsScreen from '../app/(app)/habits';

const habit = {
  id: 'h1',
  name: 'Read',
  description: 'books',
  iconId: 'lucide:book',
  categories: [{ id: 'c1', name: 'Health', iconId: 'lucide:heart' }],
  importance: 3,
  dificulty: 2,
  xp: 50,
  level: 2,
  actualLevelXp: 0,
  nextLevelXp: 100,
  constance: 4,
};

let del: jest.Mock;
function setHttp(habits: unknown[]) {
  const get = async (url: string) => (url === '/habit' ? { data: habits } : { data: [] });
  del = jest.fn(async () => ({ data: { success: true } }));
  setHttpClient({ get, post: get, put: get, delete: del } as never);
  setLogger({ error: () => {} });
}

// The screen's delete handler now routes through the offline ops layer, which
// reads connectivity off a store configured via setOfflineStore (a separate
// seam from the Provider store the component reads/dispatches through) — wire
// both to the SAME store so this stays the unchanged online path (default
// connectivity.isOnline is null, which isOffline() treats as online).
const renderScreen = () => {
  const store = makeStore();
  setOfflineStore(store);
  return render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <HabitsScreen />
      </BeyouThemeProvider>
    </Provider>,
  );
};

describe('HabitsScreen', () => {
  it('renders fetched habits as cards + a sort control', async () => {
    setHttp([habit]);
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('habit-card-h1')).toBeTruthy());
    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByTestId('habits-sort')).toBeTruthy();
  });

  it('shows the empty state when there are no habits', async () => {
    setHttp([]);
    await renderScreen();
    await waitFor(() => expect(screen.getByText('No habits yet')).toBeTruthy());
    expect(screen.getByTestId('empty-create-habit')).toBeTruthy();
    expect(screen.queryByTestId('habits-sort')).toBeNull();
  });

  it('deletes a habit after Alert confirmation', async () => {
    setHttp([habit]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      (buttons ?? []).find((b) => b.style === 'destructive')?.onPress?.();
    });
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('habit-card-h1')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-card-h1')); // expand
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-delete-h1'));
    });

    await waitFor(() => expect(del).toHaveBeenCalledWith('/habit/h1'));
    alertSpy.mockRestore();
  });
});
