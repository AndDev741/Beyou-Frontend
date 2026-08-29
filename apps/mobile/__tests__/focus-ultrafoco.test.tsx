/**
 * Ultrafoco (F2) on native: the clock seeds which item opens, and then never overrules the
 * person. The off-schedule check is the assertion that protects the product decision.
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

jest.mock('@beyou/api/routine/checkItem', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/routine/skipItem', () => ({ __esModule: true, default: jest.fn() }));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import checkRoutine from '@beyou/api/routine/checkItem';
import skipRoutine from '@beyou/api/routine/skipItem';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { focusEntered, focusModeChanged, pomodoroStarted } from '@beyou/state';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import Ultrafoco from '../src/focus/Ultrafoco';

const habits = [
  { id: 'h1', name: 'Drink water', iconId: '' },
  { id: 'h2', name: 'Read', iconId: '' },
  { id: 'h3', name: 'Stretch', iconId: '' },
];

const dailyRoutine = {
  id: 'r1',
  name: 'Day',
  iconId: '',
  routineSections: [
    {
      id: 's1', name: 'Morning', iconId: '', startTime: '06:00', endTime: '07:00', order: 0,
      taskGroup: [],
      habitGroup: [{ id: 'hg1', habitId: 'h1', startTime: '06:00', endTime: '07:00', habitGroupChecks: [] }],
    },
    {
      id: 's2', name: 'Noon', iconId: '', startTime: '12:00', endTime: '13:00', order: 1,
      taskGroup: [],
      habitGroup: [{ id: 'hg2', habitId: 'h2', startTime: '12:00', endTime: '13:00', habitGroupChecks: [] }],
    },
    {
      id: 's3', name: 'Evening', iconId: '', startTime: '20:00', endTime: '21:00', order: 2,
      taskGroup: [],
      habitGroup: [{ id: 'hg3', habitId: 'h3', startTime: '20:00', endTime: '21:00', habitGroupChecks: [] }],
    },
  ],
};

const listRoutine = {
  id: 'r2',
  name: 'List',
  iconId: '',
  type: 'LIST',
  routineSections: [
    {
      id: 's1', name: 'List', iconId: '', startTime: '', endTime: '', order: 0,
      taskGroup: [],
      habitGroup: [
        { id: 'hg1', habitId: 'h1', startTime: '', habitGroupChecks: [] },
        { id: 'hg2', habitId: 'h2', startTime: '', habitGroupChecks: [] },
      ],
    },
  ],
  items: [
    { id: 'hg1', type: 'HABIT', habitId: 'h1', orderIndex: 0 },
    { id: 'hg2', type: 'HABIT', habitId: 'h2', orderIndex: 1 },
  ],
};

const seeded = () => {
  const store = makeStore();
  store.dispatch(enterHabits(habits as never));
  store.dispatch(focusModeChanged('ultrafoco'));
  return store;
};

/**
 * Freeze the wall clock, so the resolver's answer is not a function of when CI runs.
 *
 * Note this suite asserts TRANSLATED text, not i18n keys: it imports `../src/i18n`, which loads
 * the real English bundle. The web suite renders keys, so the same assertions read differently
 * there.
 */
const atClock = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  jest.setSystemTime(new Date(2026, 7, 28, h, m, 0));
};

/**
 * Renders inside act, and hands back the store.
 *
 * Only the store, not the render result spread alongside it: the assertions all go through
 * the global `screen`, and spreading the result made the returned type lose `store` under tsc
 * while jest stayed green. Jest does not typecheck (see AGENTS.md), so the root `npm run
 * typecheck` is the only thing that catches it.
 */
const renderUltra = async (routine: unknown, store = seeded()) => {
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <Ultrafoco routine={routine as never} />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  return store;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  (checkRoutine as jest.Mock).mockResolvedValue({ success: {} });
  (skipRoutine as jest.Mock).mockResolvedValue({ success: {} });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ultrafoco opens where the clock points', () => {
  it('inside a window, on that item', async () => {
    atClock('12:30');
    await renderUltra(dailyRoutine);

    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByTestId('focus-ultra-reason')).toHaveTextContent('Now');
  });

  it('late at night, on the evening rather than the morning, with no reprimand', async () => {
    atClock('23:30');
    await renderUltra(dailyRoutine);

    expect(screen.getByText('Stretch')).toBeTruthy();
    // "Still open", never "overdue": the gamification is not allowed to scold.
    expect(screen.getByTestId('focus-ultra-reason')).toHaveTextContent('Still open');
  });
});

describe('the clock never overrules the person', () => {
  it('an item whose window has NOT arrived can be checked right now', async () => {
    // The freedom rule at its sharpest. Nothing about the evening item is disabled at half
    // past noon, and no warning appears.
    atClock('12:30');
    await renderUltra(dailyRoutine);

    await act(async () => {
      fireEvent.press(screen.getByTestId('focus-ultra-next'));
    });
    expect(screen.getByText('Stretch')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('focus-ultra-check'));
    });

    expect(checkRoutine).toHaveBeenCalledWith(
      expect.objectContaining({
        routineId: 'r1',
        habitGroupDTO: expect.objectContaining({ habitGroupId: 'hg3' }),
      }),
      expect.anything(),
    );
  });

  it('the clock moving on does not move a hand-picked item', async () => {
    atClock('11:59');
    const store = await renderUltra(dailyRoutine);
    expect(screen.getByText('Read')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('focus-ultra-prev'));
    });
    expect(screen.getByText('Drink water')).toBeTruthy();

    // Jumped to the evening so the resolver's ANSWER changes, not merely its badge: at 12:01
    // it would still return the noon item and nothing would be re-offered.
    atClock('20:30');
    await act(async () => {
      jest.advanceTimersByTime(31_000);
    });

    expect(screen.getByText('Drink water')).toBeTruthy();
    expect(store.getState().focus.selectedIndex).toBe(0);
    expect(screen.getByTestId('focus-ultra-reason')).toHaveTextContent('Now');
  });

  it('the picker jumps straight to any item of the day', async () => {
    atClock('23:30');
    await renderUltra(dailyRoutine);
    expect(screen.getByText('Stretch')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('focus-ultra-picker-toggle'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('focus-ultra-pick-hg1'));
    });

    expect(screen.getByText('Drink water')).toBeTruthy();
  });
});

describe('a LIST routine is the normal case, not a special case', () => {
  it('opens on the first item at any hour, with no invented time', async () => {
    atClock('23:30');
    await renderUltra(listRoutine);

    expect(screen.getByText('Drink water')).toBeTruthy();
    expect(screen.getByTestId('focus-ultra-window')).toHaveTextContent('Any time');
    expect(screen.getByTestId('focus-ultra-reason')).toHaveTextContent('Your order');
  });
});

describe('ultrafoco edge states', () => {
  it('a routine with no items says so instead of rendering a blank card', async () => {
    await renderUltra({ id: 'r3', name: 'Empty', iconId: '', routineSections: [] });

    expect(screen.getByTestId('focus-ultra-empty')).toBeTruthy();
  });
});

describe('coming back to a running timer', () => {
  it("opens on the item the pomodoro is running on, not on the clock's pick", async () => {
    // Reported: tapping the running-timer hub landed on the default view with the clock choosing
    // "now" (Read, at 12:30), while the pomodoro kept counting on Stretch. `focusEntered` now
    // hands the timer's item to the selection hook, which selects it as a manual choice.
    atClock('12:30');
    const store = seeded();
    store.dispatch(
      pomodoroStarted({ groupId: 'hg3', kind: 'pomodoro', minutes: 25, now: Date.now(), date: '2026-08-28' }),
    );
    store.dispatch(focusEntered('2026-08-28'));

    await renderUltra(dailyRoutine, store);

    expect(screen.getByText('Stretch')).toBeTruthy();
    expect(screen.queryByText('Read')).toBeNull();
    expect(store.getState().focus.manuallySelected).toBe(true);
    expect(store.getState().focus.returnToGroupId).toBeNull();
  });
});
