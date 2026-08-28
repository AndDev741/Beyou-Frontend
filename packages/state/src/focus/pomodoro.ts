import { isOvernightRange } from '@beyou/validation';
import { MINUTES_PER_DAY, toMinutes } from '../routine/minutes';
import type { FocusItem } from './focusItems';

/** The classic pair, used when the item's own window says nothing. */
export const WORK_DEFAULT_MINUTES = 25;
export const BREAK_DEFAULT_MINUTES = 5;

/**
 * Bounds for a hand-typed duration.
 *
 * Three hours is not a real pomodoro, but the point of the ceiling is to stop a typo (300
 * instead of 30) turning into a timer nobody can wait out, not to police how anyone works.
 */
export const MIN_CYCLE_MINUTES = 1;
export const MAX_CYCLE_MINUTES = 180;

export type CycleKind = 'work' | 'break';

export type FocusTimer = {
    /** The item group this cycle was started on. */
    groupId: string;
    kind: CycleKind;
    /**
     * Epoch milliseconds when this cycle ends, and the ONLY source of truth for how much is
     * left. Nothing counts down in a variable: a decrementing number dies with the tab, sleeps
     * when the phone locks, and drifts whenever the interval is throttled. Subtracting from the
     * wall clock survives all three.
     *
     * Stale while `pausedRemainingMs` is set.
     */
    endsAt: number;
    /** Milliseconds left at the moment it was paused, or null while it runs. */
    pausedRemainingMs: number | null;
    /** What it was started with, so the next cycle can offer the same shape. */
    durationMinutes: number;
    /** Work cycles finished on this item. Breaks do not count. */
    completedCycles: number;
    /**
     * True once a cycle has run out and handed over to the next one.
     *
     * An explicit flag rather than a sentinel, because both obvious sentinels lie. Leaving
     * `endsAt` in the past keeps the status at "elapsed" forever, so the effect that notices the
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
    if (!Number.isFinite(minutes)) return WORK_DEFAULT_MINUTES;
    return Math.min(Math.max(Math.round(minutes), MIN_CYCLE_MINUTES), MAX_CYCLE_MINUTES);
};

/**
 * How many minutes to offer for this item.
 *
 * Taken from the item's own window, which is the pleasant discovery behind this whole phase:
 * routine ITEMS carry `startTime` and `endTime`, not only sections, so every scheduled item
 * already states how long its owner meant it to take. Neither `Task` nor `Habit` has a
 * duration field and neither needs one.
 *
 * Falls back to the classic 25 for an item with no window, which is every item of a LIST
 * routine. The value is a suggestion in an editable field, never a constraint: see the freedom
 * rule in `resolveFocusStart`.
 */
export function suggestedMinutes(item: FocusItem | null | undefined): number {
    if (!item?.startTime || !item.endTime) return WORK_DEFAULT_MINUTES;

    const start = toMinutes(item.startTime);
    const end = toMinutes(item.endTime);
    if (Number.isNaN(start) || Number.isNaN(end)) return WORK_DEFAULT_MINUTES;

    // Same overnight helper as the resolver and the routine validation, so a 23:30 to 00:15
    // window is 45 minutes here too rather than a negative number.
    const span = isOvernightRange(item.startTime, item.endTime)
        ? end + MINUTES_PER_DAY - start
        : end - start;

    if (span <= 0) return WORK_DEFAULT_MINUTES;
    return clampCycleMinutes(span);
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

/** "24:59", and "1:04:00" once a cycle runs past the hour. */
export function formatRemaining(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
    return hours > 0
        ? `${hours}:${mm}:${String(seconds).padStart(2, '0')}`
        : `${mm}:${String(seconds).padStart(2, '0')}`;
}

/** What the next cycle should be after this one finishes: work pays a break, a break pays work. */
export const nextCycleKind = (kind: CycleKind): CycleKind => (kind === 'work' ? 'break' : 'work');
