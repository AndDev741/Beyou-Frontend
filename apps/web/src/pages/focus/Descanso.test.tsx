import { act, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import { renderWithProviders } from "../../test/test-utils";
import Descanso from "./Descanso";

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);

const routineWithNoon = {
    id: "r1",
    name: "Day",
    iconId: "",
    routineSections: [
        {
            id: "s1", name: "Noon", iconId: "", startTime: "12:00", endTime: "13:00", order: 0,
            taskGroup: [],
            habitGroup: [{ id: "hg1", habitId: "h1", startTime: "12:00", endTime: "13:00", habitGroupChecks: [] }],
        },
    ],
};

const buildStore = (overrides: Record<string, unknown> = {}) =>
    configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            habits: { ...baseState.habits, habits: [{ id: "h1", name: "Read", iconId: "" }] as never },
            ...overrides,
        },
    });

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 28, 9, 5, 0));
});

afterEach(() => {
    vi.useRealTimers();
});

describe("the clock", () => {
    test("shows the wall clock, zero-padded", () => {
        renderWithProviders(<Descanso />, { storeOverride: buildStore() });

        expect(screen.getByTestId("focus-descanso-clock")).toHaveTextContent("09:05");
    });

    test("ticks on the minute boundary, not every second", async () => {
        // A second hand is something to watch, and this is the one screen whose job is to be
        // ignorable. The timer is also aligned, so the digits change WHEN the clock does.
        renderWithProviders(<Descanso />, { storeOverride: buildStore() });

        await act(async () => {
            vi.setSystemTime(new Date(2026, 7, 28, 9, 5, 30));
            await vi.advanceTimersByTimeAsync(30_000);
        });
        expect(screen.getByTestId("focus-descanso-clock")).toHaveTextContent("09:05");

        await act(async () => {
            vi.setSystemTime(new Date(2026, 7, 28, 9, 6, 0));
            await vi.advanceTimersByTimeAsync(30_000);
        });
        expect(screen.getByTestId("focus-descanso-clock")).toHaveTextContent("09:06");
    });
});

describe("what it says about the day", () => {
    test("names what comes next, and when", () => {
        renderWithProviders(<Descanso />, {
            storeOverride: buildStore({ todayRoutine: { routine: routineWithNoon as never } }),
        });

        const next = screen.getByTestId("focus-descanso-next");
        expect(next).toHaveTextContent("Read");
        expect(next).toHaveTextContent("FocusNextAt");
    });

    test("with no routine at all it still works, and says so", () => {
        // The button is offered with or without a routine, on the user's instruction: a screen to
        // rest matters most on a day with nothing scheduled.
        renderWithProviders(<Descanso />, { storeOverride: buildStore() });

        expect(screen.getByTestId("focus-descanso")).toBeInTheDocument();
        expect(screen.getByTestId("focus-descanso-empty")).toBeInTheDocument();
        expect(screen.queryByTestId("focus-descanso-next")).not.toBeInTheDocument();
    });
});

describe("dimming", () => {
    test("fades itself down after a quiet spell", async () => {
        renderWithProviders(<Descanso />, { storeOverride: buildStore() });
        expect(screen.getByTestId("focus-descanso")).toHaveAttribute("data-dimmed", "false");

        await act(async () => {
            await vi.advanceTimersByTimeAsync(26_000);
        });

        expect(screen.getByTestId("focus-descanso")).toHaveAttribute("data-dimmed", "true");
        expect(screen.getByTestId("focus-descanso-hint")).toBeInTheDocument();
    });

    test("any pointer or key brings it back", async () => {
        renderWithProviders(<Descanso />, { storeOverride: buildStore() });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(26_000);
        });
        expect(screen.getByTestId("focus-descanso")).toHaveAttribute("data-dimmed", "true");

        await act(async () => {
            window.dispatchEvent(new Event("pointermove"));
        });

        expect(screen.getByTestId("focus-descanso")).toHaveAttribute("data-dimmed", "false");
        expect(screen.queryByTestId("focus-descanso-hint")).not.toBeInTheDocument();
    });
});

describe("the ambient layer", () => {
    test("is inert, so decoration can never eat a tap", () => {
        renderWithProviders(<Descanso />, { storeOverride: buildStore() });

        const layer = screen.getByTestId("focus-descanso").querySelector('[aria-hidden="true"]');
        expect(layer).not.toBeNull();
        expect(layer?.className).toContain("pointer-events-none");
    });

    test("is drawn from theme tokens, with no hardcoded colour", () => {
        // Nine themes, and the blooms have to follow a live theme change. The CSS reads
        // --accent-rgb and --xp-rgb; the classes are what wire it up.
        renderWithProviders(<Descanso />, { storeOverride: buildStore() });

        const blooms = screen
            .getByTestId("focus-descanso")
            .querySelectorAll(".rest-bloom");
        expect(blooms).toHaveLength(3);
        blooms.forEach((bloom) => {
            expect(bloom.getAttribute("style")).toBeNull();
        });
    });
});

describe("the wake lock", () => {
    test("is asked for when the browser has one, and released on the way out", async () => {
        const release = vi.fn().mockResolvedValue(undefined);
        const request = vi.fn().mockResolvedValue({ release });
        Object.defineProperty(navigator, "wakeLock", {
            value: { request },
            configurable: true,
        });

        const { unmount } = renderWithProviders(<Descanso />, { storeOverride: buildStore() });
        await act(async () => {});
        expect(request).toHaveBeenCalledWith("screen");

        unmount();
        await act(async () => {});
        expect(release).toHaveBeenCalled();

        Reflect.deleteProperty(navigator, "wakeLock");
    });

    test("a browser without one renders exactly the same", () => {
        // Chrome-only and refused on a hidden tab. Every failure path is a screen that dims on
        // its own schedule, which is the pre-existing behaviour.
        expect("wakeLock" in navigator).toBe(false);

        renderWithProviders(<Descanso />, { storeOverride: buildStore() });

        expect(screen.getByTestId("focus-descanso-clock")).toBeInTheDocument();
    });

    test("a refusal is swallowed rather than surfacing", async () => {
        const request = vi.fn().mockRejectedValue(new Error("not allowed"));
        Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });

        renderWithProviders(<Descanso />, { storeOverride: buildStore() });
        await act(async () => {});

        expect(screen.getByTestId("focus-descanso-clock")).toBeInTheDocument();

        Reflect.deleteProperty(navigator, "wakeLock");
    });
});
