import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { CalendarTask } from "@beyou/types/calendar/calendar";
import { acknowledgeCalendarTask, getUpcomingCalendarTasks } from "@beyou/api/calendar/calendarApi";
import { getNotificationPreferences } from "@beyou/api/notification/notificationPreferences";
import CalendarReminderHub from "./CalendarReminderHub";
import { resetSeenForTests } from "./calendarReminders";
import { announceReminderPreferences, requestReminderResync } from "./reminderPreferenceBus";

vi.mock("@beyou/api/calendar/calendarApi", () => ({
    getUpcomingCalendarTasks: vi.fn(),
    acknowledgeCalendarTask: vi.fn(),
}));

vi.mock("@beyou/api/notification/notificationPreferences", () => ({
    getNotificationPreferences: vi.fn(),
}));

const NOW = new Date("2026-10-14T09:00:00Z").getTime();
const MINUTE = 60_000;

const task = (overrides: Partial<CalendarTask> = {}): CalendarTask => ({
    id: "t1",
    title: "Sign the lease",
    note: null,
    date: "2026-10-14",
    time: "10:00",
    advanceMinutes: 30,
    completed: false,
    completedAt: null,
    xpAwarded: 0,
    notifyAt: new Date(NOW + 30 * MINUTE).toISOString(),
    ...overrides,
});

type Shown = {
    title: string;
    options: NotificationOptions;
    close: ReturnType<typeof vi.fn>;
    instance: { onclick: (() => void) | null };
};

/** jsdom has no Notification; each test installs the one it wants. */
const installNotification = (permission: NotificationPermission) => {
    const shown: Shown[] = [];
    class FakeNotification {
        static permission = permission;
        static requestPermission = vi.fn();
        onclick: (() => void) | null = null;
        close = vi.fn();
        constructor(title: string, options: NotificationOptions) {
            shown.push({ title, options, close: this.close, instance: this });
        }
    }
    vi.stubGlobal("Notification", FakeNotification);
    return shown;
};

function WhereAmI() {
    const location = useLocation();
    return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
}

const renderHub = () =>
    render(
        <MemoryRouter initialEntries={["/dashboard"]}>
            <CalendarReminderHub />
            <Routes>
                <Route path="*" element={<WhereAmI />} />
            </Routes>
        </MemoryRouter>,
    );

/** Lets the mocked requests resolve and the effects that follow them run. */
const flush = async (ms = 0) => {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
    });
};

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    localStorage.clear();
    resetSeenForTests();
    vi.mocked(getNotificationPreferences).mockResolvedValue({
        data: { engagementEmail: true, reminderEmail: true, reminderWeb: true, reminderDefaultTime: "09:00" },
    });
    vi.mocked(getUpcomingCalendarTasks).mockResolvedValue({ success: [task()] });
    vi.mocked(acknowledgeCalendarTask).mockResolvedValue({ success: true });
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("scheduling", () => {
    test("shows the reminder at its notifyAt, not before", async () => {
        const shown = installNotification("granted");
        renderHub();
        await flush();

        expect(shown).toHaveLength(0);
        await flush(30 * MINUTE - 1_000);
        expect(shown).toHaveLength(0);

        await flush(1_000);
        expect(shown).toHaveLength(1);
        expect(shown[0].title).toBe("Sign the lease");
        expect(shown[0].options).toMatchObject({ tag: "beyou-calendar-t1", body: "CalendarReminderAt" });
    });

    test("a task with no time says all day in the body", async () => {
        const shown = installNotification("granted");
        vi.mocked(getUpcomingCalendarTasks).mockResolvedValue({
            success: [task({ time: null, notifyAt: new Date(NOW - MINUTE).toISOString() })],
        });
        renderHub();
        await flush();

        expect(shown).toHaveLength(1);
        expect(shown[0].options.body).toContain("CalendarAllDay");
    });

    test("shows straight away a reminder missed by less than an hour", async () => {
        const shown = installNotification("granted");
        vi.mocked(getUpcomingCalendarTasks).mockResolvedValue({
            success: [task({ notifyAt: new Date(NOW - 59 * MINUTE).toISOString() })],
        });
        renderHub();
        await flush();

        expect(shown).toHaveLength(1);
    });

    test("drops a reminder more than an hour late: the email has it by then", async () => {
        const shown = installNotification("granted");
        vi.mocked(getUpcomingCalendarTasks).mockResolvedValue({
            success: [task({ notifyAt: new Date(NOW - 61 * MINUTE).toISOString() })],
        });
        renderHub();
        await flush();
        await flush(60 * MINUTE);

        expect(shown).toHaveLength(0);
    });

    test("never shows the same reminder twice, across polls and across a remount", async () => {
        const shown = installNotification("granted");
        vi.mocked(getUpcomingCalendarTasks).mockResolvedValue({
            success: [task({ notifyAt: new Date(NOW - 5 * MINUTE).toISOString() })],
        });
        const first = renderHub();
        await flush();
        expect(shown).toHaveLength(1);

        // The ten-minute poll brings the same task back.
        await flush(10 * MINUTE);
        expect(getUpcomingCalendarTasks).toHaveBeenCalledTimes(2);
        expect(shown).toHaveLength(1);

        // A reload, or a second tab: the dedupe list lives in storage.
        first.unmount();
        renderHub();
        await flush();
        expect(shown).toHaveLength(1);
    });

    test("an edited task with a new instant reminds again", async () => {
        const shown = installNotification("granted");
        vi.mocked(getUpcomingCalendarTasks).mockResolvedValue({
            success: [task({ notifyAt: new Date(NOW - 5 * MINUTE).toISOString() })],
        });
        renderHub();
        await flush();
        expect(shown).toHaveLength(1);

        vi.mocked(getUpcomingCalendarTasks).mockResolvedValue({
            success: [task({ notifyAt: new Date(NOW + 20 * MINUTE).toISOString() })],
        });
        act(() => requestReminderResync());
        await flush(20 * MINUTE);

        expect(shown).toHaveLength(2);
    });

    test("fetches again when the tab comes back into view", async () => {
        installNotification("granted");
        renderHub();
        await flush();
        expect(getUpcomingCalendarTasks).toHaveBeenCalledTimes(1);

        Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
        act(() => {
            document.dispatchEvent(new Event("visibilitychange"));
        });
        await flush();

        expect(getUpcomingCalendarTasks).toHaveBeenCalledTimes(2);
    });

    test("stops every timer on unmount", async () => {
        const shown = installNotification("granted");
        const view = renderHub();
        await flush();
        view.unmount();

        await flush(30 * MINUTE);
        expect(shown).toHaveLength(0);
    });
});

describe("clicking a reminder", () => {
    test("opens the calendar on the task's day, acknowledges it and closes the card", async () => {
        const shown = installNotification("granted");
        const focus = vi.spyOn(window, "focus").mockImplementation(() => undefined);
        vi.mocked(getUpcomingCalendarTasks).mockResolvedValue({
            success: [task({ notifyAt: new Date(NOW - MINUTE).toISOString() })],
        });
        renderHub();
        await flush();
        expect(screen.getByTestId("where")).toHaveTextContent("/dashboard");

        act(() => {
            shown[0].instance.onclick?.();
        });
        await flush();

        expect(focus).toHaveBeenCalled();
        expect(screen.getByTestId("where")).toHaveTextContent("/calendar?date=2026-10-14");
        expect(acknowledgeCalendarTask).toHaveBeenCalledWith("t1", expect.anything());
        expect(shown[0].close).toHaveBeenCalled();
    });
});

/**
 * AE4 from the browser's side. A card left in the notification centre outlives its reminder when
 * the task moves: the server clears the acknowledgement and arms the new instant. Acking from the
 * old card would cancel the NEW reminder on both channels, so the old card must neither ack nor
 * stay up.
 */
describe("a card that outlived its reminder", () => {
    const moved = () =>
        task({ date: "2026-10-15", time: "15:00", notifyAt: new Date(NOW + 20 * 60 * MINUTE).toISOString() });

    test("comes down once its task has moved", async () => {
        const shown = installNotification("granted");
        vi.mocked(getUpcomingCalendarTasks).mockResolvedValue({
            success: [task({ notifyAt: new Date(NOW - MINUTE).toISOString() })],
        });
        renderHub();
        await flush();
        expect(shown).toHaveLength(1);

        vi.mocked(getUpcomingCalendarTasks).mockResolvedValue({ success: [moved()] });
        act(() => requestReminderResync());
        await flush();

        expect(shown[0].close).toHaveBeenCalled();
    });

    test("a click on it opens the calendar but does not acknowledge the moved reminder", async () => {
        const shown = installNotification("granted");
        vi.spyOn(window, "focus").mockImplementation(() => undefined);
        vi.mocked(getUpcomingCalendarTasks).mockResolvedValue({
            success: [task({ notifyAt: new Date(NOW - MINUTE).toISOString() })],
        });
        renderHub();
        await flush();

        // Moved on another device: this tab has not polled since.
        vi.mocked(getUpcomingCalendarTasks).mockResolvedValue({ success: [moved()] });
        act(() => {
            shown[0].instance.onclick?.();
        });
        await flush();

        expect(screen.getByTestId("where")).toHaveTextContent("/calendar?date=2026-10-14");
        expect(acknowledgeCalendarTask).not.toHaveBeenCalled();
    });
});

/** A stand-in BroadcastChannel: every open channel, and what was posted. */
const installChannel = () => {
    const open = new Set<{ onmessage: ((event: MessageEvent) => void) | null }>();
    const posted: unknown[] = [];
    class FakeChannel {
        onmessage: ((event: MessageEvent) => void) | null = null;
        constructor(public name: string) {
            open.add(this);
        }
        postMessage(data: unknown) {
            posted.push(data);
        }
        close() {
            open.delete(this);
        }
    }
    vi.stubGlobal("BroadcastChannel", FakeChannel);
    return {
        posted,
        deliver: (data: unknown) => open.forEach((channel) => channel.onmessage?.({ data } as MessageEvent)),
    };
};

describe("other tabs", () => {
    test("a write announced by another tab makes this one fetch again", async () => {
        installNotification("granted");
        const channel = installChannel();
        renderHub();
        await flush();
        expect(getUpcomingCalendarTasks).toHaveBeenCalledTimes(1);

        act(() => channel.deliver({ type: "resync", from: "another-tab" }));
        await flush();

        expect(getUpcomingCalendarTasks).toHaveBeenCalledTimes(2);
    });

    test("tells the other tabs about this tab's writes, and ignores its own echo", async () => {
        installNotification("granted");
        const channel = installChannel();
        renderHub();
        await flush();

        act(() => requestReminderResync());
        await flush();
        expect(getUpcomingCalendarTasks).toHaveBeenCalledTimes(2);
        expect(channel.posted).toHaveLength(1);

        act(() => channel.deliver(channel.posted[0]));
        await flush();
        expect(getUpcomingCalendarTasks).toHaveBeenCalledTimes(2);
    });
});

describe("staying silent", () => {
    test("asks the server nothing while notifications are not granted", async () => {
        for (const permission of ["default", "denied"] as const) {
            const shown = installNotification(permission);
            const view = renderHub();
            await flush(60 * MINUTE);

            expect(getNotificationPreferences).not.toHaveBeenCalled();
            expect(getUpcomingCalendarTasks).not.toHaveBeenCalled();
            expect(shown).toHaveLength(0);
            view.unmount();
        }
    });

    test("does nothing in a browser without the Notification API", async () => {
        renderHub();
        await flush(60 * MINUTE);

        expect(getUpcomingCalendarTasks).not.toHaveBeenCalled();
    });

    test("does nothing when the account turned browser reminders off", async () => {
        const shown = installNotification("granted");
        vi.mocked(getNotificationPreferences).mockResolvedValue({
            data: { engagementEmail: true, reminderEmail: true, reminderWeb: false, reminderDefaultTime: "09:00" },
        });
        renderHub();
        await flush(60 * MINUTE);

        expect(getNotificationPreferences).toHaveBeenCalledTimes(1);
        expect(getUpcomingCalendarTasks).not.toHaveBeenCalled();
        expect(shown).toHaveLength(0);
    });

    test("starts as soon as the configuration turns browser reminders on", async () => {
        const shown = installNotification("granted");
        vi.mocked(getNotificationPreferences).mockResolvedValue({
            data: { engagementEmail: true, reminderEmail: true, reminderWeb: false, reminderDefaultTime: "09:00" },
        });
        vi.mocked(getUpcomingCalendarTasks).mockResolvedValue({
            success: [task({ notifyAt: new Date(NOW - MINUTE).toISOString() })],
        });
        renderHub();
        await flush();
        expect(getUpcomingCalendarTasks).not.toHaveBeenCalled();

        act(() => announceReminderPreferences({ reminderWeb: true }));
        await flush();

        expect(shown).toHaveLength(1);
    });
});
