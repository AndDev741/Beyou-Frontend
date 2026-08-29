/**
 * Rest mode (F5) on native.
 *
 * What only this side can check: that the screen is held awake for as long as rest is on and let
 * go on the way out, and that reduced motion is respected rather than merely mentioned.
 *
 * Note this suite asserts TRANSLATED text, not i18n keys: it imports `../src/i18n`.
 */
// The test binary has no native modules at all; pretend they are present so the mocked
// packages below are actually reached.
jest.mock('../src/focus/nativeModule', () => ({ hasNativeModule: () => true }));

jest.mock('react-native-toast-message', () => {
  const S = () => null;
  (S as unknown as { show: unknown }).show = jest.fn();
  (S as unknown as { hide: unknown }).hide = jest.fn();
  return { __esModule: true, default: S };
});

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

const mockActivateKeepAwake = jest.fn((..._a: unknown[]) => Promise.resolve());
const mockDeactivateKeepAwake = jest.fn((..._a: unknown[]) => undefined);
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: (...a: unknown[]) => mockActivateKeepAwake(...a),
  deactivateKeepAwake: (...a: unknown[]) => mockDeactivateKeepAwake(...a),
}));

/**
 * Reanimated is NOT re-mocked here, and deliberately not `requireActual`'d either: that pulls the
 * real index, which initialises worklets and throws under jest (see AGENTS.md). The global no-op
 * mock in `jest.setup.js` is what this suite runs against.
 *
 * Which is also why there is no reduced-motion test below. Under a no-op `withRepeat`/`withTiming`
 * the branch is unobservable — a test for it would pass with the branch deleted, so it would be
 * decoration. `useReducedMotion` is honoured in the component and only a real device shows it.
 */

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { enterTodayRoutine } from '@beyou/state/routine/todayRoutineSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import Descanso from '../src/focus/Descanso';

const routineWithNoon = {
  id: 'r1',
  name: 'Day',
  iconId: '',
  routineSections: [
    {
      id: 's1', name: 'Noon', iconId: '', startTime: '12:00', endTime: '13:00', order: 0,
      taskGroup: [],
      habitGroup: [{ id: 'hg1', habitId: 'h1', startTime: '12:00', endTime: '13:00', habitGroupChecks: [] }],
    },
  ],
};

const renderRest = async (store = makeStore()) => {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <Descanso />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  return result;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 7, 28, 9, 5, 0));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the clock', () => {
  it('shows the wall clock, zero-padded', async () => {
    await renderRest();

    expect(screen.getByTestId('focus-descanso-clock')).toHaveTextContent('09:05');
  });

  it('ticks on the minute boundary, not every second', async () => {
    await renderRest();

    await act(async () => {
      jest.setSystemTime(new Date(2026, 7, 28, 9, 5, 30));
      jest.advanceTimersByTime(30_000);
    });
    expect(screen.getByTestId('focus-descanso-clock')).toHaveTextContent('09:05');

    await act(async () => {
      jest.setSystemTime(new Date(2026, 7, 28, 9, 6, 0));
      jest.advanceTimersByTime(30_000);
    });
    expect(screen.getByTestId('focus-descanso-clock')).toHaveTextContent('09:06');
  });
});

describe('what it says about the day', () => {
  it('names what comes next, and when', async () => {
    const store = makeStore();
    store.dispatch(enterHabits([{ id: 'h1', name: 'Read', iconId: '' }] as never));
    store.dispatch(enterTodayRoutine(routineWithNoon as never));

    await renderRest(store);

    // Both parts: the name proves the lookup, the time proves the window is read.
    expect(screen.getByTestId('focus-descanso-next')).toHaveTextContent(/Read/);
    expect(screen.getByTestId('focus-descanso-next')).toHaveTextContent(/12:00/);
  });

  it('works with no routine at all, and says so', async () => {
    // Offered with or without a routine, on the user's instruction.
    await renderRest();

    expect(screen.getByTestId('focus-descanso')).toBeTruthy();
    expect(screen.getByTestId('focus-descanso-empty')).toBeTruthy();
  });
});

describe('dimming', () => {
  it('fades down after a quiet spell, and a touch brings it back', async () => {
    await renderRest();
    expect(screen.queryByTestId('focus-descanso-hint')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(26_000);
    });
    expect(screen.getByTestId('focus-descanso-hint')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('focus-descanso'));
    });
    expect(screen.queryByTestId('focus-descanso-hint')).toBeNull();
  });
});

describe('what only native can do', () => {
  it('holds the screen awake, and lets go on the way out', async () => {
    const { unmount } = await renderRest();

    expect(mockActivateKeepAwake).toHaveBeenCalledWith('beyou-focus-rest');

    await act(async () => {
      unmount();
    });
    expect(mockDeactivateKeepAwake).toHaveBeenCalledWith('beyou-focus-rest');
  });

  it('renders exactly the same when keep-awake is refused', async () => {
    mockActivateKeepAwake.mockRejectedValueOnce(new Error('unsupported'));

    await renderRest();

    expect(screen.getByTestId('focus-descanso-clock')).toBeTruthy();
  });
});
