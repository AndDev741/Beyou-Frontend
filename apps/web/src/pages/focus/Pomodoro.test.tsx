import { act, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { configureStore } from "@reduxjs/toolkit";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import type { FocusItem } from "@beyou/state";
import { renderWithProviders } from "../../test/test-utils";

// MicroTasks renders inside this panel, and this suite runs on a frozen clock. The real library
// schedules through rAF and never settles here. See `src/test/dndStub.tsx`.
vi.mock("react-beautiful-dnd", async () => (await import("../../test/dndStub")).dndStub);

vi.mock("@beyou/api/focus/focusApi", () => ({
    listFocusMicroTasks: vi.fn().mockResolvedValue({ success: [] }),
    addFocusMicroTask: vi.fn(),
    toggleFocusMicroTask: vi.fn(),
    pinFocusMicroTask: vi.fn(),
    deleteFocusMicroTask: vi.fn(),
    recordFocusCycle: vi.fn().mockResolvedValue({ success: {} }),
    getFocusDay: vi.fn(),
}));

import { addFocusMicroTask, listFocusMicroTasks, recordFocusCycle } from "@beyou/api/focus/focusApi";
import Pomodoro from "./Pomodoro";
import PomodoroOwner from "../../components/focus/PomodoroOwner";

/**
 * The panel as it exists in production: never alone. `PomodoroOwner` rides the app shell and is
 * the only thing that finishes a cycle, so every test that walks a cycle to zero mounts both. A
 * test that rendered the panel by itself would wait for a handover that no longer comes from it.
 */
const Panel = (props: ComponentProps<typeof Pomodoro>) => (
    <>
        <PomodoroOwner />
        <Pomodoro {...props} />
    </>
);

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);
const DATE = "2026-08-28";

const item = (startTime?: string, endTime?: string, groupId = "hg1"): FocusItem =>
    ({ groupId, type: "habit", itemId: "h1", sectionName: "Morning", startTime, endTime } as FocusItem);

const buildStore = () => configureStore({ reducer: rootReducer, preloadedState: baseState });

/**
 * The clock is frozen and advanced by hand, so the countdown is never a function of when CI runs.
 *
 * Deliberately NOT `{ shouldAdvanceTime: true }`: that lets the fake clock drift on its own and
 * every arithmetic assertion went unstable (a 24:00 read as 44:01). A frozen clock is safe here
 * because this repo is on user-event v13, which is synchronous and awaits no timers of its own.
 */
beforeEach(() => {
    vi.clearAllMocks();
    // The config resets mock implementations before each test, so what the factory above set is
    // gone by now; both reads are re-armed here.
    vi.mocked(recordFocusCycle).mockResolvedValue({ success: {} as never });
    vi.mocked(listFocusMicroTasks).mockResolvedValue({ success: [] });
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
 * 25 minutes fires it 1500 times and re-renders 1500 times, for one assertion. `setSystemTime`
 * moves the clock without firing anything, so a single tick afterwards reads the new value — and
 * it models the real case better anyway, which is a tab that was suspended and woke up.
 *
 * (An earlier version of this comment blamed those 1500 renders for timing out unrelated tests in
 * other files. That was a misattribution: the machine was running at load 30 with a browser
 * eating ten cores, and the failures followed the load rather than this file. The helper is still
 * the right shape; the causal claim was not.)
 */
const jump = async (ms: number) => {
    // The one second the tick itself burns is taken off the jump, so `jump(60_000)` really is a
    // minute of elapsed time and a call site can read the number it means.
    vi.setSystemTime(Date.now() + Math.max(0, ms - 1_000));
    await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
    });
};

describe("the three cycles", () => {
    test("opens on Pomodoro, previewing the length it would run", () => {
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: buildStore() });

        expect(screen.getByTestId("focus-cycle-tab-pomodoro")).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("25:00");
        expect(screen.getByTestId("focus-pomodoro-message")).toHaveTextContent("FocusTimeToFocus");
    });

    test("switching tab changes the previewed length and the message", async () => {
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: buildStore() });

        await userEvent.click(screen.getByTestId("focus-cycle-tab-shortBreak"));
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("05:00");
        expect(screen.getByTestId("focus-pomodoro-message")).toHaveTextContent("FocusTimeForABreak");

        await userEvent.click(screen.getByTestId("focus-cycle-tab-longBreak"));
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("15:00");
        expect(screen.getByTestId("focus-pomodoro-message")).toHaveTextContent(
            "FocusTimeForALongBreak"
        );
    });

    test("the item's window does NOT override the configured length", async () => {
        /**
         * The bug this pins, reported from real use: "the short and long break change but the
         * pomodoro is stuck at 15".
         *
         * The first version read a pomodoro's length off the item's own window and only fell back
         * to the setting when there was none. `suggestSlots` hands out 15-MINUTE slices by
         * default, so nearly every item built through the routine form carries a 15-minute
         * window, and the Pomodoro field in the settings panel silently did nothing on all of
         * them. The window is now offered as a one-tap suggestion instead.
         */
        const store = buildStore();
        renderWithProviders(<Panel item={item("07:00", "07:15")} date={DATE} />, {
            storeOverride: store,
        });

        // 25, the configured length, and not the item's 15.
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("25:00");

        await userEvent.click(screen.getByTestId("focus-pomodoro-settings-toggle"));
        const field = screen.getByTestId("focus-setting-pomodoro");
        await userEvent.clear(field);
        await userEvent.type(field, "40");

        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("40:00");
        expect(store.getState().focus.settings.pomodoro).toBe(40);
    });

    test("the item's window is offered as one tap, and applying it changes the setting", async () => {
        const store = buildStore();
        renderWithProviders(<Panel item={item("07:00", "07:45")} date={DATE} />, {
            storeOverride: store,
        });
        await userEvent.click(screen.getByTestId("focus-pomodoro-settings-toggle"));

        await userEvent.click(screen.getByTestId("focus-use-item-window"));

        expect(store.getState().focus.settings.pomodoro).toBe(45);
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("45:00");
        // Offered only while it would change something, so it disappears once applied.
        expect(screen.queryByTestId("focus-use-item-window")).not.toBeInTheDocument();
    });

    test("an item with no window has nothing to offer", async () => {
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: buildStore() });
        await userEvent.click(screen.getByTestId("focus-pomodoro-settings-toggle"));

        expect(screen.queryByTestId("focus-use-item-window")).not.toBeInTheDocument();
    });

    test("a break ignores the window entirely", async () => {
        renderWithProviders(<Panel item={item("07:00", "08:30")} date={DATE} />, {
            storeOverride: buildStore(),
        });

        await userEvent.click(screen.getByTestId("focus-cycle-tab-shortBreak"));

        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("05:00");
    });

    test("the tab stays live during a cycle, and the clock keeps showing what runs", async () => {
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: buildStore() });
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));
        await jump(60_000);
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("24:00");

        await userEvent.click(screen.getByTestId("focus-cycle-tab-longBreak"));

        // Looking at another tab does not hijack the running countdown.
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("24:00");
    });
});

describe("the settings", () => {
    test("all three lengths are editable, and clamped", async () => {
        const store = buildStore();
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: store });

        await userEvent.click(screen.getByTestId("focus-pomodoro-settings-toggle"));

        const field = screen.getByTestId("focus-setting-pomodoro");
        await userEvent.clear(field);
        await userEvent.type(field, "50");
        expect(store.getState().focus.settings.pomodoro).toBe(50);

        const longField = screen.getByTestId("focus-setting-longBreak");
        await userEvent.clear(longField);
        await userEvent.type(longField, "999");
        expect(store.getState().focus.settings.longBreak).toBe(180);
    });

    test("the long-break interval is editable too", async () => {
        const store = buildStore();
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: store });
        await userEvent.click(screen.getByTestId("focus-pomodoro-settings-toggle"));

        const field = screen.getByTestId("focus-setting-longBreakEvery");
        await userEvent.clear(field);
        await userEvent.type(field, "2");

        expect(store.getState().focus.settings.longBreakEvery).toBe(2);
    });

    test("a changed length shows up in the preview at once", async () => {
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: buildStore() });
        await userEvent.click(screen.getByTestId("focus-pomodoro-settings-toggle"));

        const field = screen.getByTestId("focus-setting-pomodoro");
        await userEvent.clear(field);
        await userEvent.type(field, "40");

        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("40:00");
    });
});

describe("running a cycle", () => {
    test("starts on an absolute end time and counts down from it", async () => {
        const store = buildStore();
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: store });

        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));

        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("25:00");
        expect(store.getState().focus.timer?.endsAt).toBe(Date.now() + 25 * 60_000);

        await jump(60_000);
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("24:00");
    });

    test("a long pause costs nothing", async () => {
        // The point of storing an end time rather than counting down: the pause freezes what is
        // left, and resuming recomputes the end from it, so twenty minutes away is free.
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: buildStore() });
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));

        await jump(60_000);
        await userEvent.click(screen.getByTestId("focus-pomodoro-pause"));
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("24:00");

        await jump(20 * 60_000);
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("24:00");

        await userEvent.click(screen.getByTestId("focus-pomodoro-resume"));
        // 44:00 here was a real bug: resume recomputes endsAt from the clock, and the hook's
        // `now` was still pre-pause until the next tick.
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("24:00");
    });

    test("a finished cycle is reported to the server, from the timer's own fields", async () => {
        // Reported BEFORE the reducer hands over: after the dispatch, `kind` is already the break.
        // Fire-and-forget, so a lost report cannot stop the handover.
        renderWithProviders(<Panel item={item("07:00", "07:25", "hg1")} date={DATE} />, {
            storeOverride: buildStore(),
        });
        const startedAt = Date.now();
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));

        await jump(25 * 60_000);

        expect(recordFocusCycle).toHaveBeenCalledTimes(1);
        expect(recordFocusCycle).toHaveBeenCalledWith(
            {
                itemGroupId: "hg1",
                kind: "POMODORO",
                startedAt: new Date(startedAt).toISOString(),
                endedAt: new Date(startedAt + 25 * 60_000).toISOString(),
                minutes: 25,
            },
            expect.anything()
        );
    });

    test("an abandoned cycle is never reported: there is no failure state to record", async () => {
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: buildStore() });
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));
        await jump(60_000);

        await userEvent.click(screen.getByTestId("focus-pomodoro-stop"));

        expect(recordFocusCycle).not.toHaveBeenCalled();
    });

    test("crossing zero hands over to the short break and counts the pomodoro", async () => {
        const store = buildStore();
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: store });
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));

        await jump(25 * 60_000);

        expect(store.getState().focus.timer).toMatchObject({
            kind: "shortBreak",
            rounds: 1,
            finished: true,
        });
        // Waiting to be started, not already running: nobody is pushed into a break.
        expect(screen.getByTestId("focus-pomodoro-next")).toBeInTheDocument();
        // The `#N` line renders the raw i18n key in this suite (no interpolation), so the number
        // it would show is asserted on the store instead.
        expect(screen.getByTestId("focus-pomodoro-number")).toBeInTheDocument();
        expect(store.getState().focus.timer?.rounds).toBe(1);
    });

    test("skipping hands over to the next cycle without counting or reporting it", async () => {
        const store = buildStore();
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: store });
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));
        await jump(60_000);

        await userEvent.click(screen.getByTestId("focus-pomodoro-skip"));

        expect(store.getState().focus.timer).toMatchObject({
            kind: "shortBreak",
            // The `#N` line renders a raw i18n key in this suite, so the counter behind it is
            // asserted here.
            rounds: 1,
            finished: true,
        });
        // A pomodoro nobody sat through is not a pomodoro done, and the server only ever hears
        // about a cycle that ran out.
        expect(recordFocusCycle).not.toHaveBeenCalled();
        expect(screen.getByTestId("focus-pomodoro-next")).toBeInTheDocument();
    });

    test("the clock previews the cycle it is about to run, not a dead zero", async () => {
        // Reported: skipping a pomodoro left the short break reading 00:00 until start was pressed,
        // under a line saying it was time for a break.
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: buildStore() });
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));
        await jump(60_000);

        await userEvent.click(screen.getByTestId("focus-pomodoro-skip"));

        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("05:00");
    });

    test("the long break arrives on the interval that was configured, skips included", async () => {
        // The user's exact path, and the one that was broken: set the long break to every third
        // pomodoro in the panel, then skip. Seven skips used to pass without it ever arriving.
        const store = buildStore();
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: store });
        await userEvent.click(screen.getByTestId("focus-pomodoro-settings-toggle"));
        const every = screen.getByTestId("focus-setting-longBreakEvery");
        await userEvent.clear(every);
        await userEvent.type(every, "3");
        await userEvent.click(screen.getByTestId("focus-pomodoro-settings-toggle"));

        for (let round = 0; round < 3; round += 1) {
            await userEvent.click(screen.getByTestId("focus-cycle-tab-pomodoro"));
            await userEvent.click(
                screen.getByTestId(round === 0 ? "focus-pomodoro-start" : "focus-pomodoro-next"),
            );
            await userEvent.click(screen.getByTestId("focus-pomodoro-skip"));
        }

        expect(store.getState().focus.timer?.kind).toBe("longBreak");
        // And the clock is showing its length rather than a zero.
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("15:00");
    });

    test("three skips read as the fourth pomodoro", async () => {
        const store = buildStore();
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: store });

        for (let round = 0; round < 3; round += 1) {
            // Each skip hands over to a break, so the Pomodoro tab is chosen again every round.
            await userEvent.click(screen.getByTestId("focus-cycle-tab-pomodoro"));
            await userEvent.click(
                screen.getByTestId(round === 0 ? "focus-pomodoro-start" : "focus-pomodoro-next"),
            );
            await userEvent.click(screen.getByTestId("focus-pomodoro-skip"));
        }

        expect(store.getState().focus.timer?.rounds).toBe(3);
    });

    test("the skip is offered while a cycle runs or is held, and nowhere else", async () => {
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: buildStore() });
        // Idle: there is nothing to skip.
        expect(screen.queryByTestId("focus-pomodoro-skip")).not.toBeInTheDocument();

        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));
        expect(screen.getByTestId("focus-pomodoro-skip")).toBeInTheDocument();

        await userEvent.click(screen.getByTestId("focus-pomodoro-pause"));
        expect(screen.getByTestId("focus-pomodoro-skip")).toBeInTheDocument();

        await userEvent.click(screen.getByTestId("focus-pomodoro-resume"));
        await jump(25 * 60_000);
        // Finished: the panel already offers the next cycle, so a skip would say the same thing
        // twice.
        expect(screen.queryByTestId("focus-pomodoro-skip")).not.toBeInTheDocument();
    });

    test("nothing anywhere calls a finished cycle a failure", async () => {
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: buildStore() });
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));
        await jump(25 * 60_000);

        const panel = screen.getByTestId("focus-pomodoro");
        expect(panel.textContent ?? "").not.toMatch(/fail|miss|expire|lost|overdue/i);
    });

    test("resetting keeps nothing and counts nothing", async () => {
        const store = buildStore();
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: store });
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));
        await jump(25 * 60_000);
        expect(store.getState().focus.timer?.rounds).toBe(1);

        await userEvent.click(screen.getByTestId("focus-pomodoro-stop"));

        expect(store.getState().focus.timer).toBeNull();
        expect(screen.getByTestId("focus-pomodoro-start")).toBeInTheDocument();
        // The reset control only exists while there is something to reset.
        expect(screen.queryByTestId("focus-pomodoro-stop")).not.toBeInTheDocument();
    });
});

describe("one timer at a time", () => {
    test("a cycle running on another item is shown, not hidden behind a fresh start button", async () => {
        // Hiding it meant the start control reappeared on the next item, and pressing it
        // silently replaced a cycle somebody was 18 minutes into.
        const store = buildStore();
        const { unmount } = renderWithProviders(
            <Panel item={item("07:00", "07:45", "hg1")} date={DATE} />,
            { storeOverride: store }
        );
        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));
        unmount();

        renderWithProviders(<Panel item={item("12:00", "12:20", "hg2")} date={DATE} />, {
            storeOverride: store,
        });

        expect(screen.getByTestId("focus-pomodoro-pause")).toBeInTheDocument();
        expect(screen.queryByTestId("focus-pomodoro-start")).not.toBeInTheDocument();
    });
});

describe("the tab says what is happening", () => {
    test("the title counts while a cycle runs, and is put back afterwards", async () => {
        const original = document.title;
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: buildStore() });

        await userEvent.click(screen.getByTestId("focus-pomodoro-start"));
        expect(document.title).toContain("25:00");

        await userEvent.click(screen.getByTestId("focus-pomodoro-stop"));
        expect(document.title).toBe(original);
    });
});

describe("a persisted state from before these fields existed", () => {
    /**
     * The crash this reproduces, reported from a real browser:
     *
     *   Uncaught TypeError: Cannot read properties of undefined (reading 'shortBreak')
     *       at cycleMinutes (pomodoro.ts)
     *       at previewFor (Pomodoro.tsx)
     *
     * redux-persist replaces a stored slice WHOLESALE rather than merging it into the reducer's
     * initial state, so a browser that had opened the Focus Mode before `settings` and
     * `selectedCycle` existed rehydrates them as undefined, and the first render reads them
     * before any reducer can correct it. Restarting the dev stack does not help: the stale shape
     * is in localStorage.
     *
     * Neither existing layer could have caught it. The e2e suite always starts from a fresh
     * browser context, and every unit test built its state from `rootReducer(undefined)`, which
     * by definition has the current shape. This one hands in the OLD shape on purpose.
     *
     * It has since earned its keep twice: it caught the same omission again the moment the break's
     * micro-tasks landed, both in the component that read `microTasks` and in the reducer that
     * filtered it. Every field added to this slice needs a persist-version bump AND a tolerant
     * read; this test is what notices when one is missing.
     */
    const staleStore = () =>
        configureStore({
            reducer: rootReducer,
            preloadedState: {
                ...baseState,
                // Exactly the fields the slice had before the three-cycle rework: no `settings`,
                // no `selectedCycle`, no `microTasks`, no `microTaskSeq`.
                focus: {
                    mode: "ultrafoco",
                    selectedIndex: 0,
                    manuallySelected: false,
                    timer: null,
                } as never,
            },
        });

    test("renders instead of white-screening, and falls back to the defaults", () => {
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: staleStore() });

        expect(screen.getByTestId("focus-pomodoro")).toBeInTheDocument();
        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("25:00");
        expect(screen.getByTestId("focus-cycle-tab-pomodoro")).toHaveAttribute("aria-pressed", "true");
    });

    test("the micro-task list renders and is usable, rather than filtering undefined", async () => {
        vi.mocked(addFocusMicroTask).mockResolvedValue({
            success: { id: "9", date: DATE, itemGroupId: "hg1", name: "Stretch", pinned: false, doneAt: null },
        });
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: staleStore() });

        expect(screen.getByTestId("focus-micro-tasks")).toBeInTheDocument();
        // The list is wrapped in StrictModeDroppable, which renders null until a rAF fires. This
        // suite runs on a frozen clock, so nothing ever fires unless a frame is handed to it, and
        // the rows would never appear. Real browsers pay one frame for this and nobody notices.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(20);
        });

        await userEvent.click(screen.getByTestId("focus-micro-task-add"));
        await userEvent.type(screen.getByTestId("focus-micro-task-input"), "Stretch");
        await userEvent.keyboard("{Enter}");

        // The add is a server round-trip now, so the row lands after the mocked promise settles.
        expect(await screen.findByText("Stretch")).toBeInTheDocument();
    });

    test("the break tabs work too, rather than reading a length off nothing", async () => {
        renderWithProviders(<Panel item={item()} date={DATE} />, { storeOverride: staleStore() });

        await userEvent.click(screen.getByTestId("focus-cycle-tab-longBreak"));

        expect(screen.getByTestId("focus-pomodoro-remaining")).toHaveTextContent("15:00");
    });
});
