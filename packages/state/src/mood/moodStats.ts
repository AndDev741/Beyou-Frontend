import type { MoodEntry, MoodLevel } from '@beyou/types/mood/mood';

/** The five points of the scale, worst to best. */
export const MOOD_LEVELS: readonly MoodLevel[] = [1, 2, 3, 4, 5];

/**
 * The i18n key for a level's label.
 *
 * Keys rather than words so the scale reads in both languages, and one function rather than a
 * lookup at each call site so web and mobile can never label the same face differently.
 */
export function moodLabelKey(mood: MoodLevel): string {
    return `MoodLevel${mood}`;
}

/**
 * A day's entries indexed by date, for the O(1) lookups the week strip and the month calendar
 * both do while rendering.
 */
export function indexByDate(entries: MoodEntry[]): Record<string, MoodEntry> {
    const index: Record<string, MoodEntry> = {};
    for (const entry of entries) index[entry.date] = entry;
    return index;
}

/**
 * Adds days to a `yyyy-MM-dd` string and returns the same shape.
 *
 * Built on UTC on purpose. These strings are already the user's local day as the server resolved
 * it, so re-interpreting them in the browser's zone is what produces the classic off-by-one:
 * `new Date('2026-09-06')` is midnight UTC, which is the 5th for anyone west of Greenwich.
 */
export function addDays(date: string, days: number): string {
    const parsed = new Date(`${date}T00:00:00Z`);
    parsed.setUTCDate(parsed.getUTCDate() + days);
    return parsed.toISOString().slice(0, 10);
}

/** The seven day-strings ending on `today`, oldest first — the week the widget draws. */
export function weekEnding(today: string): string[] {
    return Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
}

/**
 * How many days in a row, counting back from today, have an entry.
 *
 * Today not being recorded yet does not break the run: someone who journalled for thirty days
 * and has not opened the app before lunch still has thirty days, and telling them otherwise at
 * 09:00 would be both wrong and unkind. So the count starts at yesterday when today is empty.
 */
export function journalStreak(entries: MoodEntry[], today: string): number {
    const index = indexByDate(entries);
    let cursor = index[today] ? today : addDays(today, -1);
    let streak = 0;
    while (index[cursor]) {
        streak += 1;
        cursor = addDays(cursor, -1);
    }
    return streak;
}

/**
 * The mean level over the entries given, or null when there are none.
 *
 * Rounded to one decimal, because two would imply a precision that five discrete faces do not
 * have.
 */
export function averageMood(entries: MoodEntry[]): number | null {
    if (entries.length === 0) return null;
    const total = entries.reduce((sum, entry) => sum + entry.mood, 0);
    return Math.round((total / entries.length) * 10) / 10;
}

/** The nearest face to an average, for showing a week as one icon. */
export function nearestLevel(average: number): MoodLevel {
    const rounded = Math.min(5, Math.max(1, Math.round(average)));
    return rounded as MoodLevel;
}

/** Every day of a calendar month as `yyyy-MM-dd`, for the month view's range request. */
export function monthRange(year: number, monthIndex: number): { from: string; to: string } {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

/**
 * The month's grid, padded to whole weeks starting on Sunday, matching the weekday pills used
 * everywhere else in the app. Padding slots are null.
 */
export function monthGrid(year: number, monthIndex: number): (string | null)[] {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const leading = first.getUTCDay();
    const cells: (string | null)[] = Array.from({ length: leading }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
        cells.push(new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}
