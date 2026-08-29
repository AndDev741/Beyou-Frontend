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

// The `mock` prefix is required: jest refuses out-of-scope variables inside a mock factory
// unless the name is prefixed that way.
// Typed with a rest parameter, not bare `jest.fn()`: without it tsc rejects the spread in the
// factory below and rejects reading `mock.calls[0][0]` in the assertions. Jest does not
// typecheck, so only the root `npm run typecheck` catches it.
const mockActivateKeepAwake = jest.fn((..._args: unknown[]) => Promise.resolve());
const mockDeactivateKeepAwake = jest.fn((..._args: unknown[]) => undefined);
jest.mock('@beyou/api/focus/focusApi', () => ({
  listFocusMicroTasks: jest.fn(() => Promise.resolve({ success: [] })),
  addFocusMicroTask: jest.fn(),
  toggleFocusMicroTask: jest.fn(),
  pinFocusMicroTask: jest.fn(),
  deleteFocusMicroTask: jest.fn(),
  recordFocusCycle: jest.fn(() => Promise.resolve({ success: {} })),
  getFocusDay: jest.fn(),
}));

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
import { recordFocusCycle } from '@beyou/api/focus/focusApi';
import Pomodoro from '../src/focus/Pomodoro';
import PomodoroOwner from '../src/focus/PomodoroOwner';

const DATE = '2026-08-28';

const item = (startTime?: string, endTime?: string, groupId = 'hg1'): FocusItem =>
  ({ groupId, type: 'habit', itemId: 'h1', sectionName: 'Morning', startTime, endTime } as FocusItem);

const renderPomodoro = async (focusItem: FocusItem, store = makeStore()) => {
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          {/* As in production: the owner rides the root layout and is the only thing that
              finishes a cycle or arms the notification. The panel alone would never hand over. */}
          <PomodoroOwner />
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

  it("the item's window does NOT override the configured length", async () => {
    // The bug this pins, reported from real use: "the short and long break change but the
    // pomodoro is stuck at 15". `suggestSlots` hands out 15-minute slices, so nearly every item
    // built through the routine form carries a 15-minute window, and reading it as the
    // pomodoro's length made the Pomodoro field silently do nothing.
    await renderPomodoro(item('07:00', '07:15'));

    expect(screen.getByTestId('focus-pomodoro-remaining')).toHaveTextContent('25:00');
  });

  it("the item's window is offered as one tap, and applying it changes the setting", async () => {
    const store = await renderPomodoro(item('07:00', '07:45'));
    await press('focus-pomodoro-settings-toggle');

    await press('focus-use-item-window');

    expect(store.getState().focus.settings.pomodoro).toBe(45);
    expect(screen.getByTestId('focus-pomodoro-remaining')).toHaveTextContent('45:00');
    // Offered only while it would change something.
    expect(screen.queryByTestId('focus-use-item-window')).toBeNull();
  });

  it('a break ignores the window entirely', async () => {
    await renderPomodoro(item('07:00', '08:30'));

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
      rounds: 1,
      finished: true,
    });
    // Waiting, not already running: nobody is pushed into a break they did not ask for.
    expect(screen.getByTestId('focus-pomodoro-next')).toBeTruthy();
  });

  it("a finished cycle is reported to the server, from the timer's own fields", async () => {
    await renderPomodoro(item('07:00', '07:25', 'hg1'));
    const startedAt = Date.now();
    await press('focus-pomodoro-start');

    await jump(25 * 60_000);

    expect(recordFocusCycle).toHaveBeenCalledTimes(1);
    expect(recordFocusCycle).toHaveBeenCalledWith(
      {
        itemGroupId: 'hg1',
        kind: 'POMODORO',
        startedAt: new Date(startedAt).toISOString(),
        endedAt: new Date(startedAt + 25 * 60_000).toISOString(),
        minutes: 25,
      },
      expect.anything(),
    );
  });

  it('an abandoned cycle is never reported', async () => {
    await renderPomodoro(item());
    await press('focus-pomodoro-start');
    await jump(60_000);

    await press('focus-pomodoro-stop');

    expect(recordFocusCycle).not.toHaveBeenCalled();
  });

  it('skipping hands over without counting it or reporting it', async () => {
    const store = await renderPomodoro(item());
    await press('focus-pomodoro-start');
    await jump(60_000);

    await press('focus-pomodoro-skip');

    expect(store.getState().focus.timer).toMatchObject({
      kind: 'shortBreak',
      rounds: 1,
      finished: true,
    });
    expect(recordFocusCycle).not.toHaveBeenCalled();
    expect(screen.getByTestId('focus-pomodoro-next')).toBeTruthy();
  });

  it('shows the next cycle on the clock and its number, not a dead zero and a stuck #1', async () => {
    // Both halves of the same report: skipping parked the break at 00:00, and the line under it
    // stayed on #1 however many times you skipped. This suite renders real translations, so the
    // number can be read off the screen.
    await renderPomodoro(item());
    await press('focus-pomodoro-start');
    await jump(60_000);

    await press('focus-pomodoro-skip');

    expect(screen.getByTestId('focus-pomodoro-remaining').props.children).toBe('05:00');
    expect(screen.getByTestId('focus-pomodoro-number').props.children).toBe('#2');
  });

  it('offers the skip while a cycle runs or is held, and nowhere else', async () => {
    await renderPomodoro(item());
    expect(screen.queryByTestId('focus-pomodoro-skip')).toBeNull();

    await press('focus-pomodoro-start');
    expect(screen.getByTestId('focus-pomodoro-skip')).toBeTruthy();

    await press('focus-pomodoro-pause');
    expect(screen.getByTestId('focus-pomodoro-skip')).toBeTruthy();

    await press('focus-pomodoro-resume');
    await jump(25 * 60_000);
    // Finished already offers the next cycle; a skip would say the same thing twice.
    expect(screen.queryByTestId('focus-pomodoro-skip')).toBeNull();
  });

  it('takes the notification back when a cycle is skipped', async () => {
    await renderPomodoro(item());
    await press('focus-pomodoro-start');
    mockCancelNotification.mockClear();

    await press('focus-pomodoro-skip');

    expect(mockCancelNotification).toHaveBeenCalled();
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
