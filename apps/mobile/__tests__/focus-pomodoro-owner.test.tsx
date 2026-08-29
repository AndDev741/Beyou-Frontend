/**
 * The completion owner on native, with NO panel mounted — the case that used to be broken.
 *
 * `usePomodoro` used to own both the completion and the scheduled notification, and it mounts only
 * inside the Ultrafoco panel. Toggle to "whole routine" or leave the screen and a cycle that ran
 * out was never reported; worse, the panel's cleanup CANCELLED the notification on unmount, so
 * leaving the screen took back the one alert that exists for when the screen is not in front of
 * you. The owner rides the root layout instead.
 */
// The test binary has no native modules at all; pretend they are present so the mocked
// packages below are actually reached.
jest.mock('../src/focus/nativeModule', () => ({ hasNativeModule: () => true }));

jest.mock('react-native-toast-message', () => {
  const S = () => null;
  (S as unknown as { show: unknown }).show = jest.fn();
  return { __esModule: true, default: S };
});

jest.mock('@beyou/api/focus/focusApi', () => ({
  recordFocusCycle: jest.fn(() => Promise.resolve({ success: {} })),
}));

// A schedule call whose answer WE release, so the arm/cancel race can be driven by hand.
let releaseSchedule: (() => void) | null = null;
const mockScheduleNotification = jest.fn(
  (..._args: unknown[]) =>
    new Promise<string>((resolve) => {
      releaseSchedule = () => resolve('notif-1');
    }),
);
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
import { render, act } from '@testing-library/react-native';
import { pomodoroAbandoned, pomodoroStarted } from '@beyou/state';
import '../src/i18n';
import { makeStore } from '../src/store';
import { recordFocusCycle } from '@beyou/api/focus/focusApi';
import PomodoroOwner from '../src/focus/PomodoroOwner';

const DATE = '2026-08-28';

const renderOwner = async (store = makeStore()) => {
  await act(async () => {
    render(
      <Provider store={store}>
        <PomodoroOwner />
      </Provider>,
    );
  });
  return store;
};

const startCycle = async (store: ReturnType<typeof makeStore>) => {
  await act(async () => {
    store.dispatch(
      pomodoroStarted({ groupId: 'hg1', kind: 'pomodoro', minutes: 25, now: Date.now(), date: DATE }),
    );
  });
};

const jump = async (ms: number) => {
  jest.setSystemTime(new Date(Date.now() + Math.max(0, ms - 1_000)));
  await act(async () => {
    jest.advanceTimersByTime(1_000);
  });
};

/** Let the arm's own awaits (permission, channel) run up to the schedule call. */
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  releaseSchedule = null;
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 7, 28, 10, 0, 0));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('PomodoroOwner (native)', () => {
  it('finishes and reports a cycle with no panel on screen', async () => {
    const store = await renderOwner();
    await startCycle(store);
    await flush();
    await act(async () => releaseSchedule?.());

    await jump(25 * 60_000);

    expect(recordFocusCycle).toHaveBeenCalledTimes(1);
    expect(store.getState().focus.timer).toMatchObject({ kind: 'shortBreak', finished: true, rounds: 1 });
  });

  it('arms the notification on the reducer\'s endsAt and keeps it armed while the panel is gone', async () => {
    const store = await renderOwner();
    await startCycle(store);
    await flush();
    await act(async () => releaseSchedule?.());

    expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
    // Nothing has cancelled it: there is no panel here to unmount, and the owner never unmounts.
    expect(mockCancelNotification).not.toHaveBeenCalled();
  });

  it('a stop that lands before the OS has answered the arm still takes the alert back', async () => {
    // The race: arm only learns the id once the OS answers, and a cancel that ran in between used
    // to find an empty list. Start and stop a pomodoro at once and the alert fired 25 minutes
    // later anyway. Cancel now waits for the pending arm.
    const store = await renderOwner();
    await startCycle(store);
    await flush();
    expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
    expect(releaseSchedule).not.toBeNull();
    // `notifyCycleEnd` keeps module-level state, and arm begins by cancelling whatever an earlier
    // test left armed. Only cancels from here on are about THIS cycle.
    mockCancelNotification.mockClear();

    // Stop BEFORE releasing the schedule promise.
    await act(async () => {
      store.dispatch(pomodoroAbandoned());
    });
    await flush();
    expect(mockCancelNotification).not.toHaveBeenCalledWith('notif-1');

    await act(async () => releaseSchedule?.());
    await flush();

    expect(mockCancelNotification).toHaveBeenCalledWith('notif-1');
  });
});
