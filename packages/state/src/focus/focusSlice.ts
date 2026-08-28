import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    MAX_MICRO_TASKS,
    normalizeMicroTaskName,
    type MicroTask,
} from "./microTasks";
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
     * The break's micro-tasks.
     *
     * Pinned ones survive leaving the screen and are mirrored to device storage by the screen;
     * the rest belong to this visit and `focusExited` drops them.
     */
    microTasks: MicroTask[];
    /**
     * Source of micro-task ids.
     *
     * A counter rather than a uuid: a reducer must stay pure, `crypto.randomUUID` does not exist
     * on React Native, and no id here ever leaves the device. Monotonic within a session is all
     * that is needed to key a list.
     */
    microTaskSeq: number;
};

const initialState: focusState = {
    mode: "off",
    selectedIndex: -1,
    manuallySelected: false,
    timer: null,
    selectedCycle: "pomodoro",
    settings: DEFAULT_POMODORO_SETTINGS,
    microTasks: [],
    microTaskSeq: 0,
};

/**
 * The micro-tasks, tolerating a rehydrated state that predates them.
 *
 * This slice is persisted on web, and redux-persist replaces a stored slice WHOLESALE rather than
 * merging it into the reducer's initial state. So a browser holding an older shape hands this
 * reducer a state with the field simply absent, and `state.microTasks.filter(...)` throws before
 * anything can repair it. Reading through here means the first dispatch normalises the slice,
 * which is a better place for the guard than every component that reads it.
 *
 * The store's persist migration is still the proper fix for those browsers; this is what stops the
 * next added field from white-screening the app while somebody forgets to bump the version.
 */
const tasksOf = (state: focusState): MicroTask[] => state.microTasks ?? [];

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
                // Only the standing ones come along. The screen hydrates the rest from device
                // storage right after this, which is why nothing is lost by dropping them here.
                microTasks: tasksOf(state).filter((task) => task.pinned),
                microTaskSeq: state.microTaskSeq ?? 0,
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
                // One-off micro-tasks belong to the visit that created them; standing ones do not.
                microTasks: tasksOf(state).filter((task) => task.pinned),
                microTaskSeq: state.microTaskSeq ?? 0,
            };
        },

        /**
         * The standing micro-tasks read back from device storage, merged in on mount.
         *
         * Merged rather than replacing: a one-off typed before the read resolved would otherwise
         * vanish under it. Stored entries win on id, since they are the ones with history.
         */
        microTasksHydrated(state, action: PayloadAction<MicroTask[]>) {
            const stored = action.payload.slice(0, MAX_MICRO_TASKS);
            const storedIds = new Set(stored.map((task) => task.id));
            const merged = [...stored, ...tasksOf(state).filter((task) => !storedIds.has(task.id))];
            return {
                ...state,
                microTasks: merged.slice(0, MAX_MICRO_TASKS),
                // Past anything the store already holds, so a fresh id cannot collide with one
                // that came back from storage.
                microTaskSeq: merged.reduce(
                    (highest, task) => Math.max(highest, Number(task.id) || 0),
                    state.microTaskSeq ?? 0,
                ),
            };
        },

        /** Added as a one-off. Pinning is a separate, deliberate act on the row. */
        microTaskAdded(state, action: PayloadAction<string>) {
            const name = normalizeMicroTaskName(action.payload);
            if (!name) return state;
            if (tasksOf(state).length >= MAX_MICRO_TASKS) return state;
            const seq = (state.microTaskSeq ?? 0) + 1;
            return {
                ...state,
                microTaskSeq: seq,
                microTasks: [
                    ...tasksOf(state),
                    { id: String(seq), name, pinned: false, doneOn: null },
                ],
            };
        },

        /** Ticked, or un-ticked. The date is the payload so the reducer stays pure. */
        microTaskToggled(state, action: PayloadAction<{ id: string; date: string }>) {
            const { id, date } = action.payload;
            return {
                ...state,
                microTasks: tasksOf(state).map((task) =>
                    task.id === id
                        ? { ...task, doneOn: task.doneOn === date ? null : date }
                        : task
                ),
            };
        },

        /** Keep it for next time, or stop keeping it. */
        microTaskPinToggled(state, action: PayloadAction<string>) {
            return {
                ...state,
                microTasks: tasksOf(state).map((task) =>
                    task.id === action.payload ? { ...task, pinned: !task.pinned } : task
                ),
            };
        },

        microTaskRemoved(state, action: PayloadAction<string>) {
            return {
                ...state,
                microTasks: tasksOf(state).filter((task) => task.id !== action.payload),
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
            const carried =
                state.timer && state.timer.groupId === groupId ? state.timer.completedCycles : 0;
            return {
                ...state,
                selectedCycle: kind,
                timer: {
                    groupId,
                    kind,
                    endsAt: now + durationMinutes * 60_000,
                    pausedRemainingMs: null,
                    durationMinutes,
                    completedCycles: carried,
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
    microTasksHydrated,
    microTaskAdded,
    microTaskToggled,
    microTaskPinToggled,
    microTaskRemoved,
    focusStartResolved,
    focusItemSelected,
    focusMovedBy,
    focusExited,
    pomodoroStarted,
    pomodoroPaused,
    pomodoroResumed,
    pomodoroCycleCompleted,
    pomodoroAbandoned,
} = focusSlice.actions;
export default focusSlice.reducer;
