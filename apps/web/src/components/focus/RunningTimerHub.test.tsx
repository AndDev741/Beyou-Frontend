import { screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import { pomodoroStarted, pomodoroPaused } from "@beyou/state";
import { renderWithProviders } from "../../test/test-utils";
import RunningTimerHub from "./RunningTimerHub";

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);
const NOW = new Date(2026, 7, 28, 10, 0, 0);
const DATE = "2026-08-28";

const storeWithCycle = (paused = false) => {
    const store = configureStore({ reducer: rootReducer, preloadedState: baseState });
    store.dispatch(
        pomodoroStarted({
            groupId: "hg1",
            kind: "pomodoro",
            minutes: 25,
            now: NOW.getTime(),
            date: DATE,
        })
    );
    if (paused) store.dispatch(pomodoroPaused({ now: NOW.getTime() + 60_000 }));
    return store;
};

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("when a cycle is live", () => {
    test("shows the remaining time and what kind it is", () => {
        renderWithProviders(<RunningTimerHub />, { storeOverride: storeWithCycle(), route: "/dashboard" });

        expect(screen.getByTestId("focus-running-hub-remaining")).toHaveTextContent("25:00");
        expect(screen.getByTestId("focus-running-hub-kind")).toHaveTextContent("FocusCyclePomodoro");
    });

    test("links back to where the timer lives", () => {
        renderWithProviders(<RunningTimerHub />, { storeOverride: storeWithCycle(), route: "/habits" });

        expect(screen.getByTestId("focus-running-hub")).toHaveAttribute("href", "/focus");
    });

    test("says paused, and shows the frozen number", () => {
        renderWithProviders(<RunningTimerHub />, {
            storeOverride: storeWithCycle(true),
            route: "/dashboard",
        });

        expect(screen.getByTestId("focus-running-hub-kind")).toHaveTextContent("FocusPause");
        expect(screen.getByTestId("focus-running-hub-remaining")).toHaveTextContent("24:00");
    });

    test("counts down while it runs", async () => {
        renderWithProviders(<RunningTimerHub />, { storeOverride: storeWithCycle(), route: "/dashboard" });

        await vi.advanceTimersByTimeAsync(61_000);

        expect(screen.getByTestId("focus-running-hub-remaining")).toHaveTextContent("23:59");
    });
});

describe("when it should stay out of the way", () => {
    test("renders nothing with no cycle at all", () => {
        renderWithProviders(<RunningTimerHub />, {
            storeOverride: configureStore({ reducer: rootReducer, preloadedState: baseState }),
            route: "/dashboard",
        });

        expect(screen.queryByTestId("focus-running-hub")).not.toBeInTheDocument();
    });

    test("renders nothing ON the focus screen, where the real panel already is", () => {
        renderWithProviders(<RunningTimerHub />, { storeOverride: storeWithCycle(), route: "/focus" });

        expect(screen.queryByTestId("focus-running-hub")).not.toBeInTheDocument();
    });

    test("renders nothing once the cycle has run out", async () => {
        // An elapsed cycle is the focus screen's business: it has a handover to offer, and this
        // hub is read-only and has nothing to say about it.
        renderWithProviders(<RunningTimerHub />, { storeOverride: storeWithCycle(), route: "/dashboard" });

        vi.setSystemTime(new Date(NOW.getTime() + 26 * 60_000));
        await vi.advanceTimersByTimeAsync(1_000);

        expect(screen.queryByTestId("focus-running-hub")).not.toBeInTheDocument();
    });

    test("does not dispatch the cycle completion, which the focus screen owns", async () => {
        // Two dispatchers would race, and there would be two places arming a notification.
        const store = storeWithCycle();
        renderWithProviders(<RunningTimerHub />, { storeOverride: store, route: "/dashboard" });

        vi.setSystemTime(new Date(NOW.getTime() + 26 * 60_000));
        await vi.advanceTimersByTimeAsync(1_000);

        expect(store.getState().focus.timer?.finished).toBe(false);
        expect(store.getState().focus.timer?.kind).toBe("pomodoro");
    });
});
