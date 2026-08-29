import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { FocusMicroTask, MicroTasksByItem } from "./microTasks";
import {
    DEFAULT_POMODORO_SETTINGS,
    clampCycleMinutes,
    clampLongBreakEvery,
    nextCycleKind,
    remainingMs,
    type CycleKind,
    type FocusTimer,
    type PomodoroSettings,
} from "./pomodoro";

/**
 * Which state the focus surface is in.
 *
 * "off" is not a screen, it is the absence of one, and what the slice returns to when the
 * user leaves. The other values are the same screen wearing different clothes: "ultrafoco"
 * narrows to one item and "descanso" (F5) stills the screen. Both are reached WITHOUT
 * changing route, which is the whole reason the mode lives in the store instead of the URL.
 *
 * It earns its keep already in F1: the "enter focus" button reads it to hide itself, so the
 * focus screen can render the ordinary routine card without the card offering a way into the
 * screen it is already inside.
 */
export type FocusMode = "off" | "fullscreen" | "ultrafoco" | "descanso";

type focusState = {
    mode: FocusMode;
    /**
     * Index into `getFocusItems(routine)`. -1 means nothing is selected, which is both the
     * starting state and what an empty or finished routine resolves to.
     */
    selectedIndex: number;
    /**
     * True once the person chose an item by hand.
     *
     * **This is the freedom rule, and it is the whole reason this field exists.** The clock
     * seeds the selection once, through `focusStartResolved`. After a manual choice the clock
     * is never allowed to move it again for this visit, so an item picked at nine in the
     * morning stays put when its window passes, and a routine the person is working through
     * out of order is not dragged back to "now" every minute.
     */
    manuallySelected: boolean;
    /**
     * The pomodoro, or null when none is running.
     *
     * **Unlike every other field here, this one is NOT scoped to one visit**, and that reverses
     * what the F1 comment on `focusExited` said. A timer is a promise about the next 25
     * minutes: it has to survive leaving the screen to look something up, and it has to survive
     * a reload. So `focusEntered` and `focusExited` both carry it across, and only a day change
     * or a deliberate abandon clears it. `FocusTimer.date` is what stops one resurfacing
     * tomorrow.
     */
    timer: FocusTimer | null;
    /**
     * Which of the three cycles the panel is showing.
     *
     * Separate from `timer.kind` because the two answer different questions: this is what the
     * person has SELECTED and may start, while `timer.kind` is what is actually running. Someone
     * can look at the Long Break tab while a pomodoro counts down, and the tabs would fight the
     * timer if both read one field.
     */
    selectedCycle: CycleKind;
    /**
     * The three lengths and the long-break interval.
     *
     * Survives entering, exiting AND a change of day, unlike the timer: these are preferences,
     * not the state of one sitting. Client-side only for now, which was the decision taken with
     * the user — reaching for `editUser` means touching `UserEditDTO` and `perfilSlice` for four
     * numbers. On web redux-persist keeps them; on native redux is in-memory, so they reset with
     * the app.
     */
    settings: PomodoroSettings;
    /**
     * The break's micro-tasks, cached per routine item as the server last returned them.
     *
     * Server-owned since F6, and scoped to the ITEM: switching items switches lists, and a pinned
     * name shows up on the new item because the server materialised a row for it there, not because
     * anything here copied it. Nothing in this slice is the source of truth for a micro-task.
     */
    microTasks: MicroTasksByItem;
};

const initialState: focusState = {
    mode: "off",
    selectedIndex: -1,
    manuallySelected: false,
    timer: null,
    selectedCycle: "pomodoro",
    settings: DEFAULT_POMODORO_SETTINGS,
    microTasks: {},
};

/**
 * What may come back from storage, and what may not.
 *
 * The web store persists this slice, and redux-persist's reconciler HARD SETS a stored slice
 * over the reducer's initial state (`autoMergeLevel1` assigns, it does not merge). So whatever
 * was in localStorage when the tab closed is what the app boots with, key for key.
 *
 * That is wrong for every field here except two. `mode`, the selection and the micro-task cache
 * describe a VISIT: the person is on the focus screen right now, looking at item 4, with that
 * item's list loaded. A tab closed inside the focus screen never runs `focusExited`, so the mode
 * comes back as "ultrafoco" on a dashboard that is not the focus screen — and the button that
 * offers the way in hides itself, because a stored boolean says the user is already there. Same
 * shape of bug for `manuallySelected`: left true, the clock is barred from seeding tomorrow's
 * selection and the screen opens wherever yesterday ended.
 *
 * Only the timer and the settings earn a place in storage. A cycle is a promise about the next
 * 25 minutes and has to survive a reload; the four durations are preferences. Everything else is
 * rebuilt from `initialState`, which is also why this returns a COMPLETE state rather than the
 * kept fields alone — a partial object would leave the rest undefined, which is the crash the
 * persist migrations exist to prevent.
 *
 * Reads defensively because the input is whatever an older build wrote.
 */
export function restoreFocusState(stored: unknown): focusState {
    const saved = (stored ?? {}) as Partial<focusState>;
    return {
        ...initialState,
        timer: saved.timer ?? null,
        // Merged over the defaults, not taken whole: a build that shipped fewer settings than
        // today's would otherwise hand a component `undefined` where a number belongs.
        settings: { ...initialState.settings, ...(saved.settings ?? {}) },
    };
}

/** Clamped, never wrapping. Running off the end of the day should stop, not start over. */
const clamp = (index: number, count: number) => Math.min(Math.max(index, 0), count - 1);

const focusSlice = createSlice({
    name: "focus",
    initialState,
    reducers: {
        /**
         * Entering always lands on the full routine. Narrowing to one item is a later step.
         *
         * Takes the user's local day so a timer left in persisted storage is carried across only
         * when it belongs to today. Without that, somebody opening the app on Tuesday would be
         * greeted by Monday's finished cycle.
         */
        focusEntered(state, action: PayloadAction<string>) {
            const sameDay = state.timer?.date === action.payload;
            const timer = sameDay ? state.timer : null;
            return {
                ...initialState,
                mode: "fullscreen" as FocusMode,
                timer,
                // The tab follows whatever is still running, so re-entering mid-cycle does not
                // show the Pomodoro tab over a counting-down break.
                selectedCycle: timer ? timer.kind : "pomodoro",
                settings: state.settings,
            };
        },
        focusModeChanged(state, action: PayloadAction<FocusMode>) {
            return { ...state, mode: action.payload };
        },
        /**
         * The clock's suggestion, from `resolveFocusStart`.
         *
         * Ignored outright once the person has chosen by hand. Dispatching this on a timer is
         * therefore safe: it seeds an untouched screen and is inert on a steered one.
         */
        focusStartResolved(state, action: PayloadAction<number>) {
            if (state.manuallySelected) return state;
            return { ...state, selectedIndex: action.payload };
        },
        /** A deliberate choice. Takes the selection away from the clock for good. */
        focusItemSelected(state, action: PayloadAction<number>) {
            return { ...state, selectedIndex: action.payload, manuallySelected: true };
        },
        /**
         * Step forward or back through the day.
         *
         * The count comes in the payload because the reducer has no business knowing the
         * routine; clamping in one place is still better than each platform clamping its own
         * way. Also a manual move: pressing "next" is choosing.
         */
        focusMovedBy(state, action: PayloadAction<{ delta: number; count: number }>) {
            const { delta, count } = action.payload;
            if (count <= 0) return state;
            const from = state.selectedIndex < 0 ? 0 : state.selectedIndex;
            return {
                ...state,
                selectedIndex: clamp(from + delta, count),
                manuallySelected: true,
            };
        },
        /**
         * Resets the selection and the mode, and deliberately KEEPS the timer.
         *
         * F1 said this reset everything, on the reasoning that all of it was scoped to one
         * visit. That turned out to be wrong for the pomodoro specifically: leaving the screen
         * to look something up must not silently kill a cycle somebody is 18 minutes into.
         * Abandoning is an explicit action (`pomodoroAbandoned`), never a side effect of
         * navigating.
         */
        focusExited(state) {
            return {
                ...initialState,
                timer: state.timer,
                selectedCycle: state.selectedCycle,
                settings: state.settings,
            };
        },

        /** Which tab is showing. Does not touch a running timer. */
        cycleSelected(state, action: PayloadAction<CycleKind>) {
            return { ...state, selectedCycle: action.payload };
        },

        /** Any of the four numbers, clamped. */
        pomodoroSettingsChanged(state, action: PayloadAction<Partial<PomodoroSettings>>) {
            const patch = action.payload;
            return {
                ...state,
                settings: {
                    pomodoro:
                        patch.pomodoro !== undefined
                            ? clampCycleMinutes(patch.pomodoro)
                            : state.settings.pomodoro,
                    shortBreak:
                        patch.shortBreak !== undefined
                            ? clampCycleMinutes(patch.shortBreak)
                            : state.settings.shortBreak,
                    longBreak:
                        patch.longBreak !== undefined
                            ? clampCycleMinutes(patch.longBreak)
                            : state.settings.longBreak,
                    longBreakEvery:
                        patch.longBreakEvery !== undefined
                            ? clampLongBreakEvery(patch.longBreakEvery)
                            : state.settings.longBreakEvery,
                },
            };
        },

        /** What the server returned for one item. Replaces that item's cache wholesale. */
        microTasksLoaded(state, action: PayloadAction<{ itemGroupId: string; tasks: FocusMicroTask[] }>) {
            const { itemGroupId, tasks } = action.payload;
            return { ...state, microTasks: { ...(state.microTasks ?? {}), [itemGroupId]: tasks } };
        },

        /** One row as the server returned it after a create, toggle or pin. Upserted by id. */
        microTaskUpserted(state, action: PayloadAction<FocusMicroTask>) {
            const task = action.payload;
            const list = (state.microTasks ?? {})[task.itemGroupId] ?? [];
            const index = list.findIndex((entry) => entry.id === task.id);
            const next = index === -1 ? [...list, task] : list.map((entry, i) => (i === index ? task : entry));
            return { ...state, microTasks: { ...(state.microTasks ?? {}), [task.itemGroupId]: next } };
        },

        microTaskRemoved(state, action: PayloadAction<{ itemGroupId: string; id: string }>) {
            const { itemGroupId, id } = action.payload;
            const list = (state.microTasks ?? {})[itemGroupId] ?? [];
            return {
                ...state,
                microTasks: { ...(state.microTasks ?? {}), [itemGroupId]: list.filter((entry) => entry.id !== id) },
            };
        },

        /**
         * Start a cycle. `now` and `date` come in the payload because a reducer must stay pure:
         * calling `Date.now()` in here would make every test a function of when it ran.
         */
        pomodoroStarted(
            state,
            action: PayloadAction<{
                groupId: string;
                kind: CycleKind;
                minutes: number;
                now: number;
                date: string;
            }>
        ) {
            const { groupId, kind, minutes, now, date } = action.payload;
            const durationMinutes = clampCycleMinutes(minutes);
            // Cycles already finished on THIS item are kept; moving to another item starts the
            // count again, because the count is about the item and not about the sitting.
            const sameItem = state.timer && state.timer.groupId === groupId;
            const carried = sameItem ? state.timer!.completedCycles : 0;
            // Tolerant: a timer restored from storage before `rounds` existed has none, and the
            // earned count is the closest true answer for it.
            const carriedRounds = sameItem ? (state.timer!.rounds ?? state.timer!.completedCycles) : 0;
            return {
                ...state,
                selectedCycle: kind,
                timer: {
                    groupId,
                    kind,
                    startedAt: now,
                    endsAt: now + durationMinutes * 60_000,
                    pausedRemainingMs: null,
                    durationMinutes,
                    completedCycles: carried,
                    rounds: carriedRounds,
                    finished: false,
                    date,
                },
            };
        },

        /** Freeze what is left. `endsAt` goes stale until the resume recomputes it. */
        pomodoroPaused(state, action: PayloadAction<{ now: number }>) {
            if (!state.timer || state.timer.finished) return state;
            if (state.timer.pausedRemainingMs !== null) return state;
            return {
                ...state,
                timer: {
                    ...state.timer,
                    pausedRemainingMs: remainingMs(state.timer, action.payload.now),
                },
            };
        },

        /** A fresh end time from the frozen remainder, so a long pause costs nothing. */
        pomodoroResumed(state, action: PayloadAction<{ now: number }>) {
            if (!state.timer || state.timer.finished) return state;
            if (state.timer.pausedRemainingMs === null) return state;
            return {
                ...state,
                timer: {
                    ...state.timer,
                    endsAt: action.payload.now + state.timer.pausedRemainingMs,
                    pausedRemainingMs: null,
                },
            };
        },

        /**
         * A finished cycle hands over to the next one, paused at zero so the person starts it
         * when they are ready rather than being pushed into a break they did not ask for.
         *
         * A finished WORK cycle is the only thing that increments the count. Nothing anywhere
         * records a cycle that was abandoned: there is no failure state in this feature.
         */
        pomodoroCycleCompleted(state) {
            if (!state.timer || state.timer.finished) return state;
            const ran = state.timer;
            const completedCycles =
                ran.kind === "pomodoro" ? ran.completedCycles + 1 : ran.completedCycles;
            const rounds = ran.kind === "pomodoro" ? (ran.rounds ?? ran.completedCycles) + 1 : (ran.rounds ?? ran.completedCycles);
            // Which break is earned depends on the count AFTER this one, so it is computed here
            // rather than in the component: a fourth pomodoro pays the long break.
            const handover = nextCycleKind(ran.kind, completedCycles, state.settings.longBreakEvery);
            return {
                ...state,
                selectedCycle: handover,
                timer: {
                    ...ran,
                    kind: handover,
                    endsAt: 0,
                    pausedRemainingMs: null,
                    finished: true,
                    completedCycles,
                    rounds,
                },
            };
        },

        /**
         * Hand over early, because the person is done with this cycle.
         *
         * The same handover a finished cycle does, minus the two things that would turn a skip
         * into a lie. It does NOT increment `completedCycles`: a pomodoro nobody sat through is
         * not a pomodoro done, and counting it would also let four taps buy a long break. And it
         * leaves the timer `finished`, which is what keeps the report effect quiet — the server
         * only ever hears about a cycle that ran out.
         *
         * Because the count does not move, the break a skipped fourth pomodoro hands over to is
         * the short one. That falls out of `nextCycleKind` rather than being decided here, and it
         * is the honest answer: the long break is what four pomodoros pay for.
         *
         * Skipping a BREAK is the common case and the one this was asked for. It costs nothing:
         * the next pomodoro is right there.
         */
        pomodoroSkipped(state) {
            if (!state.timer || state.timer.finished) return state;
            const ran = state.timer;
            const handover = nextCycleKind(ran.kind, ran.completedCycles, state.settings.longBreakEvery);
            // The round moves even though the tally does not: the person is on their next pomodoro,
            // they just did not sit through this one.
            const rounds = ran.kind === "pomodoro" ? (ran.rounds ?? ran.completedCycles) + 1 : (ran.rounds ?? ran.completedCycles);
            return {
                ...state,
                selectedCycle: handover,
                timer: {
                    ...ran,
                    kind: handover,
                    endsAt: 0,
                    pausedRemainingMs: null,
                    finished: true,
                    rounds,
                },
            };
        },

        /** Stop, with nothing kept and nothing counted. */
        pomodoroAbandoned(state) {
            return { ...state, timer: null };
        },
    },
});

export const {
    focusEntered,
    focusModeChanged,
    cycleSelected,
    pomodoroSettingsChanged,
    microTasksLoaded,
    microTaskUpserted,
    microTaskRemoved,
    focusStartResolved,
    focusItemSelected,
    focusMovedBy,
    focusExited,
    pomodoroStarted,
    pomodoroPaused,
    pomodoroResumed,
    pomodoroCycleCompleted,
    pomodoroSkipped,
    pomodoroAbandoned,
} = focusSlice.actions;
export default focusSlice.reducer;
