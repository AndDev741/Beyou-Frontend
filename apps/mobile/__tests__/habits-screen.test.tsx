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

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
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

const renderScreen = () =>
  render(
    <Provider store={makeStore()}>
      <BeyouThemeProvider>
        <HabitsScreen />
      </BeyouThemeProvider>
    </Provider>,
  );

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

  it('deletes a habit from the shared delete modal', async () => {
    setHttp([habit]);
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('habit-card-h1')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-delete-h1'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-modal-confirm'));
    });

    await waitFor(() => expect(del).toHaveBeenCalledWith('/habit/h1'));
  });
});

/**
 * Busca e filtros seguem o mesmo desenho da web: a busca ocupa a linha e os
 * two selects drop to the line below. With no result, the empty state is the ghost
 * with "clear filters" — there is nothing to create there.
 */
describe('HabitsScreen search and filters', () => {
  const other = { ...habit, id: 'h2', name: 'Swim', description: 'pool' };

  it('narrows the list by the search term', async () => {
    setHttp([habit, other]);
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('habit-card-h1')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('habits-toolbar-search'), 'swim');
    });

    expect(screen.queryByTestId('habit-card-h1')).toBeNull();
    expect(screen.getByTestId('habit-card-h2')).toBeTruthy();
  });

  it('offers the ghost empty state and clears the filters from it', async () => {
    setHttp([habit]);
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('habit-card-h1')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('habits-toolbar-search'), 'zzz');
    });
    expect(screen.getByTestId('habits-no-results')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('habits-no-results-action'));
    });

    expect(screen.queryByTestId('habits-no-results')).toBeNull();
    expect(screen.getByTestId('habit-card-h1')).toBeTruthy();
  });

  it('filters by category through the select sheet', async () => {
    const otherCategory = {
      ...habit,
      id: 'h3',
      name: 'Study',
      categories: [{ id: 'c2', name: 'Mind', iconId: 'lucide:brain' }],
    };
    // The filter only lists categories SOME habit uses, and it crosses them with
    // the categories slice — which has to come from the endpoint.
    const categories = [
      { id: 'c1', name: 'Health', iconId: 'lucide:heart' },
      { id: 'c2', name: 'Mind', iconId: 'lucide:brain' },
    ];
    const get = async (url: string) =>
      url === '/habit' ? { data: [habit, otherCategory] } : { data: categories };
    setHttpClient({ get, post: get, put: get, delete: get } as never);
    setLogger({ error: () => {} });
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('habit-card-h1')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('habits-category-filter'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('habits-category-filter-option-c2'));
    });

    expect(screen.queryByTestId('habit-card-h1')).toBeNull();
    expect(screen.getByTestId('habit-card-h3')).toBeTruthy();
  });
});
