import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import { applyRefreshUi } from "@beyou/state/user/refreshUiThunk";
import {
    createCalendarTask,
    deleteCalendarTask,
    editCalendarTask,
    getCalendarOverview,
    toggleCalendarTask,
} from "@beyou/api/calendar/calendarApi";
import type { CalendarDay, CalendarOverview, CalendarTask } from "@beyou/types/calendar/calendar";
import type { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import { toast } from "react-toastify";
import { renderWithProviders } from "../../test/test-utils";
import Calendar from "./Calendar";

vi.mock("@beyou/api/calendar/calendarApi", () => ({
    getCalendarOverview: vi.fn(),
    createCalendarTask: vi.fn(),
    editCalendarTask: vi.fn(),
    deleteCalendarTask: vi.fn(),
    toggleCalendarTask: vi.fn(),
}));
vi.mock("@beyou/state/user/refreshUiThunk", () => ({ applyRefreshUi: vi.fn() }));
vi.mock("../../components/useAuthGuard", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);
const store = () =>
    configureStore({
        reducer: rootReducer,
        preloadedState: { ...baseState, perfil: { ...baseState.perfil, timezone: "UTC" } } as never,
    });

const task = (overrides: Partial<CalendarTask>): CalendarTask => ({
    id: "t1",
    title: "Sign the lease",
    note: null,
    date: "2026-10-14",
    time: "10:30",
    advanceMinutes: 0,
    completed: false,
    completedAt: null,
    xpAwarded: 0,
    notifyAt: "2026-10-14T10:30:00Z",
    ...overrides,
});

/** What the server holds, by day. Every request is answered from it for the range asked. */
const FIXTURE: Record<string, Partial<CalendarDay>> = {
    "2026-10-11": { tasks: [task({ id: "eve", title: "Water the plants", date: "2026-10-11", time: "20:00" })] },
    "2026-10-09": { mood: { level: 4, hasNote: true } },
    "2026-10-10": {
        tasks: [task({ id: "late", title: "Pay the rent", date: "2026-10-10", time: null })],
        routines: [
            {
                routineId: "r1",
                name: "Morning",
                iconId: null,
                source: "SNAPSHOT",
                totalItems: 9,
                checkedItems: 7,
                completed: false,
            },
        ],
    },
    "2026-10-14": {
        tasks: [
            task({ id: "t1" }),
            task({ id: "t2", title: "Call the bank", time: null, notifyAt: "2026-10-14T09:00:00Z" }),
        ],
        routines: [
            {
                routineId: "r1",
                name: "Morning",
                iconId: null,
                source: "SCHEDULE",
                totalItems: null,
                checkedItems: null,
                completed: false,
            },
        ],
    },
    "2026-10-20": { goals: [{ goalId: "g1", name: "Read 12 books", iconId: null, complete: false }] },
};

const enumerate = (from: string, to: string) => {
    const days: string[] = [];
    for (let day = new Date(`${from}T12:00:00Z`); day.toISOString().slice(0, 10) <= to; day.setUTCDate(day.getUTCDate() + 1)) {
        days.push(day.toISOString().slice(0, 10));
    }
    return days;
};

const overviewFor = ({ from, to }: { from: string; to: string }): CalendarOverview => ({
    from,
    to,
    today: "2026-10-11",
    days: enumerate(from, to).map((date) => ({
        date,
        tasks: [],
        routines: [],
        goals: [],
        mood: null,
        ...FIXTURE[date],
    })),
});

const renderPage = (route = "/calendar") => renderWithProviders(<Calendar />, { storeOverride: store(), route });

/** Waits for the range to arrive: the 14th carries two tasks in the fixture. */
const loaded = async (day = "2026-10-14") =>
    within(await screen.findByTestId(`calendar-day-${day}`)).findByTestId("calendar-marker-tasks");

beforeEach(() => {
    vi.setSystemTime(new Date("2026-10-11T15:00:00Z"));
    localStorage.clear();
    vi.mocked(getCalendarOverview).mockImplementation(async (range) => ({ success: overviewFor(range) }));
});

afterEach(() => {
    vi.useRealTimers();
});

describe("month view", () => {
    test("asks for the month padded to whole weeks", async () => {
        renderPage();
        await loaded();

        expect(getCalendarOverview).toHaveBeenCalledWith({ from: "2026-09-27", to: "2026-10-31" }, expect.anything());
    });

    test("marks each day with what it holds", async () => {
        renderPage();
        const count = await loaded();
        expect(count).toHaveTextContent("2");

        const routineDay = within(screen.getByTestId("calendar-day-2026-10-10"));
        expect(routineDay.getByTestId("calendar-marker-routine")).toBeInTheDocument();
        expect(routineDay.getByTestId("calendar-marker-tasks")).toHaveTextContent("1");

        expect(within(screen.getByTestId("calendar-day-2026-10-20")).getByTestId("calendar-marker-goal")).toBeInTheDocument();
        expect(within(screen.getByTestId("calendar-day-2026-10-09")).getByTestId("calendar-marker-mood")).toBeInTheDocument();

        const quiet = within(screen.getByTestId("calendar-day-2026-10-21"));
        expect(quiet.queryByTestId("calendar-marker-tasks")).not.toBeInTheDocument();
        expect(quiet.queryByTestId("calendar-marker-routine")).not.toBeInTheDocument();
    });

    test("dims the days that pad the month", async () => {
        renderPage();
        await loaded();

        expect(screen.getByTestId("calendar-day-2026-09-27")).toHaveAttribute("data-outside", "true");
        expect(screen.getByTestId("calendar-day-2026-10-01")).not.toHaveAttribute("data-outside");
    });

    test("opens on today with nothing in the URL", async () => {
        renderPage();
        await loaded();

        expect(screen.getByTestId("calendar-day-panel")).toHaveAttribute("data-date", "2026-10-11");
        expect(screen.getByTestId("calendar-day-2026-10-11")).toHaveAttribute("aria-current", "date");
    });

    test("?date opens that day, with its tasks in the panel", async () => {
        renderPage("/calendar?date=2026-10-14");
        await loaded();

        const panel = within(screen.getByTestId("calendar-day-panel"));
        expect(screen.getByTestId("calendar-day-panel")).toHaveAttribute("data-date", "2026-10-14");
        expect(screen.getByTestId("calendar-day-2026-10-14")).toHaveAttribute("aria-current", "date");
        expect(panel.getByTestId("calendar-task-t1")).toHaveTextContent("Sign the lease");
        expect(panel.getByTestId("calendar-task-t2")).toHaveTextContent("Call the bank");
        expect(panel.getByTestId("calendar-routine-status-r1")).toHaveTextContent("CalendarRoutinePlanned");
    });

    test("?date in another month opens that month", async () => {
        renderPage("/calendar?date=2026-12-03");

        await waitFor(() =>
            expect(getCalendarOverview).toHaveBeenCalledWith({ from: "2026-11-29", to: "2027-01-02" }, expect.anything()),
        );
        expect(await screen.findByTestId("calendar-day-2026-12-03")).toHaveAttribute("aria-current", "date");
    });

    test("a lived day shows how its routine went, and a task left open there says not done", async () => {
        renderPage("/calendar?date=2026-10-10");
        await loaded();

        const panel = within(screen.getByTestId("calendar-day-panel"));
        expect(panel.getByTestId("calendar-routine-status-r1")).toHaveTextContent("CalendarRoutineProgress");
        expect(panel.getByTestId("calendar-task-not-done-late")).toBeInTheDocument();
    });

    test("the panel lists the goal ending and the mood with its diary", async () => {
        renderPage("/calendar?date=2026-10-20");
        await loaded();
        expect(within(screen.getByTestId("calendar-day-panel")).getByTestId("calendar-goal-g1")).toHaveTextContent(
            "Read 12 books",
        );

        await userEvent.click(screen.getByTestId("calendar-day-2026-10-09"));
        expect(await screen.findByTestId("calendar-mood-2026-10-09")).toHaveAttribute("href", "/mood?date=2026-10-09");
        expect(screen.getByTestId("calendar-mood-diary-2026-10-09")).toBeInTheDocument();
    });

    test("next month lands on its first day", async () => {
        renderPage();
        await loaded();

        await userEvent.click(screen.getByTestId("calendar-next"));

        await waitFor(() =>
            expect(getCalendarOverview).toHaveBeenLastCalledWith({ from: "2026-11-01", to: "2026-12-05" }, expect.anything()),
        );
        expect(screen.getByTestId("calendar-day-panel")).toHaveAttribute("data-date", "2026-11-01");
    });
});

describe("week view", () => {
    test("places a timed task in its hour row and an untimed one in the all-day strip", async () => {
        renderPage("/calendar?date=2026-10-14");
        await loaded();

        await userEvent.click(screen.getByTestId("calendar-view-week"));

        expect(screen.getByTestId("calendar-view-week")).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByTestId("calendar-view-month")).toHaveAttribute("aria-pressed", "false");
        await waitFor(() =>
            expect(getCalendarOverview).toHaveBeenLastCalledWith({ from: "2026-10-11", to: "2026-10-17" }, expect.anything()),
        );

        const tenOClock = within(screen.getByTestId("calendar-week-cell-2026-10-14-10"));
        expect(tenOClock.getByTestId("calendar-week-task-t1")).toHaveTextContent("Sign the lease");
        expect(within(screen.getByTestId("calendar-week-cell-2026-10-14-09")).queryByTestId("calendar-week-task-t1")).toBeNull();

        const allDay = within(screen.getByTestId("calendar-week-allday-2026-10-14"));
        expect(allDay.getByTestId("calendar-week-task-t2")).toHaveTextContent("Call the bank");
        expect(allDay.queryByTestId("calendar-week-task-t1")).toBeNull();
        expect(allDay.getByText("Morning")).toBeInTheDocument();
    });

    test("a day header selects that day for the panel", async () => {
        renderPage("/calendar?date=2026-10-14");
        await loaded();
        await userEvent.click(screen.getByTestId("calendar-view-week"));

        await userEvent.click(await screen.findByTestId("calendar-week-day-2026-10-16"));

        expect(screen.getByTestId("calendar-day-panel")).toHaveAttribute("data-date", "2026-10-16");
    });

    test("is remembered for the next visit", async () => {
        const first = renderPage();
        await loaded();
        await userEvent.click(screen.getByTestId("calendar-view-week"));
        expect(localStorage.getItem("beyou-calendar-view")).toBe("week");
        first.unmount();

        renderPage();

        expect(await screen.findByTestId("calendar-week")).toBeInTheDocument();
        expect(screen.getByTestId("calendar-view-week")).toHaveAttribute("aria-pressed", "true");
    });
});

describe("writes", () => {
    test("completing a task pays through the shared refresh and repaints the row", async () => {
        const refreshUi: RefreshUI = {
            refreshUser: {
                xp: 110,
                level: 2,
                actualLevelXp: 100,
                nextLevelXp: 200,
                currentConstance: 3,
                maxConstance: 5,
                alreadyIncreaseConstanceToday: true,
            },
        } as RefreshUI;
        vi.mocked(toggleCalendarTask).mockResolvedValue({
            success: { task: task({ id: "t1", completed: true, xpAwarded: 10 }), refreshUi },
        });
        renderPage("/calendar?date=2026-10-14");
        await loaded();

        const toggle = screen.getByTestId("calendar-task-toggle-t1");
        expect(toggle).toHaveAttribute("aria-pressed", "false");
        await userEvent.click(toggle);

        expect(toggleCalendarTask).toHaveBeenCalledWith("t1", expect.anything());
        await waitFor(() => expect(screen.getByTestId("calendar-task-toggle-t1")).toHaveAttribute("aria-pressed", "true"));
        expect(applyRefreshUi).toHaveBeenCalledWith(refreshUi, expect.any(Function), expect.objectContaining({ level: expect.any(Number) }));
    });

    test("a failed toggle moves nothing", async () => {
        vi.mocked(toggleCalendarTask).mockResolvedValue({ error: { errorKey: "UnexpectedError" } });
        renderPage("/calendar?date=2026-10-14");
        await loaded();

        await userEvent.click(screen.getByTestId("calendar-task-toggle-t1"));

        await waitFor(() => expect(toggleCalendarTask).toHaveBeenCalled());
        expect(applyRefreshUi).not.toHaveBeenCalled();
        expect(screen.getByTestId("calendar-task-toggle-t1")).toHaveAttribute("aria-pressed", "false");
    });

    test("adds a task on the selected day without refetching the range", async () => {
        vi.mocked(createCalendarTask).mockResolvedValue({
            success: task({ id: "t3", title: "Renew passport", time: null }),
        });
        renderPage("/calendar?date=2026-10-14");
        await loaded();
        const fetches = vi.mocked(getCalendarOverview).mock.calls.length;

        await userEvent.click(screen.getByTestId("calendar-add-task-on-day"));
        expect(screen.getByTestId("calendar-task-date")).toHaveValue("2026-10-14");
        userEvent.type(screen.getByTestId("calendar-task-title"), "Renew passport");
        await userEvent.click(screen.getByTestId("calendar-task-save"));

        expect(await screen.findByTestId("calendar-task-t3")).toHaveTextContent("Renew passport");
        expect(within(screen.getByTestId("calendar-day-2026-10-14")).getByTestId("calendar-marker-tasks")).toHaveTextContent("3");
        expect(getCalendarOverview).toHaveBeenCalledTimes(fetches);
    });

    test("deletes after confirming", async () => {
        vi.mocked(deleteCalendarTask).mockResolvedValue({ success: true });
        renderPage("/calendar?date=2026-10-14");
        await loaded();

        await userEvent.click(screen.getByTestId("calendar-task-delete-t1"));
        await userEvent.click(screen.getByTestId("calendar-task-delete-confirm"));

        expect(deleteCalendarTask).toHaveBeenCalledWith("t1", expect.anything());
        await waitFor(() => expect(screen.queryByTestId("calendar-task-t1")).not.toBeInTheDocument());
        expect(screen.getByTestId("calendar-task-t2")).toBeInTheDocument();
    });
});

/**
 * Deleted on the phone while this tab still shows it: the server answers 404 to every route. The
 * row has to go, with a word about why, instead of an error that repeats on every click.
 */
describe("a task deleted elsewhere", () => {
    const GONE = { error: { errorKey: "CALENDAR_TASK_NOT_FOUND" } };

    test("deleting it again clears it like a delete", async () => {
        vi.mocked(deleteCalendarTask).mockResolvedValue(GONE);
        renderPage("/calendar?date=2026-10-14");
        await loaded();

        await userEvent.click(screen.getByTestId("calendar-task-delete-t1"));
        await userEvent.click(screen.getByTestId("calendar-task-delete-confirm"));

        await waitFor(() => expect(screen.queryByTestId("calendar-task-t1")).not.toBeInTheDocument());
        expect(screen.queryByTestId("calendar-task-delete-confirm")).not.toBeInTheDocument();
        expect(toast.info).toHaveBeenCalledWith("CALENDAR_TASK_NOT_FOUND");
        expect(toast.error).not.toHaveBeenCalled();
    });

    test("completing it removes it", async () => {
        vi.mocked(toggleCalendarTask).mockResolvedValue(GONE);
        renderPage("/calendar?date=2026-10-14");
        await loaded();

        await userEvent.click(screen.getByTestId("calendar-task-toggle-t1"));

        await waitFor(() => expect(screen.queryByTestId("calendar-task-t1")).not.toBeInTheDocument());
        expect(applyRefreshUi).not.toHaveBeenCalled();
        expect(toast.info).toHaveBeenCalledWith("CALENDAR_TASK_NOT_FOUND");
    });

    test("saving an edit closes the dialog and removes it", async () => {
        vi.mocked(editCalendarTask).mockResolvedValue(GONE);
        renderPage("/calendar?date=2026-10-14");
        await loaded();

        await userEvent.click(screen.getByTestId("calendar-task-edit-t1"));
        await userEvent.click(screen.getByTestId("calendar-task-save"));

        await waitFor(() => expect(screen.queryByTestId("calendar-task-dialog")).not.toBeInTheDocument());
        expect(screen.queryByTestId("calendar-task-t1")).not.toBeInTheDocument();
        expect(screen.getByTestId("calendar-task-t2")).toBeInTheDocument();
    });
});

/**
 * A tab left open overnight. The server's today from the last fetch is yesterday by now, so the
 * page has to follow the clock: today's ring, the "not done" mark on what was left open, and the
 * Today button all move at midnight.
 */
describe("a tab left open overnight", () => {
    test("moves today, the not-done mark and the Today button to the new day", async () => {
        // The shared beforeEach mocked only the date; this test needs the clock to run.
        vi.useRealTimers();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-10-11T23:59:30Z"));
        vi.mocked(getCalendarOverview).mockImplementation(async (range) => ({
            success: { ...overviewFor(range), today: new Date().toISOString().slice(0, 10) },
        }));
        const settle = (ms = 0) =>
            act(async () => {
                await vi.advanceTimersByTimeAsync(ms);
            });

        renderPage("/calendar?date=2026-10-11");
        await settle();
        expect(screen.getByTestId("calendar-day-2026-10-11")).toHaveAttribute("data-today", "true");
        expect(screen.queryByTestId("calendar-task-not-done-eve")).not.toBeInTheDocument();

        // Past midnight in the profile's zone (UTC here).
        await settle(32_000);

        expect(screen.getByTestId("calendar-day-2026-10-12")).toHaveAttribute("data-today", "true");
        expect(screen.getByTestId("calendar-day-2026-10-11")).not.toHaveAttribute("data-today");
        expect(screen.getByTestId("calendar-task-not-done-eve")).toBeInTheDocument();

        fireEvent.click(screen.getByTestId("calendar-today"));
        expect(screen.getByTestId("calendar-day-panel")).toHaveAttribute("data-date", "2026-10-12");
    });
});

test("says so when the range does not load", async () => {
    vi.mocked(getCalendarOverview).mockResolvedValue({ error: { errorKey: "CALENDAR_RANGE_INVALID" } });
    renderPage();

    expect(await screen.findByTestId("calendar-load-error")).toHaveTextContent("CalendarLoadFailed");
});
