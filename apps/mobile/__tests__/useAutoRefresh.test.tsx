/**
 * The screen that was right when it loaded and has been wrong ever since.
 *
 * Two ways to get there on a phone, and they need different answers. The app going to
 * the background and coming back is AppState. Walking to another screen and back is
 * NOT a remount: navigation is a Stack driven by router.push, so this screen stays
 * mounted underneath and its load effect never runs again. And over both of them sits
 * the day turning over, which is the case that started this: tick off the day's
 * routine, sleep, reopen the app, and yesterday is still there with every box checked.
 */
let focusCallback: (() => void | (() => void)) | null = null;

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    focusCallback = callback;
  },
}));

import { AppState } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { useAutoRefresh } from '../src/hooks/useAutoRefresh';

type Options = Parameters<typeof useAutoRefresh>[1];

function Probe({ refresh, options }: { refresh: () => Promise<unknown>; options?: Options }) {
  useAutoRefresh(refresh, options);
  return null;
}

let appStateHandler: ((state: string) => void) | null = null;

const mountProbe = async (refresh: jest.Mock, options?: Options) => {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(<Probe refresh={refresh} options={options} />);
  });
  // The screen's own load effect has just run, so the hook skips its first focus.
  await focus();
  return result;
};

/** Entering the screen. Called once on mount and again on every return to it. */
const focus = async () => {
  await act(async () => {
    const cleanup = focusCallback?.();
    if (typeof cleanup === 'function') {
      // Held for the caller to run on the way out.
      (focus as unknown as { cleanup?: () => void }).cleanup = cleanup;
    }
  });
};

const blur = async () => {
  await act(async () => {
    (focus as unknown as { cleanup?: () => void }).cleanup?.();
  });
};

const foreground = async (state = 'active') => {
  await act(async () => {
    appStateHandler?.(state);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  focusCallback = null;
  appStateHandler = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    handler: (state: string) => void,
  ) => {
    appStateHandler = handler;
    return { remove: jest.fn() };
  }) as never);
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('does not refresh on the first focus, where the screen just loaded', async () => {
  const refresh = jest.fn().mockResolvedValue(undefined);
  await mountProbe(refresh);

  expect(refresh).not.toHaveBeenCalled();
});

/**
 * Walking to Habits and back used to leave the dashboard showing whatever it had when
 * the app started. One device, nobody else involved.
 */
it('refreshes when the screen is returned to in the stack', async () => {
  const refresh = jest.fn().mockResolvedValue(undefined);
  await mountProbe(refresh);

  await blur();
  await focus();

  expect(refresh).toHaveBeenCalledWith('foreground');
});

it('refreshes when the app returns from the background', async () => {
  const refresh = jest.fn().mockResolvedValue(undefined);
  await mountProbe(refresh);

  await foreground('active');

  expect(refresh).toHaveBeenCalledWith('foreground');
});

it('ignores the app going to the background', async () => {
  const refresh = jest.fn().mockResolvedValue(undefined);
  await mountProbe(refresh);

  await foreground('background');

  expect(refresh).not.toHaveBeenCalled();
});

/** The reported bug, in one test. */
it('refreshes when the calendar day turns under an open screen', async () => {
  const refresh = jest.fn().mockResolvedValue(undefined);
  jest.setSystemTime(new Date(2026, 7, 15, 23, 59, 30));
  await mountProbe(refresh, { intervalMs: 0 });

  jest.setSystemTime(new Date(2026, 7, 16, 0, 0, 30));
  await act(async () => {
    jest.advanceTimersByTime(60_000);
  });

  expect(refresh).toHaveBeenCalledWith('dayChange');
});

it('asks once when the day turned while the app was away, not twice', async () => {
  const refresh = jest.fn().mockResolvedValue(undefined);
  jest.setSystemTime(new Date(2026, 7, 15, 23, 0));
  await mountProbe(refresh, { intervalMs: 0 });

  jest.setSystemTime(new Date(2026, 7, 16, 8, 0));
  await foreground('active');

  expect(refresh).toHaveBeenCalledTimes(1);
  expect(refresh).toHaveBeenCalledWith('dayChange');

  await act(async () => {
    jest.advanceTimersByTime(60_000);
  });
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('refreshes on its own once the interval has passed', async () => {
  const refresh = jest.fn().mockResolvedValue(undefined);
  jest.setSystemTime(new Date(2026, 7, 15, 10, 0));
  await mountProbe(refresh, { intervalMs: 5 * 60_000 });

  jest.setSystemTime(new Date(2026, 7, 15, 10, 2));
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(refresh).not.toHaveBeenCalled();

  jest.setSystemTime(new Date(2026, 7, 15, 10, 6));
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(refresh).toHaveBeenCalledWith('interval');
});

/** A screen buried in the stack must cost nothing. */
it('never fires while the screen is out of view', async () => {
  const refresh = jest.fn().mockResolvedValue(undefined);
  jest.setSystemTime(new Date(2026, 7, 15, 10, 0));
  await mountProbe(refresh, { intervalMs: 60_000 });

  await blur();
  jest.setSystemTime(new Date(2026, 7, 15, 12, 0));
  await act(async () => { jest.advanceTimersByTime(60_000); });

  expect(refresh).not.toHaveBeenCalled();
});

it('stays out of the way while the caller is busy', async () => {
  const refresh = jest.fn().mockResolvedValue(undefined);
  await mountProbe(refresh, { canRun: () => false });

  await foreground('active');

  expect(refresh).not.toHaveBeenCalled();
});

it('does nothing at all when disabled', async () => {
  const refresh = jest.fn().mockResolvedValue(undefined);
  jest.setSystemTime(new Date(2026, 7, 15, 10, 0));
  await mountProbe(refresh, { enabled: false, intervalMs: 60_000 });

  await foreground('active');
  jest.setSystemTime(new Date(2026, 7, 15, 11, 0));
  await act(async () => { jest.advanceTimersByTime(60_000); });

  expect(refresh).not.toHaveBeenCalled();
});
