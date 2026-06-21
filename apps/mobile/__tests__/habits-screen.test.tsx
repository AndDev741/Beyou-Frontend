/**
 * Habits screen (P6-B1) — self-fetches habits + categories, renders cards from the
 * slice, shows the empty state when none. Boundary mocked = @beyou/api HttpClient +
 * expo-router + notify.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
}));

import { Provider } from 'react-redux';
import { render, screen, waitFor } from '@testing-library/react-native';
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

function setGet(habits: unknown[]) {
  const get = async (url: string) => (url === '/habit' ? { data: habits } : { data: [] });
  setHttpClient({ get, post: get, put: get, delete: get } as never);
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
  it('renders fetched habits as cards', async () => {
    setGet([habit]);
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('habit-card-h1')).toBeTruthy());
    expect(screen.getByText('Read')).toBeTruthy();
  });

  it('shows the empty state when there are no habits', async () => {
    setGet([]);
    await renderScreen();
    await waitFor(() => expect(screen.getByText('No habits yet')).toBeTruthy());
    expect(screen.getByTestId('empty-create-habit')).toBeTruthy();
  });
});
