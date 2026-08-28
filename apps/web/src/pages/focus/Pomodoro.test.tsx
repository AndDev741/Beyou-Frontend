import { act, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import type { FocusItem } from "@beyou/state";
import { renderWithProviders } from "../../test/test-utils";
import Pomodoro from "./Pomodoro";

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);
const DATE = "2026-08-28";

const item = (startTime?: string, endTime?: string, groupId = "hg1"): FocusItem =>
    ({ groupId, type: "habit", itemId: "h1", sectionName: "Morning", startTime, endTime } as FocusItem);

const buildStore = () => configureStore({ reducer: rootReducer, preloadedState: baseState });

/**
 * The clock is frozen and advanced by hand, so the countdown is never a function of when CI
 * runs.
 *
 * Deliberately NOT `{ shouldAdvanceTime: true }`: that lets the fake clock drift forward on its
 * own, and every arithmetic assertion here went unstable (a 24:00 read as 44:01). A frozen clock
 * is safe here because this repo is on user-event v13, which is synchronous and awaits no timers
 * of its own — the v14 `userEvent.setup({ advanceTimers })` pairing does not exist yet.
 */
beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 28, 10, 0, 0));
});

afterEach(() => {
    vi.useRealTimers();
});

/**
 * Jump the clock, then let ONE interval fire.
 *
 * Not `advanceTimersByTimeAsync(ms)`: the hook re-renders on a one-second interval, so walking
 * 25 minutes fires it 1500 times and re-renders 1500 times. That was expensive enough to starve
 * the sibling vitest workers when turbo runs every workspace at once, and five unrelated tests
 * in categories, goals and telemetry started timing out at 5000ms. Proven by hiding this file
 * and watching the full run go back to green.
 *
 * `setSystemTime` moves the clock without firing anything, so one tick afterwards is all it
 * takes to read the new value. It is also closer to the real case: a suspended tab that wakes.
 */
const jump = async (ms: number) => {
    vi.setSystemTime(Date.now() + ms);
    await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
    });
};

describe("the duration comes from the item, and stays editable", () => {
    test("pre-filled from the item's own window", () => {
        // Routine items carry startTime and endTime, so a scheduled item already says how long
        // its owner meant it to take. No duration field on Task or Habit is needed.
        renderWithProviders(<Pomodoro item={item("07:00", "07:45")} date={DATE} />, {
            storeOverride: buildStore(),
        });

        expect(screen.getByTestId("focus-pomodoro-minutes")).toHaveValue(45);
    });

    test("the classic 25 for an item with no window, which is every LIST item", () => {
        renderWithProviders(<Pomodoro item={item()} date={DATE} />, { storeOverride: buildStore() });

        expect(screen.getByTestId("focus-pomodoro-minutes")).toHaveValue(25);
    });

    test("a typed value is used, and clamped rather than obeyed blindly", async () => {
        const store = buildStore();
        renderWithProviders(<Pomodoro item={item("07:00", "07:45")} date={DATE} />, {
            storeOverride: store,
        });

        const field = screen.getByTestId("focus-pomodoro-minutes");
        await userEvent.clear(field);
        await userEvent.type(field, "300");
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));

        expect(store.getState().focus.timer?.durationMinutes).toBe(180);
    });
});

describe("running a cycle", () => {
    test("starts on an absolute end time and counts down from it", async () => {
        const store = buildStore();
        renderWithProviders(<Pomodoro item={item()} date={DATE} />, { storeOverride: store });

        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));

        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("25:00");
        expect(store.getState().focus.timer?.endsAt).toBe(Date.now() + 25 * 60_000);

        await jump(60_000);
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("23:59");
    });

    test("a long pause costs nothing", async () => {
        // The point of storing an end time rather than counting down: the pause freezes what is
        // left, and resuming recomputes the end from it, so twenty minutes away is free.
        renderWithProviders(<Pomodoro item={item()} date={DATE} />, { storeOverride: buildStore() });
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));

        await jump(59_000);
        await userEvent.click(screen.getByTestId("focus-pomodoro-pause"));
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("24:00");

        await jump(20 * 60_000);
        // Still 24:00 after twenty minutes of pause.
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("24:00");

        await userEvent.click(screen.getByTestId("focus-pomodoro-resume"));
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("24:00");
    });

    test("crossing zero finishes the cycle and offers a break the person has to start", async () => {
        const store = buildStore();
        renderWithProviders(<Pomodoro item={item()} date={DATE} />, { storeOverride: store });
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));

        await jump(25 * 60_000);

        expect(screen.getByTestId("focus-pomodoro-done")).toBeInTheDocument();
        expect(screen.getByTestId("focus-pomodoro-next")).toBeInTheDocument();
        // Not already running: nobody is pushed into a break they did not ask for.
        expect(store.getState().focus.timer).toMatchObject({ kind: "break", completedCycles: 1 });
    });

    test("nothing anywhere calls a finished cycle a failure", async () => {
        renderWithProviders(<Pomodoro item={item()} date={DATE} />, { storeOverride: buildStore() });
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));
        await jump(25 * 60_000);

        const panel = screen.getByTestId("focus-pomodoro");
        expect(panel.textContent ?? "").not.toMatch(/fail|miss|expire|lost|overdue/i);
    });

    test("stopping keeps nothing and counts nothing", async () => {
        const store = buildStore();
        renderWithProviders(<Pomodoro item={item()} date={DATE} />, { storeOverride: store });
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));
        await jump(25 * 60_000);
        expect(store.getState().focus.timer?.completedCycles).toBe(1);

        await userEvent.click(screen.getByTestId("focus-pomodoro-stop"));

        expect(store.getState().focus.timer).toBeNull();
        expect(screen.getByTestId("focus-pomodoro-start")).toBeInTheDocument();
        expect(screen.queryByTestId("focus-pomodoro-cycles")).not.toBeInTheDocument();
    });
});

describe("one timer at a time", () => {
    test("a cycle running on another item is shown, not hidden behind a fresh start button", async () => {
        // Hiding it meant the start control reappeared on the next item, and pressing it
        // silently replaced a cycle somebody was 18 minutes into.
        const store = buildStore();
        const { unmount } = renderWithProviders(<Pomodoro item={item("07:00", "07:45", "hg1")} date={DATE} />, {
            storeOverride: store,
        });
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));
        unmount();

        renderWithProviders(<Pomodoro item={item("12:00", "12:20", "hg2")} date={DATE} />, {
            storeOverride: store,
        });

        expect(screen.getByTestId("focus-pomodoro-remaining")).toBeInTheDocument();
        expect(screen.queryByTestId("focus-pomodoro-start")).not.toBeInTheDocument();
    });
});

describe("the tab says what is happening", () => {
    test("the title counts while a cycle runs, and is put back afterwards", async () => {
        const original = document.title;
        renderWithProviders(<Pomodoro item={item()} date={DATE} />, { storeOverride: buildStore() });

        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));
        expect(document.title).toContain("25:00");

        await userEvent.click(screen.getByTestId("focus-pomodoro-stop"));
        expect(document.title).toBe(original);
    });
});
