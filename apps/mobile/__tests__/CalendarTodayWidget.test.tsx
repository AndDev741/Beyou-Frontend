/**
 * "Today in the calendar" on the dashboard (R18): it asks for today alone, lists today's tasks
 * with a ring to complete each, says so when there are none, opens the calendar on today, and
 * renders through the dashboard's widget map once the person adds it.
 *
 * Boundary mocked: the calendar API module, expo-router and notify.
 */
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
}));
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('@beyou/api/calendar/calendarApi', () => ({
  getCalendarOverview: jest.fn(),
  toggleCalendarTask: jest.fn(),
}));
// The other widgets the dashboard map knows reach for their own endpoints; this file only
// needs them quiet.
jest.mock('@beyou/api/xp/getXpHistory', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ error: 'none' })),
}));

import { Provider } from 'react-redux';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { setLogger } from '@beyou/api';
import { getCalendarOverview, toggleCalendarTask } from '@beyou/api/calendar/calendarApi';
import { addDaysIso, todayInZone } from '@beyou/state';
import { widgetsIdInUseEnter } from '@beyou/state/user/perfilSlice';
import type { CalendarTask } from '@beyou/types/calendar/calendar';
import i18n from '../src/i18n';
import { notify } from '../src/notify';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import CalendarTodayWidget from '../src/ui/widgets/CalendarTodayWidget';
import DashboardWidgets from '../src/ui/widgets/DashboardWidgets';

const TODAY = todayInZone('UTC');
const mockedOverview = getCalendarOverview as jest.Mock;
const mockedToggle = toggleCalendarTask as jest.Mock;

const task = (overrides: Partial<CalendarTask>): CalendarTask => ({
  id: 't1',
  title: 'Sign the lease',
  note: null,
  date: TODAY,
  time: null,
  advanceMinutes: 0,
  completed: false,
  completedAt: null,
  xpAwarded: 0,
  notifyAt: `${TODAY}T12:00:00Z`,
  ...overrides,
});

/**
 * The three days around the phone's today, with `serverToday` as the server's own today and
 * `tasks` on that day.
 */
const serveToday = (tasks: CalendarTask[], serverToday = TODAY, others: CalendarTask[] = []) =>
  mockedOverview.mockResolvedValue({
    success: {
      from: addDaysIso(TODAY, -1),
      to: addDaysIso(TODAY, 1),
      today: serverToday,
      days: [-1, 0, 1].map((offset) => {
        const date = addDaysIso(TODAY, offset);
        return {
          date,
          tasks: date === serverToday ? tasks : others.filter((other) => other.date === date),
          routines: [],
          goals: [],
          mood: null,
        };
      }),
    },
  });

async function renderWidget(store = makeStore()) {
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <CalendarTodayWidget />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  return store;
}

beforeEach(() => {
  jest.clearAllMocks();
  setLogger({ error: () => {} });
});

describe('CalendarTodayWidget', () => {
  it("lists today's tasks", async () => {
    serveToday([task({ id: 'a', title: 'Sign the lease' }), task({ id: 'b', title: 'Call the bank', time: '15:00' })]);
    await renderWidget();

    await waitFor(() => expect(screen.getByTestId('calendar-task-a')).toBeTruthy());
    expect(screen.getByTestId('calendar-task-b')).toBeTruthy();
    expect(screen.queryByTestId('calendar-today-empty')).toBeNull();
  });

  /**
   * The phone's today comes from the profile's timezone, which may be missing or stale; near
   * midnight it can sit a day off the server's. The card asks for a day either side and shows
   * the one the SERVER calls today, like the web widget.
   */
  it("shows the day the server calls today, not the phone's guess", async () => {
    const serverToday = addDaysIso(TODAY, 1);
    serveToday([task({ id: 'server-day', date: serverToday })], serverToday, [task({ id: 'phone-day' })]);
    await renderWidget();

    expect(mockedOverview).toHaveBeenCalledWith(
      { from: addDaysIso(TODAY, -1), to: addDaysIso(TODAY, 1) },
      expect.anything(),
    );
    await waitFor(() => expect(screen.getByTestId('calendar-task-server-day')).toBeTruthy());
    expect(screen.queryByTestId('calendar-task-phone-day')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('calendar-today-open'));
    });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/calendar', params: { date: serverToday } });
  });

  it('names the row for what a tap on it does: open the calendar', async () => {
    serveToday([task({ id: 'a', title: 'Sign the lease' })]);
    await renderWidget();

    await waitFor(() => expect(screen.getByTestId('calendar-task-open-a')).toBeTruthy());
    expect(screen.getByTestId('calendar-task-open-a').props.accessibilityLabel).toBe(
      `${i18n.t('CalendarOpen')}: Sign the lease`,
    );
  });

  it('drops a task the server no longer has when it is ticked', async () => {
    serveToday([task({ id: 'a' })]);
    mockedToggle.mockResolvedValue({ error: { errorKey: 'CALENDAR_TASK_NOT_FOUND' } });
    await renderWidget();
    await waitFor(() => expect(screen.getByTestId('calendar-task-check-a')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('calendar-task-check-a'));
    });

    await waitFor(() => expect(screen.queryByTestId('calendar-task-a')).toBeNull());
    expect(notify.info).toHaveBeenCalledWith(i18n.t('CALENDAR_TASK_NOT_FOUND'));
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('says there is nothing today when the day is empty', async () => {
    serveToday([]);
    await renderWidget();

    await waitFor(() => expect(screen.getByTestId('calendar-today-empty')).toBeTruthy());
  });

  it('completes a task from the card and moves the XP', async () => {
    serveToday([task({ id: 'a' })]);
    mockedToggle.mockResolvedValue({
      success: {
        task: task({ id: 'a', completed: true, xpAwarded: 10 }),
        refreshUi: {
          refreshUser: {
            currentConstance: 1,
            alreadyIncreaseConstanceToday: true,
            maxConstance: 1,
            xp: 77,
            level: 2,
            actualLevelXp: 50,
            nextLevelXp: 120,
          },
        },
      },
    });
    const store = await renderWidget();
    await waitFor(() => expect(screen.getByTestId('calendar-task-check-a')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('calendar-task-check-a'));
    });

    expect(mockedToggle).toHaveBeenCalledWith('a', expect.anything());
    await waitFor(() => expect(store.getState().perfil.xp).toBe(77));
    expect(screen.getByTestId('calendar-task-check-a').props.accessibilityState?.checked).toBe(true);
  });

  it('opens the calendar on today', async () => {
    serveToday([]);
    await renderWidget();

    await act(async () => {
      fireEvent.press(screen.getByTestId('calendar-today-open'));
    });

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/calendar', params: { date: TODAY } });
  });

  it('renders on the dashboard once the person adds it, and not before', async () => {
    serveToday([task({ id: 'a' })]);
    const store = makeStore();
    store.dispatch(widgetsIdInUseEnter(['constance']));
    const view = await render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <DashboardWidgets />
        </BeyouThemeProvider>
      </Provider>,
    );
    expect(screen.queryByTestId('calendar-today-widget')).toBeNull();
    expect(mockedOverview).not.toHaveBeenCalled();
    await view.unmount();

    store.dispatch(widgetsIdInUseEnter(['calendarToday']));
    await render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <DashboardWidgets />
        </BeyouThemeProvider>
      </Provider>,
    );
    expect(screen.getByTestId('calendar-today-widget')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('calendar-task-a')).toBeTruthy());
  });
});
