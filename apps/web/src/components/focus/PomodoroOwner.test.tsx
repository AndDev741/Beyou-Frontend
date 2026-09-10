import { act, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import {
    pomodoroAbandoned,
    pomodoroSettingsChanged,
    pomodoroSkipped,
    pomodoroStarted,
} from "@beyou/state";
import { renderWithProviders } from "../../test/test-utils";

vi.mock("@beyou/api/focus/focusApi", () => ({
    recordFocusCycle: vi.fn(),
}));

// The alert channels are mocked wholesale: jsdom has no AudioContext and no Notification, and what
// this suite checks is WHEN the owner calls them, not what they do (see notifyCycleEnd.test.ts).
vi.mock("./notifyCycleEnd", () => ({
    playCycleEndSound: vi.fn(),
    notifyCycleEnd: vi.fn(),
    primeCycleEndAlerts: vi.fn(),
}));

import { recordFocusCycle } from "@beyou/api/focus/focusApi";
import { notifyCycleEnd, playCycleEndSound } from "./notifyCycleEnd";
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

    describe("the alert when a cycle runs out", () => {
        test("beeps and posts a notification when a pomodoro ends, worded for a break coming", async () => {
            const store = buildStore();
            renderWithProviders(<PomodoroOwner />, { storeOverride: store });
            act(() => {
                startCycle(store);
            });

            await jump(25 * 60_000);

            expect(playCycleEndSound).toHaveBeenCalledTimes(1);
            expect(playCycleEndSound).toHaveBeenCalledWith("pomodoro");
            expect(notifyCycleEnd).toHaveBeenCalledTimes(1);
            // The i18n stub returns keys, so the wording is asserted by key.
            expect(notifyCycleEnd).toHaveBeenCalledWith({
                title: "FocusCyclePomodoro",
                body: "FocusPomodoroEnded",
            });
        });

        test("a break ending is worded as back to work", async () => {
            const store = buildStore();
            renderWithProviders(<PomodoroOwner />, { storeOverride: store });
            act(() => {
                store.dispatch(
                    pomodoroStarted({ groupId: "hg1", kind: "shortBreak", minutes: 5, now: Date.now(), date: DATE }),
                );
            });

            await jump(5 * 60_000);

            expect(playCycleEndSound).toHaveBeenCalledWith("shortBreak");
            expect(notifyCycleEnd).toHaveBeenCalledWith({
                title: "FocusCycleShortBreak",
                body: "FocusBreakEnded",
            });
        });

        test("honours both switches independently", async () => {
            const store = buildStore();
            renderWithProviders(<PomodoroOwner />, { storeOverride: store });
            act(() => {
                store.dispatch(pomodoroSettingsChanged({ soundEnabled: false, notifyEnabled: true }));
                startCycle(store);
            });
            await jump(25 * 60_000);
            expect(playCycleEndSound).not.toHaveBeenCalled();
            expect(notifyCycleEnd).toHaveBeenCalledTimes(1);

            vi.clearAllMocks();
            act(() => {
                store.dispatch(pomodoroSettingsChanged({ soundEnabled: true, notifyEnabled: false }));
                startCycle(store);
            });
            await jump(25 * 60_000);
            expect(playCycleEndSound).toHaveBeenCalledTimes(1);
            expect(notifyCycleEnd).not.toHaveBeenCalled();
            // The handover itself never depends on the switches.
            expect(recordFocusCycle).toHaveBeenCalledTimes(1);
        });

        test("a skipped or abandoned cycle makes no sound", async () => {
            const store = buildStore();
            renderWithProviders(<PomodoroOwner />, { storeOverride: store });
            act(() => {
                startCycle(store);
            });
            await jump(60_000);
            act(() => {
                store.dispatch(pomodoroSkipped());
            });
            await jump(30 * 60_000);
            act(() => {
                startCycle(store);
            });
            act(() => {
                store.dispatch(pomodoroAbandoned());
            });
            await jump(30 * 60_000);

            expect(playCycleEndSound).not.toHaveBeenCalled();
            expect(notifyCycleEnd).not.toHaveBeenCalled();
        });

        test("fires once when the interval and the timeout both see the same ending", async () => {
            // Walk the fake clock through every second so the one-second interval AND the timeout
            // aimed at `endsAt` both land at the crossing. One cycle, one beep.
            const store = buildStore();
            renderWithProviders(<PomodoroOwner />, { storeOverride: store });
            act(() => {
                startCycle(store);
            });

            await act(async () => {
                await vi.advanceTimersByTimeAsync(25 * 60_000 + 1_000);
            });

            expect(playCycleEndSound).toHaveBeenCalledTimes(1);
            expect(notifyCycleEnd).toHaveBeenCalledTimes(1);
            expect(recordFocusCycle).toHaveBeenCalledTimes(1);
        });

        test("the timeout alone lands the alert on time when the interval is throttled", async () => {
            // A background tab runs its interval about once a minute. With the interval silenced
            // entirely, the timeout aimed at `endsAt` must still beep at the exact moment and
            // wake the handover.
            vi.spyOn(globalThis, "setInterval").mockImplementation((() => 0) as never);
            const store = buildStore();
            renderWithProviders(<PomodoroOwner />, { storeOverride: store });
            act(() => {
                startCycle(store);
            });

            await act(async () => {
                await vi.advanceTimersByTimeAsync(25 * 60_000 - 1_000);
            });
            expect(playCycleEndSound).not.toHaveBeenCalled();

            await act(async () => {
                await vi.advanceTimersByTimeAsync(1_000);
            });
            expect(playCycleEndSound).toHaveBeenCalledTimes(1);
            expect(store.getState().focus.timer).toMatchObject({ kind: "shortBreak", finished: true });
        });

        test("the timeout is taken back when the cycle is stopped early", async () => {
            vi.spyOn(globalThis, "setInterval").mockImplementation((() => 0) as never);
            const store = buildStore();
            renderWithProviders(<PomodoroOwner />, { storeOverride: store });
            act(() => {
                startCycle(store);
            });
            act(() => {
                store.dispatch(pomodoroAbandoned());
            });

            await act(async () => {
                await vi.advanceTimersByTimeAsync(30 * 60_000);
            });

            expect(playCycleEndSound).not.toHaveBeenCalled();
        });

        test("an ending noticed long after the fact hands over in silence", async () => {
            // The tab was closed or the laptop slept through the end: the cycle still completes
            // and is still reported, but a beep about something five minutes old would only confuse.
            const store = buildStore();
            act(() => {
                startCycle(store);
            });
            vi.setSystemTime(Date.now() + 40 * 60_000);
            renderWithProviders(<PomodoroOwner />, { storeOverride: store });
            await act(async () => {
                await vi.advanceTimersByTimeAsync(1_000);
            });

            expect(recordFocusCycle).toHaveBeenCalledTimes(1);
            expect(playCycleEndSound).not.toHaveBeenCalled();
            expect(notifyCycleEnd).not.toHaveBeenCalled();
        });
    });
});
