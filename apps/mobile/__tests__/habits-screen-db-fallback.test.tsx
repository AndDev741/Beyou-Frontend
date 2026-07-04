/**
 * Habits screen — SQLite init failure fallback (review finding fix). When
 * getDb() rejects (disk full, corrupt DB, ...), load() must not hang: it falls
 * back to the plain network path so the spinner clears and data still renders.
 * Boundary mocked = ../src/offline/db (getDb rejects) + @beyou/api HttpClient +
 * expo-router + notify, modeled on habits-screen.test.tsx.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
}));

jest.mock('../src/offline/db', () => ({
  getDb: jest.fn(async () => {
    throw new Error('sqlite init failed');
  }),
  clearOfflineCache: jest.fn(),
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

function setHttp(habits: unknown[]) {
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

describe('HabitsScreen — DB fallback', () => {
  it('falls back to the network path and still renders when getDb() rejects', async () => {
    setHttp([habit]);
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('habit-card-h1')).toBeTruthy());
    expect(screen.getByText('Read')).toBeTruthy();
  });
});
