/**
 * Dashboard home integration (regression for the "nothing shows" bug): AppHome
 * must actually CALL useDashboardData so the fetched profile/routine hydrate the
 * shared slices and render. Boundary mocked = the @beyou/api HttpClient.
 */
jest.mock('react-native-toast-message', () => {
  const S = () => null;
  (S as unknown as { show: unknown }).show = jest.fn();
  (S as unknown as { hide: unknown }).hide = jest.fn();
  return { __esModule: true, default: S };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
}));

import { Provider } from 'react-redux';
import { render, screen, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AppHome from '../app/(app)/index';

const user = {
  name: 'Alice',
  xp: 100,
  level: 3,
  constance: 7,
  widgetsId: [],
  actualLevelXp: 0,
  nextLevelXp: 200,
};

beforeEach(() => {
  const get = async (url: string) => {
    if (url === '/user') return { data: user };
    if (url === '/routine/today') return { data: null };
    return { data: [] };
  };
  const noop = async () => ({ data: null });
  setHttpClient({ get, post: noop, put: noop, delete: noop } as never);
  setLogger({ error: () => {} });
});

describe('AppHome (dashboard)', () => {
  it('loads the profile and renders the name + level + streak', async () => {
    const store = makeStore();
    await render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <AppHome />
        </BeyouThemeProvider>
      </Provider>,
    );

    await waitFor(() => expect(screen.getByTestId('dashboard-greeting').props.children).toContain('Alice'));
    expect(store.getState().perfil.username).toBe('Alice');
    expect(screen.getByTestId('level-ring')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy(); // level in the ring
    expect(screen.getByText('7')).toBeTruthy(); // streak
  });
});
