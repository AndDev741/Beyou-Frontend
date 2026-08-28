/**
 * The floating "a cycle is still running" hub, on native.
 *
 * Note this suite asserts TRANSLATED text, not i18n keys: it imports `../src/i18n`.
 */
jest.mock('react-native-toast-message', () => {
  const S = () => null;
  (S as unknown as { show: unknown }).show = jest.fn();
  (S as unknown as { hide: unknown }).hide = jest.fn();
  return { __esModule: true, default: S };
});

const mockPush = jest.fn();
let mockPathname = '/dashboard';
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  usePathname: () => mockPathname,
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { pomodoroPaused, pomodoroStarted } from '@beyou/state';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RunningTimerHub from '../src/focus/RunningTimerHub';

const NOW = new Date(2026, 7, 28, 10, 0, 0);
const DATE = '2026-08-28';

const storeWithCycle = (paused = false) => {
  const store = makeStore();
  store.dispatch(
    pomodoroStarted({
      groupId: 'hg1',
      kind: 'pomodoro',
      minutes: 25,
      now: NOW.getTime(),
      date: DATE,
    }),
  );
  if (paused) store.dispatch(pomodoroPaused({ now: NOW.getTime() + 60_000 }));
  return store;
};

const renderHub = async (store = makeStore()) => {
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <RunningTimerHub />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  return store;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = '/dashboard';
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('when a cycle is live', () => {
  it('shows the remaining time and what kind it is', async () => {
    await renderHub(storeWithCycle());

    expect(screen.getByTestId('focus-running-hub-remaining')).toHaveTextContent('25:00');
    expect(screen.getByTestId('focus-running-hub-kind')).toHaveTextContent('Pomodoro');
  });

  it('routes back to where the timer lives', async () => {
    await renderHub(storeWithCycle());

    await act(async () => {
      fireEvent.press(screen.getByTestId('focus-running-hub'));
    });

    expect(mockPush).toHaveBeenCalledWith('/focus');
  });

  it('says paused, and shows the frozen number', async () => {
    await renderHub(storeWithCycle(true));

    expect(screen.getByTestId('focus-running-hub-kind')).toHaveTextContent('Pause');
    expect(screen.getByTestId('focus-running-hub-remaining')).toHaveTextContent('24:00');
  });

  it('counts down while it runs', async () => {
    await renderHub(storeWithCycle());

    await act(async () => {
      // 60s here plus the second the tick itself burns: advanceTimersByTime moves Date.now() too.
      jest.setSystemTime(new Date(NOW.getTime() + 60_000));
      jest.advanceTimersByTime(1_000);
    });

    expect(screen.getByTestId('focus-running-hub-remaining')).toHaveTextContent('23:59');
  });
});

describe('when it should stay out of the way', () => {
  it('renders nothing with no cycle at all', async () => {
    await renderHub();

    expect(screen.queryByTestId('focus-running-hub')).toBeNull();
  });

  it('renders nothing on the focus screen itself', async () => {
    // The screen lives outside the (app) group so this layout does not render there, but the guard
    // means moving it back in cannot resurrect a hub on top of the real panel.
    mockPathname = '/focus';

    await renderHub(storeWithCycle());

    expect(screen.queryByTestId('focus-running-hub')).toBeNull();
  });

  it('renders nothing once the cycle has run out, and dispatches nothing', async () => {
    // An elapsed cycle is the focus screen's business: it has a handover to offer, and two
    // dispatchers would race over it.
    const store = await renderHub(storeWithCycle());

    await act(async () => {
      jest.setSystemTime(new Date(NOW.getTime() + 26 * 60_000));
      jest.advanceTimersByTime(1_000);
    });

    expect(screen.queryByTestId('focus-running-hub')).toBeNull();
    expect(store.getState().focus.timer?.finished).toBe(false);
    expect(store.getState().focus.timer?.kind).toBe('pomodoro');
  });
});
