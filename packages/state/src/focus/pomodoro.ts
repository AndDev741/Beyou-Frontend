import { isOvernightRange } from '@beyou/validation';
import { MINUTES_PER_DAY, toMinutes } from '../routine/minutes';
import type { FocusItem } from './focusItems';

/**
 * The three cycles, in the order the tabs offer them.
 *
 * "pomodoro" rather than "work": it is the word on the tab and the word the technique uses, and
 * the two-value version this replaced called one of them "break" while there are now two breaks
 * of different lengths.
 */
export type CycleKind = 'pomodoro' | 'shortBreak' | 'longBreak';

export const CYCLE_KINDS: CycleKind[] = ['pomodoro', 'shortBreak', 'longBreak'];

/** The i18n key naming each cycle, so neither platform invents its own wording. */
export const CYCLE_LABEL_KEY: Record<CycleKind, string> = {
    pomodoro: 'FocusCyclePomodoro',
    shortBreak: 'FocusCycleShortBreak',
    longBreak: 'FocusCycleLongBreak',
};

/** What the line under the clock says, per cycle. */
export const CYCLE_MESSAGE_KEY: Record<CycleKind, string> = {
    pomodoro: 'FocusTimeToFocus',
    shortBreak: 'FocusTimeForABreak',
    longBreak: 'FocusTimeForALongBreak',
};

export type PomodoroSettings = {
    /** Minutes a pomodoro runs for. The authority: nothing overrides it silently. */
    pomodoro: number;
    shortBreak: number;
    longBreak: number;
    /**
     * How many pomodoros earn the long break. The technique's own number is four.
     *
     * A 1 means every break is a long one, which is a legitimate way to work and not worth
     * forbidding.
     */
    longBreakEvery: number;
};

/** The classic numbers, and what a fresh account starts with. */
export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakEvery: 4,
};

/**
 * Bounds for a hand-typed duration.
 *
 * Three hours is not a real pomodoro, but the point of the ceiling is to stop a typo (300
 * instead of 30) turning into a timer nobody can wait out, not to police how anyone works.
 */
export const MIN_CYCLE_MINUTES = 1;
export const MAX_CYCLE_MINUTES = 180;

/** And for how often the long break comes round. */
export const MIN_LONG_BREAK_EVERY = 1;
export const MAX_LONG_BREAK_EVERY = 12;

export type FocusTimer = {
    /** The item group this cycle was started on. */
    groupId: string;
    kind: CycleKind;
    /**
     * Epoch milliseconds when this cycle was started. Frozen across pause and resume, unlike
     * `endsAt`, because it is what the server is told when the cycle completes.
     */
    startedAt: number;
    /**
     * Epoch milliseconds when this cycle ends, and the ONLY source of truth for how much is
     * left. Nothing counts down in a variable: a decrementing number dies with the tab, sleeps
     * when the phone locks, and drifts whenever the interval is throttled. Subtracting from the
     * wall clock survives all three.
     *
     * Stale while `pausedRemainingMs` is set, and meaningless once `finished`.
     */
    endsAt: number;
    /** Milliseconds left at the moment it was paused, or null while it runs. */
    pausedRemainingMs: number | null;
    /** What it was started with, so the next cycle can offer the same shape. */
    durationMinutes: number;
    /**
     * Pomodoros FINISHED on this item. Breaks do not count, and neither does skipping one.
     *
     * This is the earned count, and its only job is deciding which break comes next. Were a skip
     * to move it, four taps would buy the long break that four pomodoros are supposed to pay for.
     */
    completedCycles: number;
    /**
     * Pomodoros GONE THROUGH on this item, finished or skipped. What the `#N` line shows.
     *
     * A separate field from `completedCycles` because the two answer different questions, the same
     * way `selectedCycle` and `timer.kind` do. `#N` is where you are in the stint — skip the first
     * pomodoro and you are on your second, whatever the tally of finished ones says. Reported as a
     * stuck counter otherwise: three skips and the line still read #1.
     */
    rounds: number;
    /**
     * True once a cycle has run out and handed over to the next one.
     *
     * An explicit flag rather than a sentinel, because both obvious sentinels lie. Leaving
     * `endsAt` in the past keeps the status at "elapsed", so the effect that notices the
     * crossing re-fires and flips `kind` on every render. Parking a 0 in `pausedRemainingMs`
     * reads as PAUSED to `timerStatus`, which is the bug this replaced: a finished cycle showed
     * the pause controls and the "cycle finished" panel never appeared at all.
     */
    finished: boolean;
    /**
     * The user's local day this cycle was started on.
     *
     * Kept so a timer left behind in persisted storage does not resurrect tomorrow. Without it
     * the screen would greet somebody with "cycle finished" about a pomodoro from last week.
     */
    date: string;
};

export type TimerStatus = 'idle' | 'running' | 'paused' | 'elapsed';

/** Clamp a hand-typed duration into something a timer can actually run. */
export const clampCycleMinutes = (minutes: number): number => {
    if (!Number.isFinite(minutes)) return DEFAULT_POMODORO_SETTINGS.pomodoro;
    return Math.min(Math.max(Math.round(minutes), MIN_CYCLE_MINUTES), MAX_CYCLE_MINUTES);
};

export const clampLongBreakEvery = (every: number): number => {
    if (!Number.isFinite(every)) return DEFAULT_POMODORO_SETTINGS.longBreakEvery;
    return Math.min(Math.max(Math.round(every), MIN_LONG_BREAK_EVERY), MAX_LONG_BREAK_EVERY);
};

/**
 * How long this cycle runs. The configured length, and nothing else.
 *
 * It used to read a pomodoro's length off the item's own window, falling back to the setting.
 * That shipped and was wrong: the app's own `suggestSlots` hands out 15-minute slices by default,
 * so nearly every item built through the routine form carries a 15-minute window, and the
 * Pomodoro field in the settings panel silently did nothing on all of them. Reported as "the
 * short and long break change but the pomodoro is stuck at 15".
 *
 * The rule the user set for this whole feature settles it: the clock may SUGGEST, never command,
 * and a control that does nothing is the opposite of the freedom that rule is about. So the
 * setting is the authority, and the item's window is offered as a one-tap suggestion in the panel
 * through `itemWindowMinutes` instead of overriding what somebody typed.
 *
 * No longer takes the item at all, which is the point: there is no "which one wins" question left
 * to get wrong.
 */
export function cycleMinutes(kind: CycleKind, settings: PomodoroSettings): number {
    if (kind === 'shortBreak') return clampCycleMinutes(settings.shortBreak);
    if (kind === 'longBreak') return clampCycleMinutes(settings.longBreak);
    return clampCycleMinutes(settings.pomodoro);
}

/**
 * The item's window in minutes, or null when it has none to read.
 *
 * Routine ITEMS carry `startTime` and `endTime`, not only sections, so a scheduled item already
 * states how long its owner meant it to take. That is worth offering, and the panel does offer
 * it — as a button that writes the value into the setting, never as a silent override.
 */
export function itemWindowMinutes(item: FocusItem | null | undefined): number | null {
    if (!item?.startTime || !item.endTime) return null;

    const start = toMinutes(item.startTime);
    const end = toMinutes(item.endTime);
    if (Number.isNaN(start) || Number.isNaN(end)) return null;

    // Same overnight helper as the resolver and the routine validation, so a 23:30 to 00:15
    // window is 45 minutes here too rather than a negative number.
    const span = isOvernightRange(item.startTime, item.endTime)
        ? end + MINUTES_PER_DAY - start
        : end - start;

    return span > 0 ? span : null;
}

/** Milliseconds left, floored at zero. Reads the frozen value while paused. */
export function remainingMs(timer: FocusTimer | null | undefined, now: number): number {
    if (!timer) return 0;
    if (timer.finished) return 0;
    if (timer.pausedRemainingMs !== null) return Math.max(0, timer.pausedRemainingMs);
    return Math.max(0, timer.endsAt - now);
}

/**
 * What the timer is doing.
 *
 * "elapsed" is a finished cycle, and it is deliberately not called "failed" or "expired".
 * There is no state in this feature that means the person did badly: a cycle that ran out is a
 * cycle that ran, and abandoning one is a neutral action with no tally kept.
 */
export function timerStatus(timer: FocusTimer | null | undefined, now: number): TimerStatus {
    if (!timer) return 'idle';
    // First, so a finished cycle stays finished whatever is parked in the other fields. The
    // reducer does not currently produce a timer that is both finished and paused, so this
    // ordering is defensive rather than load-bearing; it is here because the version this
    // replaced DID park a 0 in `pausedRemainingMs`, the pause branch matched, and a finished
    // cycle rendered the pause controls with the "cycle finished" panel never appearing.
    if (timer.finished) return 'elapsed';
    if (timer.pausedRemainingMs !== null) return 'paused';
    return timer.endsAt > now ? 'running' : 'elapsed';
}

/**
 * "25:00", and "1:04:00" once a cycle runs past the hour.
 *
 * Zero-padded minutes, because the number is rendered at 64px and a display that jumps between
 * "9:59" and "10:00" widths shifts the whole card sideways every ten minutes.
 */
export function formatRemaining(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const mm = String(minutes).padStart(2, '0');
    return hours > 0
        ? `${hours}:${mm}:${String(seconds).padStart(2, '0')}`
        : `${mm}:${String(seconds).padStart(2, '0')}`;
}

/**
 * What comes after this cycle.
 *
 * A pomodoro pays a short break, except every `longBreakEvery`th one, which pays the long break.
 * Any break pays a pomodoro. `completedCycles` is the count AFTER this cycle was counted, which
 * is what the reducer hands in.
 */
export function nextCycleKind(
    kind: CycleKind,
    completedCycles: number,
    longBreakEvery: number,
): CycleKind {
    if (kind !== 'pomodoro') return 'pomodoro';
    const every = clampLongBreakEvery(longBreakEvery);
    return completedCycles > 0 && completedCycles % every === 0 ? 'longBreak' : 'shortBreak';
}

/** Which pomodoro the person is on, counting from one. Reads `rounds`, not the earned count. */
export const pomodoroNumber = (rounds: number): number => rounds + 1;

/** The server's spelling of a cycle kind, for `POST /focus/cycles`. */
export const toServerCycleKind = (kind: CycleKind): 'POMODORO' | 'SHORT_BREAK' | 'LONG_BREAK' =>
    kind === 'pomodoro' ? 'POMODORO' : kind === 'shortBreak' ? 'SHORT_BREAK' : 'LONG_BREAK';
