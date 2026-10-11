import type { CalendarDay, CalendarOverview, CalendarTask } from '@beyou/types/calendar/calendar';
import { addDaysIso, weekdayIndexIso } from '../date/isoDay';

/**
 * Date arithmetic and list bookkeeping for the Calendar page, shared so web and mobile lay out
 * the same days and keep a fetched overview in step with their own writes the same way.
 *
 * Everything works on `yyyy-MM-dd` strings anchored at UTC noon (see `isoDay`), so the device's
 * timezone never shifts a cell. Weeks start on Sunday, like the app's weekday pills.
 */

export type CalendarView = 'month' | 'week';

export type MonthCursor = { year: number; monthIndex: number };

/** The month containing `iso`. */
export function monthOfIso(iso: string): MonthCursor {
    const [year, month] = iso.split('-').map(Number);
    return { year, monthIndex: month - 1 };
}

/** The month `delta` months away from `cursor`. */
export function shiftMonth(cursor: MonthCursor, delta: number): MonthCursor {
    const total = cursor.year * 12 + cursor.monthIndex + delta;
    return { year: Math.floor(total / 12), monthIndex: ((total % 12) + 12) % 12 };
}

/** `yyyy-MM-dd` of the first day of a month. */
export function firstOfMonth(cursor: MonthCursor): string {
    const month = String(cursor.monthIndex + 1).padStart(2, '0');
    return `${cursor.year}-${month}-01`;
}

/** The Sunday that starts the week containing `iso`. */
export function weekStartOf(iso: string): string {
    return addDaysIso(iso, -weekdayIndexIso(iso));
}

/** The seven days, Sunday to Saturday, of the week containing `iso`. */
export function weekDaysOf(iso: string): string[] {
    const start = weekStartOf(iso);
    return Array.from({ length: 7 }, (_, i) => addDaysIso(start, i));
}

/**
 * The month's grid padded to whole weeks with the neighbouring months' days, so every cell is a
 * real day the overview can fill. Between 28 and 42 days, well under the API's range limit.
 */
export function monthGridDays(cursor: MonthCursor): string[] {
    const first = firstOfMonth(cursor);
    const last = addDaysIso(firstOfMonth(shiftMonth(cursor, 1)), -1);
    const start = weekStartOf(first);
    const end = addDaysIso(weekStartOf(last), 6);
    const days: string[] = [];
    for (let day = start; day <= end; day = addDaysIso(day, 1)) days.push(day);
    return days;
}

/** The overview range a view needs: the padded month grid, or one week. */
export function rangeForView(view: CalendarView, anchor: string): { from: string; to: string } {
    if (view === 'week') {
        const days = weekDaysOf(anchor);
        return { from: days[0], to: days[6] };
    }
    const days = monthGridDays(monthOfIso(anchor));
    return { from: days[0], to: days[days.length - 1] };
}

/** True when `iso` falls in the month `cursor` points at (false for padding days). */
export function isInMonth(iso: string, cursor: MonthCursor): boolean {
    const { year, monthIndex } = monthOfIso(iso);
    return year === cursor.year && monthIndex === cursor.monthIndex;
}

/** Whole hour of an `HH:mm` time, for placing a task in the week's hour grid. */
export function hourOf(time: string): number {
    const hour = Number(time.slice(0, 2));
    return Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 0;
}

/** Timed tasks first, by time, then untimed ones in the order they came. Matches the server. */
export function sortCalendarTasks(tasks: CalendarTask[]): CalendarTask[] {
    const timed = tasks.filter((task) => task.time).sort((a, b) => a.time!.localeCompare(b.time!));
    const untimed = tasks.filter((task) => !task.time);
    return [...timed, ...untimed];
}

/** Splits a day's tasks for the week view: untimed ones go to the all-day strip. */
export function splitTasksByTime(tasks: CalendarTask[]): {
    timed: CalendarTask[];
    untimed: CalendarTask[];
} {
    return {
        timed: sortCalendarTasks(tasks.filter((task) => task.time)),
        untimed: tasks.filter((task) => !task.time),
    };
}

/** i18n key for an advance-notice value. A key exists for every value in `CALENDAR_ADVANCE_PRESETS`. */
export function advanceLabelKey(minutes: number): string {
    return `CalendarAdvance${minutes}`;
}

/** An empty day, for a date the overview does not cover yet. */
export function emptyCalendarDay(date: string): CalendarDay {
    return { date, tasks: [], routines: [], goals: [], mood: null };
}

/** The day `date` from an overview, or an empty one. */
export function dayFromOverview(overview: CalendarOverview | null, date: string): CalendarDay {
    return overview?.days.find((day) => day.date === date) ?? emptyCalendarDay(date);
}

/**
 * The overview with `task` in place: removed from wherever it was (an edit may move it to another
 * day) and added to its own day, if that day is in range. Lets a screen apply its own write
 * without refetching the whole range.
 */
export function upsertTaskInOverview(
    overview: CalendarOverview,
    task: CalendarTask,
): CalendarOverview {
    return {
        ...overview,
        days: overview.days.map((day) => {
            const others = day.tasks.filter((existing) => existing.id !== task.id);
            if (day.date !== task.date) {
                return others.length === day.tasks.length ? day : { ...day, tasks: others };
            }
            return { ...day, tasks: sortCalendarTasks([...others, task]) };
        }),
    };
}

/** The overview without the task `id`. */
export function removeTaskFromOverview(overview: CalendarOverview, id: string): CalendarOverview {
    return {
        ...overview,
        days: overview.days.map((day) =>
            day.tasks.some((task) => task.id === id)
                ? { ...day, tasks: day.tasks.filter((task) => task.id !== id) }
                : day,
        ),
    };
}
