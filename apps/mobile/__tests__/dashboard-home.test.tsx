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

// Capture the focus callback so a test can simulate returning to the dashboard.
let mockFocusCb: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
  useFocusEffect: (cb: () => void) => { mockFocusCb = cb; },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
}));

import { Provider } from 'react-redux';
import { render, screen, waitFor, act } from '@testing-library/react-native';
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

  it("refetches today's routine when the dashboard regains focus", async () => {
    const get = jest.fn(async (url: string) => {
      if (url === '/user') return { data: user };
      if (url === '/routine/today') return { data: null };
      return { data: [] };
    });
    setHttpClient({ get, post: async () => ({ data: null }), put: async () => ({ data: null }), delete: async () => ({ data: null }) } as never);

    await render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <AppHome />
        </BeyouThemeProvider>
      </Provider>,
    );

    const todayCalls = () => get.mock.calls.filter((c) => c[0] === '/routine/today').length;
    await waitFor(() => expect(todayCalls()).toBe(1)); // mount load
    const afterMount = todayCalls();

    // First focus is skipped (mount already loaded); the second simulates returning.
    await act(async () => { mockFocusCb?.(); });
    expect(todayCalls()).toBe(afterMount); // skipped
    await act(async () => { mockFocusCb?.(); });
    await waitFor(() => expect(todayCalls()).toBeGreaterThan(afterMount)); // refetched
  });
});
