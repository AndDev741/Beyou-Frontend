import { act, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import { renderWithProviders } from "../../test/test-utils";

vi.mock("@beyou/api/routine/checkItem", () => ({ __esModule: true, default: vi.fn() }));
vi.mock("@beyou/api/routine/skipItem", () => ({ __esModule: true, default: vi.fn() }));

import checkRoutine from "@beyou/api/routine/checkItem";
import skipRoutine from "@beyou/api/routine/skipItem";
import Ultrafoco from "./Ultrafoco";

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);
const today = new Date().toJSON().slice(0, 10);

const habits = [
    { id: "h1", name: "Drink water", iconId: "lucide:droplet" },
    { id: "h2", name: "Read", iconId: "lucide:book" },
    { id: "h3", name: "Stretch", iconId: "lucide:activity" },
];

/** Morning 06:00, noon 12:00, evening 20:00 — one habit each. */
const dailyRoutine = {
    id: "r1",
    name: "Day",
    iconId: "",
    routineSections: [
        {
            id: "s1", name: "Morning", iconId: "", startTime: "06:00", endTime: "07:00", order: 0,
            taskGroup: [],
            habitGroup: [{ id: "hg1", habitId: "h1", startTime: "06:00", endTime: "07:00", habitGroupChecks: [] }],
        },
        {
            id: "s2", name: "Noon", iconId: "", startTime: "12:00", endTime: "13:00", order: 1,
            taskGroup: [],
            habitGroup: [{ id: "hg2", habitId: "h2", startTime: "12:00", endTime: "13:00", habitGroupChecks: [] }],
        },
        {
            id: "s3", name: "Evening", iconId: "", startTime: "20:00", endTime: "21:00", order: 2,
            taskGroup: [],
            habitGroup: [{ id: "hg3", habitId: "h3", startTime: "20:00", endTime: "21:00", habitGroupChecks: [] }],
        },
    ],
};

const listRoutine = {
    id: "r2",
    name: "List",
    iconId: "",
    type: "LIST",
    routineSections: [
        {
            id: "s1", name: "List", iconId: "", startTime: "", endTime: "", order: 0,
            taskGroup: [],
            habitGroup: [
                { id: "hg1", habitId: "h1", startTime: "", habitGroupChecks: [] },
                { id: "hg2", habitId: "h2", startTime: "", habitGroupChecks: [] },
            ],
        },
    ],
    items: [
        { id: "hg1", type: "HABIT", habitId: "h1", orderIndex: 0 },
        { id: "hg2", type: "HABIT", habitId: "h2", orderIndex: 1 },
    ],
};

const buildStore = () =>
    configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            habits: { ...baseState.habits, habits: habits as never },
            focus: { mode: "ultrafoco" as const, selectedIndex: -1, manuallySelected: false },
        },
    });

/** Freeze the wall clock so the resolver's answer is not a function of when CI runs. */
const atClock = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    vi.setSystemTime(new Date(2026, 7, 28, h, m, 0));
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(checkRoutine).mockResolvedValue({ success: {} as never });
    vi.mocked(skipRoutine).mockResolvedValue({ success: {} as never });
});

describe("Ultrafoco opens where the clock points", () => {
    // The badge asserts the raw i18n key: this suite renders keys, not translations.
    test("inside a window, on that item, badged Now", async () => {
        atClock("12:30");
        renderWithProviders(<Ultrafoco routine={dailyRoutine as never} />, { storeOverride: buildStore() });

        await waitFor(() => expect(screen.getByText("Read")).toBeInTheDocument());
        expect(screen.getByTestId("focus-ultra-reason")).toHaveTextContent("FocusNowLabel");
    });

    test("in a gap, on what comes next, and it says so rather than claiming Now", async () => {
        atClock("09:00");
        renderWithProviders(<Ultrafoco routine={dailyRoutine as never} />, { storeOverride: buildStore() });

        await waitFor(() => expect(screen.getByText("Read")).toBeInTheDocument());
        expect(screen.getByTestId("focus-ultra-reason")).toHaveTextContent("FocusNextLabel");
    });

    test("late at night, on the evening rather than the morning, with no reprimand", async () => {
        atClock("23:30");
        renderWithProviders(<Ultrafoco routine={dailyRoutine as never} />, { storeOverride: buildStore() });

        await waitFor(() => expect(screen.getByText("Stretch")).toBeInTheDocument());
        // "Still open", never "overdue": the gamification is not allowed to scold.
        expect(screen.getByTestId("focus-ultra-reason")).toHaveTextContent("FocusOpenLabel");
    });
});

describe("the clock never overrules the person", () => {
    test("stepping back reaches an item whose window has passed, and it stays there", async () => {
        atClock("12:30");
        const store = buildStore();
        renderWithProviders(<Ultrafoco routine={dailyRoutine as never} />, { storeOverride: store });
        await waitFor(() => expect(screen.getByText("Read")).toBeInTheDocument());

        await userEvent.click(screen.getByTestId("focus-ultra-prev"));

        expect(screen.getByText("Drink water")).toBeInTheDocument();
        expect(store.getState().focus.manuallySelected).toBe(true);
    });

    test("an item whose window has NOT arrived can be checked right now", async () => {
        // The freedom rule at its sharpest: nothing about the evening item is disabled at
        // half past noon, and no warning appears.
        atClock("12:30");
        renderWithProviders(<Ultrafoco routine={dailyRoutine as never} />, { storeOverride: buildStore() });
        await waitFor(() => expect(screen.getByText("Read")).toBeInTheDocument());

        await userEvent.click(screen.getByTestId("focus-ultra-next"));
        expect(screen.getByText("Stretch")).toBeInTheDocument();

        const checkButton = screen.getByTestId("focus-ultra-check");
        expect(checkButton).not.toBeDisabled();
        await userEvent.click(checkButton);

        expect(checkRoutine).toHaveBeenCalledWith(
            expect.objectContaining({
                routineId: "r1",
                habitGroupDTO: expect.objectContaining({ habitGroupId: "hg3" }),
            }),
            expect.anything()
        );
    });

    test("the clock moving on updates the badge but NOT a hand-picked item", async () => {
        // The rule with the clock actually moving, which is the only way it can be broken.
        // 11:59 in a gap, then 12:01 with the noon window open: the resolver's answer changes,
        // the reducer refuses to move a manual selection, and the badge follows the clock
        // because it describes the item on screen rather than the choice.
        atClock("11:59");
        const store = buildStore();
        renderWithProviders(<Ultrafoco routine={dailyRoutine as never} />, { storeOverride: store });
        await waitFor(() => expect(screen.getByText("Read")).toBeInTheDocument());

        await userEvent.click(screen.getByTestId("focus-ultra-prev"));
        expect(screen.getByText("Drink water")).toBeInTheDocument();

        // Jump to the evening, so the resolver's ANSWER changes and not merely its reason.
        // 12:01 would have been a weaker test: the index it returns at 11:59 and at 12:01 is
        // the same (noon), only the badge differs, so nothing would have been re-offered and
        // the guard would never have been asked.
        atClock("20:30");
        await act(async () => {
            await vi.advanceTimersByTimeAsync(31_000);
        });

        // Still on the item the person chose, at an hour that points somewhere else entirely.
        expect(screen.getByText("Drink water")).toBeInTheDocument();
        expect(store.getState().focus.selectedIndex).toBe(0);
        // And the badge tells the truth about the evening window being open.
        expect(screen.getByTestId("focus-ultra-reason")).toHaveTextContent("FocusNowLabel");
    });

    test("the picker jumps straight to any item of the day", async () => {
        atClock("23:30");
        renderWithProviders(<Ultrafoco routine={dailyRoutine as never} />, { storeOverride: buildStore() });
        await waitFor(() => expect(screen.getByText("Stretch")).toBeInTheDocument());

        await userEvent.click(screen.getByTestId("focus-ultra-picker-toggle"));
        await userEvent.click(screen.getByTestId("focus-ultra-pick-hg1"));

        expect(screen.getByText("Drink water")).toBeInTheDocument();
        expect(screen.queryByTestId("focus-ultra-picker")).not.toBeInTheDocument();
    });
});

describe("a LIST routine is the normal case, not a special case", () => {
    test("opens on the first item at any hour, with no invented time", async () => {
        atClock("23:30");
        renderWithProviders(<Ultrafoco routine={listRoutine as never} />, { storeOverride: buildStore() });

        await waitFor(() => expect(screen.getByText("Drink water")).toBeInTheDocument());
        // No window to show, and nothing pretending there is one.
        expect(screen.getByTestId("focus-ultra-window")).toHaveTextContent("FocusAnyTime");
    });

    test("navigates by the dragged order", async () => {
        atClock("10:00");
        renderWithProviders(<Ultrafoco routine={listRoutine as never} />, { storeOverride: buildStore() });
        await waitFor(() => expect(screen.getByText("Drink water")).toBeInTheDocument());

        await userEvent.click(screen.getByTestId("focus-ultra-next"));

        expect(screen.getByText("Read")).toBeInTheDocument();
    });
});

describe("Ultrafoco edge states", () => {
    test("a routine with no items says so, instead of rendering a blank card", async () => {
        const empty = { id: "r3", name: "Empty", iconId: "", routineSections: [] };
        renderWithProviders(<Ultrafoco routine={empty as never} />, { storeOverride: buildStore() });

        expect(await screen.findByTestId("focus-ultra-empty")).toBeInTheDocument();
    });

    test("a finished day is reported as finished, with no tally of what was skipped", async () => {
        const done = {
            ...dailyRoutine,
            routineSections: dailyRoutine.routineSections.map((section) => ({
                ...section,
                habitGroup: section.habitGroup.map((group) => ({
                    ...group,
                    habitGroupChecks: [{ id: "c", checkDate: today, checked: true, xpGenerated: 5 }],
                })),
            })),
        };
        renderWithProviders(<Ultrafoco routine={done as never} />, { storeOverride: buildStore() });

        expect(await screen.findByTestId("focus-ultra-done")).toBeInTheDocument();
    });
});
