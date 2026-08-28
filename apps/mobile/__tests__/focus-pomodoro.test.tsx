/**
 * The pomodoro (F3) on native.
 *
 * Two things only this suite can check: that the screen is kept awake for exactly the length of
 * a cycle, and that a local notification is armed on the same `endsAt` the reducer holds. The
 * notification is what makes a native timer more than a screen — a JS interval stops dead when
 * the app is backgrounded, so without it the alert is silent exactly when it matters.
 *
 * Note this suite asserts TRANSLATED text, not i18n keys: it imports `../src/i18n`.
 */
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

// The `mock` prefix is required: jest refuses out-of-scope variables inside a mock factory
// unless the name is prefixed that way.
// Typed with a rest parameter, not bare `jest.fn()`: without it tsc rejects the spread in the
// factory below and rejects reading `mock.calls[0][0]` in the assertions. Jest does not
// typecheck, so only the root `npm run typecheck` catches it.
const mockActivateKeepAwake = jest.fn((..._args: unknown[]) => Promise.resolve());
const mockDeactivateKeepAwake = jest.fn((..._args: unknown[]) => undefined);
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: (...a: unknown[]) => mockActivateKeepAwake(...a),
  deactivateKeepAwake: (...a: unknown[]) => mockDeactivateKeepAwake(...a),
}));

const mockScheduleNotification = jest.fn((..._args: unknown[]) => Promise.resolve('notif-1'));
const mockCancelNotification = jest.fn((..._args: unknown[]) => Promise.resolve());
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => Promise.resolve({ granted: true, canAskAgain: true }),
  requestPermissionsAsync: () => Promise.resolve({ granted: true }),
  setNotificationChannelAsync: () => Promise.resolve(),
  scheduleNotificationAsync: (...a: unknown[]) => mockScheduleNotification(...a),
  cancelScheduledNotificationAsync: (...a: unknown[]) => mockCancelNotification(...a),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import type { FocusItem } from '@beyou/state';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import Pomodoro from '../src/focus/Pomodoro';

const DATE = '2026-08-28';

const item = (startTime?: string, endTime?: string, groupId = 'hg1'): FocusItem =>
  ({ groupId, type: 'habit', itemId: 'h1', sectionName: 'Morning', startTime, endTime } as FocusItem);

const renderPomodoro = async (focusItem: FocusItem, store = makeStore()) => {
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <Pomodoro item={focusItem} date={DATE} />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  return store;
};

const press = async (testID: string) => {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
};

/**
 * Jump the clock, then let ONE interval fire.
 *
 * Not `advanceTimersByTime(ms)`: the hook re-renders every second, so walking 25 minutes fires it
 * 1500 times for one assertion. `setSystemTime` moves the clock without firing anything, so one
 * tick afterwards reads the new value, and it is closer to the real case anyway: an app that was
 * suspended and then resumed.
 */
const jump = async (ms: number) => {
  // The one second the tick itself burns is taken off the jump, so `jump(60_000)` really is a
  // minute of elapsed time and a call site can read the number it means.
  jest.setSystemTime(new Date(Date.now() + Math.max(0, ms - 1_000)));
  await act(async () => {
    jest.advanceTimersByTime(1_000);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 7, 28, 10, 0, 0));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the three cycles', () => {
  it('opens on Pomodoro, previewing the length it would run', async () => {
    await renderPomodoro(item());

    expect(screen.getByTestId('focus-pomodoro-remaining')).toHaveTextContent('25:00');
    expect(screen.getByTestId('focus-pomodoro-message')).toHaveTextContent('Time to focus!');
  });

  it("a pomodoro takes the item's own window; a break never does", async () => {
    // Routine items carry startTime and endTime, so a scheduled item already says how long its
    // owner meant it to take. A rest's length has nothing to do with that window.
    await renderPomodoro(item('07:00', '07:45'));
    expect(screen.getByTestId('focus-pomodoro-remaining')).toHaveTextContent('45:00');

    await press('focus-cycle-tab-shortBreak');
    expect(screen.getByTestId('focus-pomodoro-remaining')).toHaveTextContent('05:00');
    expect(screen.getByTestId('focus-pomodoro-message')).toHaveTextContent('Time for a break!');
  });

  it('the long break has its own length', async () => {
    await renderPomodoro(item());

    await press('focus-cycle-tab-longBreak');

    expect(screen.getByTestId('focus-pomodoro-remaining')).toHaveTextContent('15:00');
  });
});

describe('the settings', () => {
  it('every length is editable, and clamped', async () => {
    const store = await renderPomodoro(item());
    await press('focus-pomodoro-settings-toggle');

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('focus-setting-pomodoro'), '50');
    });
    expect(store.getState().focus.settings.pomodoro).toBe(50);

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('focus-setting-longBreak'), '999');
    });
    expect(store.getState().focus.settings.longBreak).toBe(180);
  });

  it('so is how often the long break comes round', async () => {
    const store = await renderPomodoro(item());
    await press('focus-pomodoro-settings-toggle');

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('focus-setting-longBreakEvery'), '2');
    });

    expect(store.getState().focus.settings.longBreakEvery).toBe(2);
  });
});

describe('running a cycle', () => {
  it('starts on an absolute end time and counts down from it', async () => {
    const store = await renderPomodoro(item());

    await press('focus-pomodoro-start');

    expect(screen.getByTestId('focus-pomodoro-remaining')).toHaveTextContent('25:00');
    expect(store.getState().focus.timer?.endsAt).toBe(Date.now() + 25 * 60_000);

    await jump(60_000);
    expect(screen.getByTestId('focus-pomodoro-remaining')).toHaveTextContent('24:00');
  });

  it('a long pause costs nothing', async () => {
    await renderPomodoro(item());
    await press('focus-pomodoro-start');

    await jump(60_000);
    await press('focus-pomodoro-pause');
    expect(screen.getByTestId('focus-pomodoro-remaining')).toHaveTextContent('24:00');

    await jump(20 * 60_000);
    await press('focus-pomodoro-resume');

    // 44:00 here was a real bug: resume recomputes endsAt from the clock, and the hook's `now`
    // was still pre-pause until the next tick.
    expect(screen.getByTestId('focus-pomodoro-remaining')).toHaveTextContent('24:00');
  });

  it('crossing zero hands over to the short break, waiting to be started', async () => {
    const store = await renderPomodoro(item());
    await press('focus-pomodoro-start');

    await jump(25 * 60_000);

    expect(store.getState().focus.timer).toMatchObject({
      kind: 'shortBreak',
      completedCycles: 1,
      finished: true,
    });
    // Waiting, not already running: nobody is pushed into a break they did not ask for.
    expect(screen.getByTestId('focus-pomodoro-next')).toBeTruthy();
  });

  it('never calls a finished cycle a failure', async () => {
    await renderPomodoro(item());
    await press('focus-pomodoro-start');
    await jump(25 * 60_000);

    expect(screen.getByTestId('focus-pomodoro-message')).not.toHaveTextContent(
      /fail|miss|expire|lost|overdue/i,
    );
  });
});

describe('what only native can do', () => {
  it('keeps the screen awake for the length of a cycle, and lets go when it stops', async () => {
    await renderPomodoro(item());

    await press('focus-pomodoro-start');
    expect(mockActivateKeepAwake).toHaveBeenCalledWith('beyou-focus');

    await press('focus-pomodoro-pause');
    expect(mockDeactivateKeepAwake).toHaveBeenCalledWith('beyou-focus');
  });

  it('arms a local notification on the SAME moment the reducer holds', async () => {
    // The countdown and the notification are one fact handed to two schedulers, which is why
    // the alert still lands after the OS suspends the app.
    const store = await renderPomodoro(item());

    await press('focus-pomodoro-start');

    const endsAt = store.getState().focus.timer!.endsAt;
    expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
    const [request] = mockScheduleNotification.mock.calls[0] as [
      { trigger: { seconds: number } },
    ];
    const trigger = request.trigger;
    expect(trigger.seconds).toBe(Math.round((endsAt - Date.now()) / 1000));
  });

  it('takes the notification back when the cycle stops', async () => {
    await renderPomodoro(item());
    await press('focus-pomodoro-start');
    mockCancelNotification.mockClear();

    await press('focus-pomodoro-stop');

    expect(mockCancelNotification).toHaveBeenCalled();
  });
});
