/**
 * The calendar screen on the phone (U4: R14–R17). The rules locked here are the ones that would
 * cost the most to get wrong quietly: each day shows the markers its overview row carries, the
 * week view splits a day into all-day and timed in time order, a `?date=` link opens on that day,
 * a missed task stays on its day as not done, and completing a task moves the XP through the
 * shared refresh path.
 *
 * Boundary mocked: the calendar API module, the view preference store, expo-router and notify.
 */
const mockPush = jest.fn();
let mockParams: { date?: string } = {};
let mockSavedView: 'month' | 'week' | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  // The real module's focus hook, as the other screen tests stub it.
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
}));
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('@beyou/api/calendar/calendarApi', () => ({
  getCalendarOverview: jest.fn(),
  createCalendarTask: jest.fn(),
  editCalendarTask: jest.fn(),
  deleteCalendarTask: jest.fn(),
  toggleCalendarTask: jest.fn(),
}));
jest.mock('../src/calendar/calendarViewStore', () => ({
  loadCalendarView: jest.fn(async () => mockSavedView),
  saveCalendarView: jest.fn(async () => {}),
}));

import { Provider } from 'react-redux';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { setLogger } from '@beyou/api';
import {
  createCalendarTask,
  getCalendarOverview,
  toggleCalendarTask,
} from '@beyou/api/calendar/calendarApi';
import { addDaysIso, todayInZone } from '@beyou/state';
import type { CalendarDay, CalendarOverview, CalendarTask } from '@beyou/types/calendar/calendar';
import i18n from '../src/i18n';
import { notify } from '../src/notify';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { saveCalendarView } from '../src/calendar/calendarViewStore';
import CalendarScreen from '../app/(app)/calendar';

const mockedOverview = getCalendarOverview as jest.Mock;
const mockedToggle = toggleCalendarTask as jest.Mock;
const mockedCreate = createCalendarTask as jest.Mock;

const task = (overrides: Partial<CalendarTask>): CalendarTask => ({
  id: 't1',
  title: 'Sign the lease',
  note: null,
  date: '2026-10-14',
  time: null,
  advanceMinutes: 0,
  completed: false,
  completedAt: null,
  xpAwarded: 0,
  notifyAt: '2026-10-14T12:00:00Z',
  ...overrides,
});

/** Answers every range with one row per day, filled from `fixtures` where a day has one. */
function serve(fixtures: Partial<CalendarDay>[], today = todayInZone('UTC')) {
  mockedOverview.mockImplementation(async ({ from, to }: { from: string; to: string }) => {
    const days: CalendarDay[] = [];
    for (let date = from; date <= to; date = addDaysIso(date, 1)) {
      const fixture = fixtures.find((day) => day.date === date);
      days.push({ date, tasks: [], routines: [], goals: [], mood: null, ...fixture });
    }
    const overview: CalendarOverview = { from, to, today, days };
    return { success: overview };
  });
}

async function renderScreen(store = makeStore()) {
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <CalendarScreen />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  await waitFor(() => expect(screen.getByTestId('calendar-day-panel')).toBeTruthy());
  return store;
}

async function press(testID: string) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

/** The markers are hidden from screen readers (the cell's own label carries them). */
const HIDDEN = { includeHiddenElements: true };
const isSelected = (testID: string) => screen.getByTestId(testID).props.accessibilityState?.selected === true;
const opacityOf = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style)?.opacity;

beforeEach(() => {
  jest.clearAllMocks();
  setLogger({ error: () => {} });
  mockParams = {};
  mockSavedView = null;
  serve([]);
});

describe('CalendarScreen, month view', () => {
  it('draws each day with the markers its overview row carries', async () => {
    mockParams = { date: '2026-10-14' };
    serve([
      {
        date: '2026-10-14',
        tasks: [task({ id: 'a' }), task({ id: 'b', completed: true })],
        routines: [
          {
            routineId: 'r1', name: 'Morning', iconId: null, source: 'SNAPSHOT',
            totalItems: 9, checkedItems: 7, completed: false,
          },
        ],
        goals: [{ goalId: 'g1', name: 'Read 12 books', iconId: null, complete: false }],
        mood: { level: 4, hasNote: true },
      },
    ]);
    await renderScreen();

    // The padded month, Sunday 27 September to Saturday 31 October.
    expect(mockedOverview).toHaveBeenCalledWith({ from: '2026-09-27', to: '2026-10-31' }, expect.anything());

    expect(screen.getByTestId('calendar-day-2026-10-14-tasks', HIDDEN).props.children).toBe(2);
    expect(screen.getByTestId('calendar-day-2026-10-14-routine', HIDDEN)).toBeTruthy();
    expect(screen.getByTestId('calendar-day-2026-10-14-goal', HIDDEN)).toBeTruthy();
    expect(screen.getByTestId('calendar-day-2026-10-14-mood', HIDDEN)).toBeTruthy();
    // A day with nothing carries no marker at all.
    expect(screen.queryByTestId('calendar-day-2026-10-15-tasks', HIDDEN)).toBeNull();
    expect(screen.queryByTestId('calendar-day-2026-10-15-routine', HIDDEN)).toBeNull();

    // Padding days from September are dimmed; the month's own days are not.
    expect(opacityOf('calendar-day-2026-09-27')).toBeLessThan(1);
    expect(opacityOf('calendar-day-2026-10-01')).toBe(1);

    // And the selected day's list says how the routine went and that the diary was written.
    expect(screen.getByTestId('calendar-routine-progress-r1').props.children).toBe(
      i18n.t('CalendarRoutineProgress', { checked: 7, total: 9 }),
    );
    expect(screen.getByTestId('calendar-goal-g1')).toBeTruthy();
    expect(screen.getByTestId('calendar-mood-diary')).toBeTruthy();
  });

  it('shows a day not lived yet with its planned routine and no count', async () => {
    mockParams = { date: '2099-03-10' };
    serve([
      {
        date: '2099-03-10',
        routines: [
          {
            routineId: 'r1', name: 'Morning', iconId: null, source: 'SCHEDULE',
            totalItems: null, checkedItems: null, completed: false,
          },
        ],
      },
    ]);
    await renderScreen();

    expect(screen.getByTestId('calendar-routine-planned-r1')).toBeTruthy();
    expect(screen.queryByTestId('calendar-routine-progress-r1')).toBeNull();
  });

  it('opens on the day a ?date= link carries', async () => {
    mockParams = { date: '2026-10-20' };
    await renderScreen();

    expect(isSelected('calendar-day-2026-10-20')).toBe(true);
    expect(isSelected('calendar-day-2026-10-14')).toBe(false);
    const heading = new Intl.DateTimeFormat(i18n.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date('2026-10-20T12:00:00'));
    expect(screen.getByTestId('calendar-selected-date').props.children).toBe(heading);
  });

  it('ignores a link date that is not a real day and opens on today', async () => {
    mockParams = { date: '2026-02-31' };
    await renderScreen();

    const today = todayInZone('UTC');
    expect(isSelected(`calendar-day-${today}`)).toBe(true);
  });

  it('keeps a missed task on its own day, marked as not done', async () => {
    mockParams = { date: '2020-01-15' };
    serve([
      {
        date: '2020-01-15',
        tasks: [task({ id: 'open', date: '2020-01-15' }), task({ id: 'done', date: '2020-01-15', completed: true })],
      },
    ]);
    await renderScreen();

    expect(screen.getByTestId('calendar-task-missed-open')).toBeTruthy();
    expect(screen.queryByTestId('calendar-task-missed-done')).toBeNull();
  });

  it('moves a month at a time and asks for the new range', async () => {
    // A month far from the real today, so "next" lands on the 1st rather than on today.
    mockParams = { date: '2030-05-14' };
    await renderScreen();

    await press('calendar-next');

    await waitFor(() =>
      expect(mockedOverview).toHaveBeenLastCalledWith({ from: '2030-05-26', to: '2030-07-06' }, expect.anything()),
    );
    expect(isSelected('calendar-day-2030-06-01')).toBe(true);
  });
});

describe('CalendarScreen, layout and the server', () => {
  /**
   * The grid used to be one flex-wrap row, sized to floor(width / 7). A pixel-rounded width that
   * came back a hair wider than the one Yoga breaks lines on wrapped the 7th day and shifted the
   * month a column. Each week is its own row now.
   */
  it('lays the month out in week rows of seven days', async () => {
    mockParams = { date: '2026-10-14' };
    await renderScreen();
    await act(async () => {
      fireEvent(screen.getByTestId('calendar-month'), 'layout', {
        nativeEvent: { layout: { width: 314.31, height: 400 } },
      });
    });

    // October 2026 padded to whole weeks: 27 September to 31 October, five rows.
    for (let week = 0; week < 5; week += 1) {
      const row = within(screen.getByTestId(`calendar-month-week-${week}`));
      expect(row.getAllByTestId(/^calendar-day-\d{4}-\d{2}-\d{2}$/)).toHaveLength(7);
    }
    expect(screen.queryByTestId('calendar-month-week-5')).toBeNull();
    expect(within(screen.getByTestId('calendar-month-week-0')).getByTestId('calendar-day-2026-10-03')).toBeTruthy();
    expect(within(screen.getByTestId('calendar-month-week-1')).getByTestId('calendar-day-2026-10-04')).toBeTruthy();
  });

  /**
   * The phone's guess of today and the server's can differ near midnight (or with no timezone on
   * the profile). Once the overview is in, the server's `today` decides which day is marked
   * today and which open tasks are already missed.
   */
  it("uses the server's today for the today mark and for missed tasks", async () => {
    mockParams = { date: '2099-05-10' };
    serve([{ date: '2099-05-10', tasks: [task({ id: 'open', date: '2099-05-10' })] }], '2099-05-11');
    await renderScreen();

    expect(screen.getByTestId('calendar-task-missed-open')).toBeTruthy();
    expect(screen.getByTestId('calendar-day-2099-05-11-today')).toBeTruthy();
  });

  it('labels the back button for screen readers', async () => {
    await renderScreen();
    expect(screen.getByTestId('back-button').props.accessibilityLabel).toBe(i18n.t('CalendarMobileBack'));
  });
});

describe('CalendarScreen, week view', () => {
  it('splits the day into all-day and timed, the timed ones in time order', async () => {
    mockSavedView = 'week';
    mockParams = { date: '2026-10-14' };
    serve([
      {
        date: '2026-10-14',
        tasks: [
          task({ id: 'untimed', title: 'Buy stamps' }),
          task({ id: 'late', title: 'Call the bank', time: '15:00' }),
          task({ id: 'early', title: 'Dentist', time: '09:30' }),
        ],
        mood: { level: 2, hasNote: false },
      },
    ]);
    await renderScreen();

    // The remembered view is known before the first request, so no month is fetched for nothing.
    expect(mockedOverview).toHaveBeenCalledTimes(1);
    expect(mockedOverview).toHaveBeenCalledWith({ from: '2026-10-11', to: '2026-10-17' }, expect.anything());
    expect(screen.getByTestId('calendar-week-day-2026-10-14-tasks', HIDDEN).props.children).toBe(3);

    const allDay = within(screen.getByTestId('calendar-allday'));
    expect(allDay.getByTestId('calendar-task-untimed')).toBeTruthy();
    expect(allDay.getByTestId('calendar-mood')).toBeTruthy();
    expect(allDay.queryByTestId('calendar-task-early')).toBeNull();
    expect(allDay.queryByTestId('calendar-task-late')).toBeNull();

    const timed = within(screen.getByTestId('calendar-timed'));
    expect(timed.queryByTestId('calendar-task-untimed')).toBeNull();
    const times = timed.getAllByTestId(/^calendar-task-time-/).map((node) => node.props.children);
    expect(times).toEqual(['09:30', '15:00']);
  });

  it('remembers the view picked on this device', async () => {
    mockParams = { date: '2026-10-14' };
    await renderScreen();

    await press('calendar-view-week');

    expect(saveCalendarView).toHaveBeenCalledWith('week');
    await waitFor(() =>
      expect(mockedOverview).toHaveBeenLastCalledWith({ from: '2026-10-11', to: '2026-10-17' }, expect.anything()),
    );
    expect(screen.getByTestId('calendar-week')).toBeTruthy();
  });
});

describe('CalendarScreen, tasks', () => {
  it('completing a task calls the toggle and applies the XP it answers with', async () => {
    mockParams = { date: '2026-10-14' };
    serve([{ date: '2026-10-14', tasks: [task({ id: 't1' })] }]);
    mockedToggle.mockResolvedValue({
      success: {
        task: task({ id: 't1', completed: true, xpAwarded: 10 }),
        refreshUi: {
          refreshUser: {
            currentConstance: 3,
            alreadyIncreaseConstanceToday: true,
            maxConstance: 5,
            xp: 510,
            level: 4,
            actualLevelXp: 400,
            nextLevelXp: 700,
          },
        },
      },
    });
    const store = await renderScreen();
    expect(store.getState().perfil.xp).not.toBe(510);

    await press('calendar-task-check-t1');

    expect(mockedToggle).toHaveBeenCalledWith('t1', expect.anything());
    await waitFor(() => expect(store.getState().perfil.xp).toBe(510));
    expect(store.getState().perfil.level).toBe(4);
    expect(screen.getByTestId('calendar-task-check-t1').props.accessibilityState?.checked).toBe(true);
  });

  it('a task added on the selected day lands in that day without a refetch', async () => {
    mockParams = { date: '2026-10-14' };
    mockedCreate.mockResolvedValue({ success: task({ id: 'new', title: 'Book the dentist' }) });
    await renderScreen();
    const requests = mockedOverview.mock.calls.length;

    await press('calendar-add-on-day');
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('calendar-task-title'), 'Book the dentist');
    });
    await press('calendar-task-form-submit');

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Book the dentist', date: '2026-10-14' }),
      expect.anything(),
    );
    await waitFor(() => expect(screen.getByTestId('calendar-task-new')).toBeTruthy());
    expect(mockedOverview.mock.calls.length).toBe(requests);
  });

  /** Deleted on another device: the row goes, with a short word, instead of an error that stays. */
  it('drops a task the server no longer has when it is ticked', async () => {
    mockParams = { date: '2026-10-14' };
    serve([{ date: '2026-10-14', tasks: [task({ id: 't1' })] }]);
    mockedToggle.mockResolvedValue({ error: { errorKey: 'CALENDAR_TASK_NOT_FOUND' } });
    await renderScreen();

    await press('calendar-task-check-t1');

    await waitFor(() => expect(screen.queryByTestId('calendar-task-t1')).toBeNull());
    expect(notify.info).toHaveBeenCalledWith(i18n.t('CALENDAR_TASK_NOT_FOUND'));
    expect(notify.error).not.toHaveBeenCalled();
  });
});
