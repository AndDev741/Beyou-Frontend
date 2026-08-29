import { act, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import { pomodoroAbandoned, pomodoroSkipped, pomodoroStarted } from "@beyou/state";
import { renderWithProviders } from "../../test/test-utils";

vi.mock("@beyou/api/focus/focusApi", () => ({
    recordFocusCycle: vi.fn(),
}));

import { recordFocusCycle } from "@beyou/api/focus/focusApi";
import PomodoroOwner from "./PomodoroOwner";

/**
 * The completion owner, on its own — which is the case that used to be broken.
 *
 * `usePomodoro` used to finish the cycle, and it mounts only inside the Ultrafoco panel. Leave the
 * screen, or merely toggle to "whole routine", and a cycle that ran out was never reported and
 * never handed over. These tests mount NO panel at all.
 */
const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);
const buildStore = () => configureStore({ reducer: rootReducer, preloadedState: baseState });
const DATE = "2026-08-28";

const startCycle = (store: ReturnType<typeof buildStore>) =>
    store.dispatch(
        pomodoroStarted({ groupId: "hg1", kind: "pomodoro", minutes: 25, now: Date.now(), date: DATE }),
    );

const jump = async (ms: number) => {
    vi.setSystemTime(Date.now() + Math.max(0, ms - 1_000));
    await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
    });
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(recordFocusCycle).mockResolvedValue({ success: {} as never });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 28, 10, 0, 0));
});

afterEach(() => {
    vi.useRealTimers();
});

describe("PomodoroOwner", () => {
    test("finishes and reports a cycle with no panel on screen", async () => {
        const store = buildStore();
        renderWithProviders(<PomodoroOwner />, { storeOverride: store });
        act(() => {
            startCycle(store);
        });

        await jump(25 * 60_000);

        expect(recordFocusCycle).toHaveBeenCalledTimes(1);
        expect(recordFocusCycle).toHaveBeenCalledWith(
            expect.objectContaining({ itemGroupId: "hg1", kind: "POMODORO", minutes: 25 }),
            expect.anything(),
        );
        expect(store.getState().focus.timer).toMatchObject({ kind: "shortBreak", finished: true, rounds: 1 });
    });

    test("renders nothing, so it can ride every route", () => {
        const { container } = renderWithProviders(<PomodoroOwner />, { storeOverride: buildStore() });
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    test("a skipped or abandoned cycle is never reported", async () => {
        const store = buildStore();
        renderWithProviders(<PomodoroOwner />, { storeOverride: store });
        act(() => {
            startCycle(store);
        });
        await jump(60_000);
        act(() => {
            store.dispatch(pomodoroSkipped());
        });
        await jump(60_000);
        act(() => {
            store.dispatch(pomodoroAbandoned());
        });
        await jump(60_000);

        expect(recordFocusCycle).not.toHaveBeenCalled();
    });

    test("reports once even when the clock is read many times past zero", async () => {
        // The handover sets `finished`, and `finished` is what this effect checks — so a second
        // tick, a re-render, or a remount cannot report the same cycle again.
        const store = buildStore();
        renderWithProviders(<PomodoroOwner />, { storeOverride: store });
        act(() => {
            startCycle(store);
        });

        await jump(25 * 60_000);
        await jump(60_000);
        await jump(60_000);

        expect(recordFocusCycle).toHaveBeenCalledTimes(1);
    });
});
