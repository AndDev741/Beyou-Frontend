import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import { WIDGET_IDS } from "@beyou/state";
import { applyRefreshUi } from "@beyou/state/user/refreshUiThunk";
import { getCalendarOverview, toggleCalendarTask } from "@beyou/api/calendar/calendarApi";
import type { CalendarOverview, CalendarTask } from "@beyou/types/calendar/calendar";
import type { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import { renderWithProviders } from "../../test/test-utils";
import CalendarToday from "./calendarToday";

vi.mock("@beyou/api/calendar/calendarApi", () => ({
    getCalendarOverview: vi.fn(),
    toggleCalendarTask: vi.fn(),
}));
vi.mock("@beyou/state/user/refreshUiThunk", () => ({ applyRefreshUi: vi.fn() }));
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
    date: "2026-10-11",
    time: "10:30",
    advanceMinutes: 0,
    completed: false,
    completedAt: null,
    xpAwarded: 0,
    notifyAt: "2026-10-11T10:30:00Z",
    ...overrides,
});

const overview = (today: string, byDate: Record<string, CalendarTask[]>): CalendarOverview => ({
    from: "2026-10-10",
    to: "2026-10-12",
    today,
    days: ["2026-10-10", "2026-10-11", "2026-10-12"].map((date) => ({
        date,
        tasks: byDate[date] ?? [],
        routines: [],
        goals: [],
        mood: null,
    })),
});

beforeEach(() => {
    vi.setSystemTime(new Date("2026-10-11T15:00:00Z"));
});

afterEach(() => {
    vi.useRealTimers();
});

test("asks for the days around today and lists only today's tasks", async () => {
    vi.mocked(getCalendarOverview).mockResolvedValue({
        success: overview("2026-10-11", {
            "2026-10-10": [task({ id: "old", title: "Yesterday's", date: "2026-10-10" })],
            "2026-10-11": [task({ id: "t1" }), task({ id: "t2", title: "Call the bank", time: null })],
        }),
    });

    renderWithProviders(<CalendarToday />, { storeOverride: store() });

    const widget = within(screen.getByTestId("calendar-today-widget"));
    expect(await widget.findByTestId("calendar-today-task-t1")).toHaveTextContent("Sign the lease");
    expect(widget.getByTestId("calendar-today-task-t2")).toHaveTextContent("Call the bank");
    expect(widget.queryByTestId("calendar-today-task-old")).not.toBeInTheDocument();
    expect(getCalendarOverview).toHaveBeenCalledWith({ from: "2026-10-10", to: "2026-10-12" }, expect.anything());
});

/** The server resolves today in the profile's zone; the widget trusts it over the browser. */
test("follows the server's today when it differs from the browser's", async () => {
    vi.mocked(getCalendarOverview).mockResolvedValue({
        success: overview("2026-10-12", {
            "2026-10-11": [task({ id: "t1" })],
            "2026-10-12": [task({ id: "t9", title: "Tomorrow for the browser", date: "2026-10-12" })],
        }),
    });

    renderWithProviders(<CalendarToday />, { storeOverride: store() });

    expect(await screen.findByTestId("calendar-today-task-t9")).toBeInTheDocument();
    expect(screen.queryByTestId("calendar-today-task-t1")).not.toBeInTheDocument();
    expect(screen.getByTestId("calendar-today-open")).toHaveAttribute("href", "/calendar?date=2026-10-12");
});

test("says so when today has no tasks", async () => {
    vi.mocked(getCalendarOverview).mockResolvedValue({ success: overview("2026-10-11", {}) });

    renderWithProviders(<CalendarToday />, { storeOverride: store() });

    expect(await screen.findByTestId("calendar-today-empty")).toHaveTextContent("CalendarTodayWidgetEmpty");
});

test("completes a task from the dashboard and applies the XP", async () => {
    const refreshUi = { refreshUser: { xp: 10 } } as unknown as RefreshUI;
    vi.mocked(getCalendarOverview).mockResolvedValue({
        success: overview("2026-10-11", { "2026-10-11": [task({ id: "t1" })] }),
    });
    vi.mocked(toggleCalendarTask).mockResolvedValue({
        success: { task: task({ id: "t1", completed: true }), refreshUi },
    });

    renderWithProviders(<CalendarToday />, { storeOverride: store() });
    await userEvent.click(await screen.findByTestId("calendar-today-toggle-t1"));

    expect(toggleCalendarTask).toHaveBeenCalledWith("t1", expect.anything());
    await waitFor(() =>
        expect(screen.getByTestId("calendar-today-toggle-t1")).toHaveAttribute("aria-pressed", "true"),
    );
    expect(applyRefreshUi).toHaveBeenCalledWith(refreshUi, expect.any(Function), expect.anything());
});

test("drops a task that was deleted on another device", async () => {
    vi.mocked(getCalendarOverview).mockResolvedValue({
        success: overview("2026-10-11", { "2026-10-11": [task({ id: "t1" }), task({ id: "t2", title: "Call the bank" })] }),
    });
    vi.mocked(toggleCalendarTask).mockResolvedValue({ error: { errorKey: "CALENDAR_TASK_NOT_FOUND" } });

    renderWithProviders(<CalendarToday />, { storeOverride: store() });
    await userEvent.click(await screen.findByTestId("calendar-today-toggle-t1"));

    await waitFor(() => expect(screen.queryByTestId("calendar-today-task-t1")).not.toBeInTheDocument());
    expect(screen.getByTestId("calendar-today-task-t2")).toBeInTheDocument();
    expect(applyRefreshUi).not.toHaveBeenCalled();
});

/**
 * Left open past midnight, the widget must move to the new day at once, not when (or if) the
 * refetch comes back: the last overview's `today` is yesterday by then.
 */
test("moves to the new day at midnight, even before the refetch answers", async () => {
    vi.useRealTimers();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T23:59:30Z"));
    vi.mocked(getCalendarOverview)
        .mockResolvedValueOnce({
            success: overview("2026-10-11", {
                "2026-10-11": [task({ id: "t1" })],
                "2026-10-12": [task({ id: "t9", title: "First thing tomorrow", date: "2026-10-12" })],
            }),
        })
        .mockReturnValue(new Promise(() => {}));

    renderWithProviders(<CalendarToday />, { storeOverride: store() });
    await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId("calendar-today-task-t1")).toBeInTheDocument();

    await act(async () => {
        await vi.advanceTimersByTimeAsync(32_000);
    });

    expect(getCalendarOverview).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("calendar-today-task-t9")).toBeInTheDocument();
    expect(screen.queryByTestId("calendar-today-task-t1")).not.toBeInTheDocument();
});

/** R18: the widget exists for whoever adds it, and nobody gets it without asking. */
test("is a known widget id but not part of a fresh profile's dashboard", () => {
    expect(WIDGET_IDS).toContain("calendarToday");
    expect(baseState.perfil.widgetsIdsInUse).not.toContain("calendarToday");
});
