/**
 * The Calendar page: one-off dated tasks with a reminder, and each day's routine, goal deadlines
 * and mood, as the server joins them.
 *
 * Wire names match the backend's `CalendarTaskResponseDTO`, `CalendarDayDTO` and friends
 * (checked in `@beyou/api`'s contractChecks).
 */

/** A one-off task pinned to a day. Lives outside routines and never shows on the Tasks page. */
export type CalendarTask = {
    id: string;
    title: string;
    note: string | null;
    /** `yyyy-MM-dd`, the user's own day. */
    date: string;
    /** `HH:mm`, or null for a task with no time. */
    time: string | null;
    /** Minutes before the date and time to remind. 0 means at the time itself. */
    advanceMinutes: number;
    completed: boolean;
    completedAt: string | null;
    xpAwarded: number;
    /**
     * When the reminder fires, as an ISO instant. Computed by the server from the date, the time
     * (or the user's default reminder time), the advance and the user's timezone, so no client
     * repeats that arithmetic.
     */
    notifyAt: string;
};

/** What the create and edit forms send. */
export type CalendarTaskInput = {
    title: string;
    note?: string | null;
    date: string;
    time?: string | null;
    advanceMinutes?: number;
};

/**
 * Where a day's routine line comes from. `SNAPSHOT` is the day's record, with real counts; past
 * days and today once recorded. `SCHEDULE` is the weekday plan for a day not lived yet; no counts.
 */
export type CalendarRoutineSource = "SNAPSHOT" | "SCHEDULE";

export type CalendarRoutineDay = {
    routineId: string;
    name: string;
    iconId: string | null;
    source: CalendarRoutineSource;
    totalItems: number | null;
    checkedItems: number | null;
    completed: boolean;
};

export type CalendarGoalDue = {
    goalId: string;
    name: string;
    iconId: string | null;
    complete: boolean;
};

export type CalendarMood = {
    level: number;
    /** True when the day has a diary note. */
    hasNote: boolean;
};

export type CalendarDay = {
    date: string;
    /** Timed tasks first, by time, then untimed ones. */
    tasks: CalendarTask[];
    routines: CalendarRoutineDay[];
    goals: CalendarGoalDue[];
    mood: CalendarMood | null;
};

export type CalendarOverview = {
    from: string;
    to: string;
    /** The user's today, resolved on the server in their own timezone. */
    today: string;
    days: CalendarDay[];
};

/** The longest range one overview request may ask for, mirroring the server's limit. */
export const CALENDAR_MAX_RANGE_DAYS = 62;

/** Longest title and note the API accepts. */
export const CALENDAR_TASK_TITLE_MAX = 255;
export const CALENDAR_TASK_NOTE_MAX = 1000;

/** The advance options the forms offer, in minutes. The API accepts any value from 0 to 10080. */
export const CALENDAR_ADVANCE_PRESETS = [0, 15, 30, 60, 120, 1440] as const;
